// backend/src/controllers/receiptController.js
import { Receipt } from "../models/Receipt.js";
import {
  cleanupTempFiles,
  validateUploadedFile,
} from "../middleware/multer.js";
import path from "path";
import fs from "fs/promises";
import ocrService from "../services/ocrServices.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js"; // Ensure AppError and asyncHandler are imported

export class ReceiptController {
  // Upload single receipt
  static async upload(req, res, next) {
    let receiptId;
    try {
      if (!req.file) {
        throw new AppError(
          "No file uploaded. Please select a receipt file.",
          400
        );
      }

      validateUploadedFile(req.file);

      const receiptData = {
        user_id: req.user.id,
        filename: req.file.filename,
        original_filename: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        parsed_data: null,
        processing_status: "pending",
      };

      receiptId = await Receipt.create(receiptData);
      let receipt = await Receipt.findById(receiptId);

      res.status(201).json({
        success: true,
        message: "Receipt uploaded successfully. Processing in background...",
        data: { receipt },
      });

      // --- Asynchronous OCR Processing ---
      // Use a separate async block to not hold up the response
      (async () => {
        try {
          await Receipt.update(receipt.id, { processing_status: "processing" });
          const ocrResult = await ocrService.processReceipt(req.file.path);
          const extractedData = ocrService.extractReceiptData(ocrResult);

          if (extractedData) {
            await Receipt.update(receipt.id, {
              parsed_data: extractedData,
              processing_status: "completed",
            });
            console.log(
              `OCR processing completed for receipt ID: ${receipt.id}`
            );
          } else {
            await Receipt.update(receipt.id, {
              processing_status: "failed",
              parsed_data: {
                error: "OCR extraction failed or returned no data",
              },
            });
            console.warn(`OCR extraction failed for receipt ID: ${receipt.id}`);
          }
        } catch (ocrError) {
          console.error(
            `Error during OCR processing for receipt ID ${receipt.id}:`,
            ocrError
          );
          await Receipt.update(receipt.id, {
            processing_status: "failed",
            parsed_data: { error: ocrError.message || "OCR processing failed" },
          });
        } finally {
          // Ensure cleanup of the temporary uploaded file
          await cleanupTempFiles([req.file]);
        }
      })();
    } catch (error) {
      if (req.file) {
        await cleanupTempFiles([req.file]);
      }
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
      next(
        new AppError("Failed to upload or process receipt", 500, false, {
          error: error.message,
        })
      );
    }
  }

  // Upload multiple receipts - Similar asynchronous processing
  static async uploadMultiple(req, res, next) {
    if (!req.files || req.files.length === 0) {
      throw new AppError(
        "No files uploaded. Please select receipt files.",
        400
      );
    }

    const initialReceipts = [];
    const processingPromises = [];
    const errors = [];

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
              await cleanupTempFiles([file]);
            }
          })()
        );
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message,
        });
        await cleanupTempFiles([file]);
      }
    }

    res.status(201).json({
      success: true,
      message: `${initialReceipts.length} receipts uploaded. Processing in background...`,
      data: {
        receipts: initialReceipts,
        totalUploaded: initialReceipts.length,
        totalFiles: req.files.length,
        uploadErrors: errors,
      },
    });
    // Don't await Promise.all here, let them run in the background
  }

  // Get all receipts for user
  static async getAll(req, res, next) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;

      const receipts = await Receipt.getByUserId(req.user.id, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status: status,
      });

      const totalCount = await Receipt.getCountByUserId(req.user.id, status);

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
      );
    }
  }

  // Get receipt by ID (Used for polling status and getting parsed data)
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const receipt = await Receipt.findById(id);

      if (!receipt) {
        return next(new AppError("Receipt not found", 404));
      }

      if (receipt.user_id !== req.user.id) {
        return next(
          new AppError(
            "Access denied. You can only access your own receipts.",
            403
          )
        );
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
      );
    }
  }

  // Update a receipt's parsed data and status (e.g., after user edit and submission)
  static async updateReceiptData(req, res, next) {
    try {
      const { id } = req.params;
      const { parsed_data, processing_status } = req.body; // Expect updated parsed_data and/or status

      const receipt = await Receipt.findById(id);

      if (!receipt) {
        return next(new AppError("Receipt not found", 404));
      }

      if (receipt.user_id !== req.user.id) {
        return next(
          new AppError(
            "Access denied. You can only update your own receipts.",
            403
          )
        );
      }

      const updatedReceipt = await Receipt.update(id, {
        parsed_data:
          parsed_data !== undefined ? parsed_data : receipt.parsed_data,
        processing_status: processing_status || receipt.processing_status,
      });

      res.json({
        success: true,
        message: "Receipt data updated successfully",
        data: { receipt: updatedReceipt },
      });
    } catch (error) {
      console.error("Update receipt data error:", error);
      next(
        new AppError("Failed to update receipt data", 500, false, {
          error: error.message,
        })
      );
    }
  }

  // Delete receipt
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const receipt = await Receipt.findById(id);

      if (!receipt) {
        return next(new AppError("Receipt not found", 404));
      }

      if (receipt.user_id !== req.user.id) {
        return next(
          new AppError(
            "Access denied. You can only delete your own receipts.",
            403
          )
        );
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
      );
    }
  }

  // Serve receipt file
  static async serveFile(req, res, next) {
    try {
      const { id } = req.params;
      const receipt = await Receipt.findById(id);

      if (!receipt) {
        return next(new AppError("Receipt not found", 404));
      }

      if (receipt.user_id !== req.user.id) {
        return next(new AppError("Access denied", 403));
      }

      try {
        await fs.access(receipt.file_path);
      } catch {
        return next(new AppError("File not found", 404));
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
      );
    }
  }
}
