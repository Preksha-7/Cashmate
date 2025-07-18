// backend/src/routes/transactions.js
import express from "express";
import { TransactionController } from "../controllers/transactionController.js";
import {
  validateRequest,
  transactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
} from "../middleware/validation.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// All transaction routes require authentication
router.use(authenticateToken);

// Create new transaction
router.post(
  "/",
  validateRequest(transactionSchema),
  TransactionController.create
);

// Get all transactions with filtering and pagination
router.get(
  "/",
  validateRequest(transactionQuerySchema, "query"),
  TransactionController.getAll
);

// Get financial summary
router.get(
  "/summary",
  validateRequest(transactionQuerySchema, "query"),
  TransactionController.getSummary
);

// Get transactions by category
router.get(
  "/categories",
  validateRequest(transactionQuerySchema, "query"),
  TransactionController.getByCategory
);

// Get monthly summary
router.get(
  "/monthly-summary",
  validateRequest(transactionQuerySchema, "query"),
  TransactionController.getMonthlySummary
);

// Get single transaction by ID
router.get("/:id", TransactionController.getById);

// Update transaction
router.put(
  "/:id",
  validateRequest(updateTransactionSchema),
  TransactionController.update
);

// Delete transaction
router.delete("/:id", TransactionController.delete);

export default router;
