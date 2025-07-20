// backend/src/routes/receipts.js
import express from "express";
import { ReceiptController } from "../controllers/receiptController.js";
import { uploadSingle, uploadMultiple } from "../middleware/multer.js";
import { authenticateToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js"; // Import asyncHandler

const router = express.Router();

// All receipt routes require authentication
router.use(authenticateToken);

// Upload single receipt
router.post(
  "/upload",
  uploadSingle("receipt"),
  asyncHandler(ReceiptController.upload)
);

// Upload multiple receipts
router.post(
  "/upload-multiple",
  uploadMultiple("receipts", 5),
  asyncHandler(ReceiptController.uploadMultiple)
);

// Get all receipts for user (can filter by status e.g., /api/receipts?status=completed)
router.get("/", asyncHandler(ReceiptController.getAll));

// Get a specific receipt by ID (used for polling processing status and fetching parsed data)
router.get("/:id", asyncHandler(ReceiptController.getById));

// Update a specific receipt's parsed data (after user edits preview)
router.put("/:id", asyncHandler(ReceiptController.updateReceiptData));

// Delete receipt
router.delete("/:id", asyncHandler(ReceiptController.delete));

// Serve receipt file (e.g., to display image preview directly)
router.get("/file/:id", asyncHandler(ReceiptController.serveFile));

export default router;
