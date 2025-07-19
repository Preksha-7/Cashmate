// backend/src/controllers/receiptController.js
import { Receipt } from "../models/Receipt.js";
import {
  cleanupTempFiles,
  validateUploadedFile,
} from "../middleware/multer.js";
import path from "path";
import fs from "fs/promises";

export class ReceiptController {
  // Upload single receipt
  static async upload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
          message: "Please select a receipt file to upload",
        });
      }

      // Validate uploaded file
      validateUploadedFile(req.file);

      // Create receipt record in database
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

      const receiptId = await Receipt.create(receiptData);
      const receipt = await Receipt.findById(receiptId);

      res.status(201).json({
        success: true,
        message: "Receipt uploaded successfully",
        data: { receipt },
      });

      // TODO: Add background job to process receipt (OCR, data extraction)
    } catch (error) {
      // Cleanup uploaded file on error
      if (req.file) {
        await cleanupTempFiles([req.file]);
      }

      console.error("Upload receipt error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload receipt",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Upload multiple receipts
  static async uploadMultiple(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files uploaded",
          message: "Please select receipt files to upload",
        });
      }

      const receipts = [];
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
          receipts.push(receipt);
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error.message,
          });
          // Cleanup failed file
          await cleanupTempFiles([file]);
        }
      }

      const response = {
        success: true,
        message: `${receipts.length} receipts uploaded successfully`,
        data: {
          receipts,
          totalUploaded: receipts.length,
          totalFiles: req.files.length,
        },
      };

      if (errors.length > 0) {
        response.errors = errors;
        response.message += `, ${errors.length} failed`;
      }

      res.status(201).json(response);
    } catch (error) {
      // Cleanup all uploaded files on error
      if (req.files) {
        await cleanupTempFiles(req.files);
      }

      console.error("Upload multiple receipts error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload receipts",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Get user receipts
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const receipts = await Receipt.getByUserId(
        req.user.id,
        parseInt(limit),
        parseInt(offset)
      );

      res.json({
        success: true,
        message: "Receipts retrieved successfully",
        data: { receipts },
      });
    } catch (error) {
      console.error("Get receipts error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve receipts",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Get receipt by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const receipt = await Receipt.findById(id);

      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: "Receipt not found",
          message: "Receipt with the specified ID does not exist",
        });
      }

      // Check if receipt belongs to the authenticated user
      if (receipt.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "You can only access your own receipts",
        });
      }

      res.json({
        success: true,
        message: "Receipt retrieved successfully",
        data: { receipt },
      });
    } catch (error) {
      console.error("Get receipt by ID error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve receipt",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Delete receipt
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const receipt = await Receipt.findById(id);

      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: "Receipt not found",
          message: "Receipt with the specified ID does not exist",
        });
      }

      // Check if receipt belongs to the authenticated user
      if (receipt.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "You can only delete your own receipts",
        });
      }

      // Delete physical file
      try {
        await fs.unlink(receipt.file_path);
      } catch (fileError) {
        console.warn(
          `Failed to delete physical file: ${receipt.file_path}`,
          fileError.message
        );
      }

      // Delete database record
      await Receipt.delete(id);

      res.json({
        success: true,
        message: "Receipt deleted successfully",
        data: null,
      });
    } catch (error) {
      console.error("Delete receipt error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete receipt",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Serve receipt file
  static async serveFile(req, res) {
    try {
      const { id } = req.params;
      const receipt = await Receipt.findById(id);

      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: "Receipt not found",
        });
      }

      // Check if receipt belongs to the authenticated user
      if (receipt.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      // Check if file exists
      try {
        await fs.access(receipt.file_path);
      } catch {
        return res.status(404).json({
          success: false,
          error: "File not found",
        });
      }

      // Set appropriate headers
      res.setHeader("Content-Type", receipt.mime_type);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${receipt.original_filename}"`
      );

      // Send file
      res.sendFile(path.resolve(receipt.file_path));
    } catch (error) {
      console.error("Serve receipt file error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to serve file",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }
}
