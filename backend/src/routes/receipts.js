// backend/src/routes/receipts.js
import express from "express";
import { ReceiptController } from "../controllers/receiptController.js";
import { uploadSingle, uploadMultiple } from "../middleware/multer.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// All receipt routes require authentication
router.use(authenticateToken);

// Upload single receipt
router.post("/upload", ...uploadSingle("receipt"), ReceiptController.upload);

// Upload multiple receipts
router.post(
  "/upload-multiple",
  ...uploadMultiple("receipts", 5),
  ReceiptController.uploadMultiple
);

// Get all receipts for user
router.get("/", ReceiptController.getAll);

// Get receipt by ID
router.get("/:id", ReceiptController.getById);

// Serve receipt file
router.get("/:id/file", ReceiptController.serveFile);

// Delete receipt
router.delete("/:id", ReceiptController.delete);

export default router;
