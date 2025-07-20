// backend/src/routes/transactions.js
import express from "express";
import Joi from "joi"; // Ensure Joi is imported if not already
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
import { asyncHandler } from "../middleware/errorHandler.js"; // Ensure asyncHandler is imported

const router = express.Router();

// All transaction routes require authentication
router.use(authenticateToken);

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Get financial summary
router.get(
  "/summary",
  validateRequest(transactionQuerySchema, "query"),
  asyncHandler(async (req, res, next) => {
    try {
      const { Transaction } = await import("../models/Transaction.js");
      const { startDate, endDate } = req.query;

      const start =
        startDate ||
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0];
      const end = endDate || new Date().toISOString().split("T")[0];

      const summary = await Transaction.getFinancialSummary(
        req.user.id,
        start,
        end
      );
      res.json({
        success: true,
        message: "Financial summary retrieved successfully",
        summary,
      });
    } catch (error) {
      next(error); // Pass to global error handler
    }
  })
);

// Get transactions by category
router.get(
  "/categories",
  validateRequest(transactionQuerySchema, "query"),
  asyncHandler(async (req, res, next) => {
    try {
      const { Transaction } = await import("../models/Transaction.js");
      const { startDate, endDate } = req.query;
      const start =
        startDate ||
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0];
      const end = endDate || new Date().toISOString().split("T")[0];
      const categories = await Transaction.getByCategory(
        req.user.id,
        start,
        end
      );
      res.json({
        success: true,
        message: "Category data retrieved successfully",
        categories,
      });
    } catch (error) {
      next(error); // Pass to global error handler
    }
  })
);

// Get monthly summary
router.get(
  "/monthly-summary",
  validateRequest(transactionQuerySchema, "query"),
  asyncHandler(async (req, res, next) => {
    try {
      const { Transaction } = await import("../models/Transaction.js");
      const { year } = req.query;
      const monthlyData = await Transaction.getMonthlySummary(
        req.user.id,
        year ? parseInt(year) : new Date().getFullYear()
      );
      res.json({
        success: true,
        message: "Monthly summary retrieved successfully",
        monthlyData,
      });
    } catch (error) {
      next(error); // Pass to global error handler
    }
  })
);

// Get user's unique categories (for categorization features)
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

// Get transaction statistics (overview)
router.get(
  "/stats/overview",
  validateRequest(transactionQuerySchema, "query"),
  asyncHandler(async (req, res, next) => {
    try {
      const { Transaction } = await import("../models/Transaction.js");
      const { startDate, endDate } = req.query;

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
      next(error); // Pass to global error handler
    }
  })
);

// Create new transaction
router.post(
  "/",
  validateRequest(transactionSchema),
  asyncHandler(TransactionController.create)
);

// Bulk import transactions
router.post(
  "/bulk",
  validateRequest(
    Joi.object({
      transactions: Joi.array()
        .items(transactionSchema)
        .min(1)
        .max(100)
        .messages({
          "array.min": "At least one transaction is required",
          "array.max": "Cannot process more than 100 transactions at once",
        }),
    })
  ),
  asyncHandler(async (req, res, next) => {
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
      next(error); // Pass to global error handler
    }
  })
);

// Get all transactions with filtering and pagination
router.get("/", asyncHandler(TransactionController.getAll));

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

// Delete transaction
router.delete(
  "/:id",
  validateParams(idParamSchema),
  asyncHandler(TransactionController.delete)
);

export default router;
