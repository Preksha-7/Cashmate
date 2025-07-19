// src/controllers/pdfController.js
const PDFParserService = require("../services/pdfParserService");
const Transaction = require("../models/Transaction");
const logger = require("../utils/logger");

class PDFController {
  constructor() {
    this.pdfParserService = new PDFParserService();
  }

  /**
   * Upload and parse PDF bank statement
   */
  uploadBankStatement = async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No PDF file uploaded",
        });
      }

      // Validate file type
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({
          success: false,
          message: "Only PDF files are allowed",
        });
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: "File size too large. Maximum size is 10MB",
        });
      }

      const userId = req.user.id;
      const filename = req.file.originalname;
      const pdfBuffer = req.file.buffer;

      logger.info(`Processing PDF upload for user ${userId}`, { filename });

      // Parse PDF using Python microservice
      const parsedData = await this.pdfParserService.parsePDF(
        pdfBuffer,
        filename
      );

      // Transform and validate data
      const { transactions, summary } =
        this.pdfParserService.transformToTransactions(parsedData, userId);

      // Save transactions to database
      const savedTransactions = [];
      let successCount = 0;
      let errorCount = 0;

      for (const transactionData of transactions) {
        try {
          // Check if transaction already exists (prevent duplicates)
          const existingTransaction = await Transaction.findOne({
            userId: transactionData.userId,
            date: transactionData.date,
            amount: transactionData.amount,
            description: transactionData.description,
          });

          if (existingTransaction) {
            logger.warn("Duplicate transaction detected, skipping", {
              transactionId: existingTransaction._id,
            });
            continue;
          }

          const transaction = new Transaction(transactionData);
          const saved = await transaction.save();
          savedTransactions.push(saved);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error("Failed to save transaction:", {
            error: error.message,
            transaction: transactionData,
          });
        }
      }

      // Prepare response
      const response = {
        success: true,
        message: "PDF processed successfully",
        data: {
          filename,
          accountInfo: {
            accountNumber: summary.accountNumber,
            accountHolder: summary.accountHolder,
            statementPeriod: summary.statementPeriod,
          },
          summary: {
            totalTransactions: parsedData.transaction_count,
            savedTransactions: successCount,
            duplicates: transactions.length - successCount - errorCount,
            errors: errorCount,
            totalCredits: summary.totalCredits,
            totalDebits: summary.totalDebits,
          },
          transactions: savedTransactions.map((t) => ({
            id: t._id,
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type,
            category: t.category,
          })),
        },
      };

      logger.info("PDF processing completed", {
        userId,
        filename,
        successCount,
        errorCount,
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error("PDF upload processing failed:", {
        error: error.message,
        userId: req.user?.id,
        filename: req.file?.originalname,
      });

      // Handle specific error types
      if (error.message.includes("Invalid PDF format")) {
        return res.status(400).json({
          success: false,
          message: "Invalid PDF format or corrupted file",
        });
      }

      if (error.message.includes("PDF parser service is unavailable")) {
        return res.status(503).json({
          success: false,
          message: "PDF processing service is temporarily unavailable",
        });
      }

      next(error);
    }
  };

  /**
   * Get PDF processing service health status
   */
  getServiceHealth = async (req, res, next) => {
    try {
      const isHealthy = await this.pdfParserService.healthCheck();

      res.status(200).json({
        success: true,
        data: {
          pdfParserService: isHealthy ? "healthy" : "unhealthy",
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get transaction statistics from bank statements
   */
  getBankStatementStats = async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Get transactions from bank statements
      const stats = await Transaction.aggregate([
        { $match: { userId: userId, source: "bank_statement" } },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalCredits: {
              $sum: {
                $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0],
              },
            },
            totalDebits: {
              $sum: {
                $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0],
              },
            },
            avgTransactionAmount: { $avg: "$amount" },
            maxTransactionAmount: { $max: "$amount" },
            minTransactionAmount: { $min: "$amount" },
          },
        },
      ]);

      // Get category breakdown
      const categoryStats = await Transaction.aggregate([
        { $match: { userId: userId, source: "bank_statement" } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            avgAmount: { $avg: "$amount" },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]);

      const response = {
        success: true,
        data: {
          overview: stats[0] || {
            totalTransactions: 0,
            totalCredits: 0,
            totalDebits: 0,
            avgTransactionAmount: 0,
            maxTransactionAmount: 0,
            minTransactionAmount: 0,
          },
          categoryBreakdown: categoryStats,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new PDFController();
