// backend/src/routes/transactions.js
import express from "express";
import Joi from "joi";
import { TransactionController } from "../controllers/transactionController.js";
import {
  validateRequest,
  validateParams,
  transactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
  idParamSchema,
  sanitizeInput,
} from "../middleware/validation.js";
import { authenticateToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { getTransactions } from "../controllers/transactionController.js";
import { addTransaction } from "../controllers/transactionController.js";
import { protect } from "../middleware/auth.js";
import { validateTransaction } from "../middleware/validators.js";

const router = express.Router();

// All transaction routes require authentication
router.use(authenticateToken);

// Apply input sanitization to all routes
router.use(sanitizeInput);

router.get("/", protect, getTransactions);
router.post("/", protect, validateTransaction, addTransaction);

// Create new transaction
router.post(
  "/",
  validateRequest(transactionSchema),
  asyncHandler(TransactionController.create)
);

// Get all transactions with filtering and pagination
router.get(
  "/",
  validateRequest(transactionQuerySchema, "query"),
  asyncHandler(TransactionController.getAll)
);

// Get financial summary
router.get(
  "/summary",
  validateRequest(transactionQuerySchema, "query"),
  asyncHandler(TransactionController.getSummary)
);

// Get transactions by category
router.get(
  "/categories",
  validateRequest(transactionQuerySchema, "query"),
  asyncHandler(TransactionController.getByCategory)
);

// Get monthly summary
router.get(
  "/monthly-summary",
  validateRequest(transactionQuerySchema, "query"),
  asyncHandler(TransactionController.getMonthlySummary)
);

// Get single transaction by ID
router.get(
  "/:id",
  validateParams(idParamSchema),
  asyncHandler(TransactionController.getById)
);

// Update transaction
router.put(
  "/:id",
  validateParams(idParamSchema),
  validateRequest(updateTransactionSchema),
  asyncHandler(TransactionController.update)
);

// Partial update transaction (PATCH)
router.patch(
  "/:id",
  validateParams(idParamSchema),
  validateRequest(updateTransactionSchema),
  asyncHandler(TransactionController.update)
);

// Delete transaction
router.delete(
  "/:id",
  validateParams(idParamSchema),
  asyncHandler(TransactionController.delete)
);

// Additional utility routes

// Get user's unique categories
router.get(
  "/meta/categories",
  asyncHandler(async (req, res) => {
    try {
      const { Transaction } = await import("../models/Transaction.js");
      const categories = await Transaction.getCategories(req.user.id);

      res.json({
        success: true,
        message: "Categories retrieved successfully",
        data: { categories },
      });
    } catch (error) {
      throw error;
    }
  })
);

// Get recent transactions
router.get(
  "/recent/:limit?",
  validateParams(
    Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(5).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    try {
      const { Transaction } = await import("../models/Transaction.js");
      const limit = req.params.limit || 5;
      const transactions = await Transaction.getRecent(
        req.user.id,
        parseInt(limit)
      );

      res.json({
        success: true,
        message: "Recent transactions retrieved successfully",
        data: { transactions },
      });
    } catch (error) {
      throw error;
    }
  })
);

// Get transaction statistics
router.get(
  "/stats/overview",
  validateRequest(transactionQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    try {
      const { Transaction } = await import("../models/Transaction.js");
      const { startDate, endDate } = req.query;

      // Default to current month if no dates provided
      const start =
        startDate ||
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0];
      const end = endDate || new Date().toISOString().split("T")[0];

      const stats = await Transaction.getStats(req.user.id, start, end);

      res.json({
        success: true,
        message: "Transaction statistics retrieved successfully",
        data: { stats },
      });
    } catch (error) {
      throw error;
    }
  })
);

// Bulk operations route
router.post(
  "/bulk",
  validateRequest(
    Joi.object({
      transactions: Joi.array()
        .items(transactionSchema)
        .min(1)
        .max(100)
        .required()
        .messages({
          "array.min": "At least one transaction is required",
          "array.max": "Cannot process more than 100 transactions at once",
        }),
    })
  ),
  asyncHandler(async (req, res) => {
    try {
      const { Transaction } = await import("../models/Transaction.js");
      const { transactions } = req.body;

      const results = [];
      const errors = [];

      for (let i = 0; i < transactions.length; i++) {
        try {
          const transactionData = {
            ...transactions[i],
            user_id: req.user.id,
          };

          const transactionId = await Transaction.create(transactionData);
          const transaction = await Transaction.findById(transactionId);
          results.push({ index: i, transaction });
        } catch (error) {
          errors.push({ index: i, error: error.message });
        }
      }

      res.status(errors.length > 0 ? 207 : 201).json({
        success: errors.length === 0,
        message: `Processed ${transactions.length} transactions`,
        data: {
          successful: results.length,
          failed: errors.length,
          results,
          errors,
        },
      });
    } catch (error) {
      throw error;
    }
  })
);

export default router;
