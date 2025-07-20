// backend/src/controllers/receiptController.js
import { Receipt } from "../models/Receipt.js";
import {
  cleanupTempFiles,
  validateUploadedFile,
} from "../middleware/multer.js";
import path from "path";
import fs from "fs/promises";
import ocrService from "../services/ocrServices.js"; // Import ocrService
import { AppError } from "../middleware/errorHandler.js"; // Ensure AppError is imported

export class ReceiptController {
  // Upload single receipt
  static async upload(req, res, next) {
    // Added 'next' for error handling
    let receiptId; // Declare receiptId here to be accessible in catch block
    try {
      if (!req.file) {
        throw new AppError(
          "No file uploaded. Please select a receipt file.",
          400
        ); // Use AppError
      }

      // Validate uploaded file
      validateUploadedFile(req.file);

      // Create receipt record in database (initially pending)
      const receiptData = {
        user_id: req.user.id,
        filename: req.file.filename,
        original_filename: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        parsed_data: null, // Will be updated after OCR
        processing_status: "pending",
      };

      receiptId = await Receipt.create(receiptData); //
      let receipt = await Receipt.findById(receiptId); //

      // Send initial response quickly, as processing happens in background
      res.status(201).json({
        success: true,
        message: "Receipt uploaded successfully. Processing in background...",
        data: { receipt },
      });

      // --- Asynchronous OCR Processing ---
      // Mark as processing immediately in DB
      await Receipt.update(receipt.id, { processing_status: "processing" });

      const ocrResult = await ocrService.processReceipt(req.file.path);
      const extractedData = ocrService.extractReceiptData(ocrResult);

      if (extractedData) {
        await Receipt.update(receipt.id, {
          parsed_data: extractedData,
          processing_status: "completed",
        });
        console.log(`OCR processing completed for receipt ID: ${receipt.id}`);
      } else {
        await Receipt.update(receipt.id, {
          processing_status: "failed",
          parsed_data: { error: "OCR extraction failed or returned no data" },
        });
        console.warn(`OCR extraction failed for receipt ID: ${receipt.id}`);
      }

      // Cleanup the temporary uploaded file after processing
      await cleanupTempFiles([req.file]);
    } catch (error) {
      // Cleanup uploaded file on error, if it exists
      if (req.file) {
        await cleanupTempFiles([req.file]);
      }
      // If a receipt record was created, mark it as failed
      if (receiptId) {
        try {
          await Receipt.update(receiptId, {
            processing_status: "failed",
            parsed_data: { error: error.message || "Unknown processing error" },
          });
          console.error(
            `Receipt ID ${receiptId} marked as failed due to: ${error.message}`
          );
        } catch (dbError) {
          console.error(
            `Failed to update receipt status to 'failed' for ID ${receiptId}:`,
            dbError
          );
        }
      }

      console.error("Upload receipt error:", error);
      // Pass the error to the global error handler
      next(
        new AppError("Failed to upload or process receipt", 500, false, {
          error: error.message,
        })
      );
    }
  }

  // Upload multiple receipts - Similar asynchronous processing
  static async uploadMultiple(req, res, next) {
    // Added 'next'
    if (!req.files || req.files.length === 0) {
      throw new AppError(
        "No files uploaded. Please select receipt files.",
        400
      ); // Use AppError
    }

    const initialReceipts = [];
    const processingPromises = [];
    const errors = [];

    // Process each file
    for (const file of req.files) {
      try {
        validateUploadedFile(file);

        const receiptData = {
          user_id: req.user.id,
          filename: file.filename,
          original_filename: file.originalname,
          file_path: file.path,
          file_size: file.size,
          mime_type: file.mimetype,
          parsed_data: null,
          processing_status: "pending",
        };

        const receiptId = await Receipt.create(receiptData);
        const receipt = await Receipt.findById(receiptId);
        initialReceipts.push(receipt);

        // Add OCR processing to promises array for asynchronous execution
        processingPromises.push(
          (async () => {
            try {
              await Receipt.update(receipt.id, {
                processing_status: "processing",
              });
              const ocrResult = await ocrService.processReceipt(file.path);
              const extractedData = ocrService.extractReceiptData(ocrResult);

              if (extractedData) {
                await Receipt.update(receipt.id, {
                  parsed_data: extractedData,
                  processing_status: "completed",
                });
              } else {
                await Receipt.update(receipt.id, {
                  processing_status: "failed",
                  parsed_data: {
                    error: "OCR extraction failed or returned no data",
                  },
                });
              }
            } catch (ocrError) {
              console.error(
                `Error processing OCR for ${file.originalname}:`,
                ocrError
              );
              await Receipt.update(receipt.id, {
                processing_status: "failed",
                parsed_data: {
                  error: ocrError.message || "OCR processing failed",
                },
              });
            } finally {
              // Always clean up the temporary file after processing, regardless of success or failure
              await cleanupTempFiles([file]);
            }
          })()
        );
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message,
        });
        // Cleanup failed file immediately
        await cleanupTempFiles([file]);
      }
    }

    // Send initial response before all OCR processing is complete
    res.status(201).json({
      success: true,
      message: `${initialReceipts.length} receipts uploaded. Processing in background...`,
      data: {
        receipts: initialReceipts,
        totalUploaded: initialReceipts.length,
        totalFiles: req.files.length,
        uploadErrors: errors, // Report immediate upload errors
      },
    });

    // Wait for all OCR processing to finish (optional, as response is already sent)
    // await Promise.allSettled(processingPromises);
  }

  // Get user receipts
  static async getAll(req, res, next) {
    try {
      const { page = 1, limit = 10, status } = req.query; // Added status filter
      const offset = (page - 1) * limit;

      const receipts = await Receipt.getByUserId(req.user.id, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status: status, // Pass status to model method
      });

      const totalCount = await Receipt.getCountByUserId(req.user.id, status); // Pass status to count method

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        message: "Receipts retrieved successfully",
        data: { receipts },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error("Get receipts error:", error);
      next(
        new AppError("Failed to retrieve receipts", 500, false, {
          error: error.message,
        })
      ); // Use AppError
    }
  }

  // Get receipt by ID
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const receipt = await Receipt.findById(id);

      if (!receipt) {
        return next(new AppError("Receipt not found", 404)); // Use AppError
      }

      // Check if receipt belongs to the authenticated user
      if (receipt.user_id !== req.user.id) {
        return next(
          new AppError(
            "Access denied. You can only access your own receipts.",
            403
          )
        ); // Use AppError
      }

      res.json({
        success: true,
        message: "Receipt retrieved successfully",
        data: { receipt },
      });
    } catch (error) {
      console.error("Get receipt by ID error:", error);
      next(
        new AppError("Failed to retrieve receipt", 500, false, {
          error: error.message,
        })
      ); // Use AppError
    }
  }

  // Delete receipt
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const receipt = await Receipt.findById(id);

      if (!receipt) {
        return next(new AppError("Receipt not found", 404)); // Use AppError
      }

      if (receipt.user_id !== req.user.id) {
        return next(
          new AppError(
            "Access denied. You can only delete your own receipts.",
            403
          )
        ); // Use AppError
      }

      try {
        await fs.unlink(receipt.file_path);
      } catch (fileError) {
        console.warn(
          `Failed to delete physical file: ${receipt.file_path}`,
          fileError.message
        );
      }

      await Receipt.delete(id);

      res.json({
        success: true,
        message: "Receipt deleted successfully",
        data: null,
      });
    } catch (error) {
      console.error("Delete receipt error:", error);
      next(
        new AppError("Failed to delete receipt", 500, false, {
          error: error.message,
        })
      ); // Use AppError
    }
  }

  // Serve receipt file
  static async serveFile(req, res, next) {
    try {
      const { id } = req.params;
      const receipt = await Receipt.findById(id);

      if (!receipt) {
        return next(new AppError("Receipt not found", 404)); // Use AppError
      }

      if (receipt.user_id !== req.user.id) {
        return next(new AppError("Access denied", 403)); // Use AppError
      }

      try {
        await fs.access(receipt.file_path);
      } catch {
        return next(new AppError("File not found", 404)); // Use AppError
      }

      res.setHeader("Content-Type", receipt.mime_type);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${receipt.original_filename}"`
      );

      res.sendFile(path.resolve(receipt.file_path));
    } catch (error) {
      console.error("Serve receipt file error:", error);
      next(
        new AppError("Failed to serve file", 500, false, {
          error: error.message,
        })
      ); // Use AppError
    }
  }
}
