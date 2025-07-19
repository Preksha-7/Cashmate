// backend/src/controllers/transactionController.js
import { Transaction } from "../models/Transaction.js";

export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, start, end } = req.query;

    const query = { user_id: userId };
    if (start && end) {
      query.date = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: transactions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export class TransactionController {
  // Create new transaction
  static async create(req, res) {
    try {
      const transactionData = {
        ...req.body,
        user_id: req.user.id,
      };

      const transactionId = await Transaction.create(transactionData);
      const transaction = await Transaction.findById(transactionId);

      res.status(201).json({
        success: true,
        message: "Transaction created successfully",
        data: { transaction },
      });
    } catch (error) {
      console.error("Create transaction error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create transaction",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Get all transactions for user with filtering and pagination
  static async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        startDate,
        endDate,
        type,
        category,
        sort = "date",
        order = "desc",
      } = req.query;

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build filters
      const filters = {
        limit: parseInt(limit),
        offset: parseInt(offset),
      };

      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }

      if (type && ["income", "expense"].includes(type)) {
        filters.type = type;
      }

      if (category) {
        filters.category = category;
      }

      // Add sorting
      filters.sort = sort;
      filters.order = order;

      const transactions = await Transaction.getByUserId(req.user.id, filters);

      // Get total count for pagination
      const totalCount = await Transaction.getCountByUserId(req.user.id, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        type: filters.type,
        category: filters.category,
      });

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        message: "Transactions retrieved successfully",
        data: {
          transactions,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve transactions",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Get single transaction by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const transaction = await Transaction.findById(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: "Transaction not found",
          message: "Transaction with the specified ID does not exist",
        });
      }

      // Check if transaction belongs to the authenticated user
      if (transaction.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "You can only access your own transactions",
        });
      }

      res.json({
        success: true,
        message: "Transaction retrieved successfully",
        data: { transaction },
      });
    } catch (error) {
      console.error("Get transaction by ID error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve transaction",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Update transaction
  static async update(req, res) {
    try {
      const { id } = req.params;
      const transaction = await Transaction.findById(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: "Transaction not found",
          message: "Transaction with the specified ID does not exist",
        });
      }

      // Check if transaction belongs to the authenticated user
      if (transaction.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "You can only update your own transactions",
        });
      }

      const updatedTransaction = await Transaction.update(id, req.body);

      res.json({
        success: true,
        message: "Transaction updated successfully",
        data: { transaction: updatedTransaction },
      });
    } catch (error) {
      console.error("Update transaction error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update transaction",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Delete transaction
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const transaction = await Transaction.findById(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: "Transaction not found",
          message: "Transaction with the specified ID does not exist",
        });
      }

      // Check if transaction belongs to the authenticated user
      if (transaction.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "You can only delete your own transactions",
        });
      }

      await Transaction.delete(id);

      res.json({
        success: true,
        message: "Transaction deleted successfully",
        data: null,
      });
    } catch (error) {
      console.error("Delete transaction error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete transaction",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Get financial summary
  static async getSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Default to current month if no dates provided
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
        data: { summary },
      });
    } catch (error) {
      console.error("Get financial summary error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve financial summary",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Get transactions by category
  static async getByCategory(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Default to current month if no dates provided
      const start =
        startDate ||
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0];
      const end = endDate || new Date().toISOString().split("T")[0];

      const categoryData = await Transaction.getByCategory(
        req.user.id,
        start,
        end
      );

      res.json({
        success: true,
        message: "Category data retrieved successfully",
        data: { categories: categoryData },
      });
    } catch (error) {
      console.error("Get category data error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve category data",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Get monthly summary
  static async getMonthlySummary(req, res) {
    try {
      const { year = new Date().getFullYear() } = req.query;

      const monthlyData = await Transaction.getMonthlySummary(
        req.user.id,
        parseInt(year)
      );

      res.json({
        success: true,
        message: "Monthly summary retrieved successfully",
        data: { monthlyData },
      });
    } catch (error) {
      console.error("Get monthly summary error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve monthly summary",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }
}
