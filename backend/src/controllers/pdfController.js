// File: backend/src/controllers/pdfController.js

import PDFParserService from "../services/pdfParserService.js";
import { Transaction } from "../models/Transaction.js"; // Correct import for Transaction model
import { logger } from "../utils/logger.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";

class PDFController {
  constructor() {
    this.pdfParserService = new PDFParserService();
  }

  uploadBankStatement = asyncHandler(async (req, res, next) => {
    if (!req.file) {
      throw new AppError("No file uploaded or file is not a PDF.", 400);
    }

    const userId = req.user.id;
    const filename = req.file.originalname;
    const pdfBuffer = req.file.buffer;

    logger.info(`Processing PDF upload for user ${userId}`, { filename });

    let parsedData;
    try {
      parsedData = await this.pdfParserService.parsePDF(
        pdfBuffer,
        filename // Pass filename to PDFParserService
      );
    } catch (error) {
      logger.error("Error parsing PDF:", {
        error: error.message,
        filename,
        userId,
      });
      // Handle specific errors from PDF parsing microservice if needed
      if (error.response && error.response.status === 400) {
        throw new AppError(
          `PDF parsing failed: ${error.response.data.detail || error.message}`,
          400
        );
      }
      throw new AppError("Failed to parse PDF content.", 500);
    }

    // Pass parsedData.transactions directly as the service returns transformed transactions within it
    const { transactions: parsedTransactions, summary } =
      this.pdfParserService.transformToTransactions(parsedData, userId);

    const savedTransactions = [];
    let successCount = 0;
    let errorCount = 0;

    for (const transactionData of parsedTransactions) {
      try {
        // IMPORTANT: You need to implement a findDuplicate method in your Transaction model
        // that queries your MySQL database to check for existing transactions based on
        // relevant fields like date, amount, description, and userId.
        const existingTransaction = await Transaction.findDuplicate(
          transactionData.user_id, // Use user_id as per schema
          transactionData.date,
          transactionData.amount,
          transactionData.description
        );

        if (existingTransaction) {
          logger.warn("Duplicate transaction detected, skipping", {
            transaction: transactionData,
          });
          continue;
        }

        // Use the existing create method from your MySQL Transaction model
        const newTransactionId = await Transaction.create(transactionData);
        if (newTransactionId) {
          // Fetch the full transaction record if needed, or just push the data
          const saved = await Transaction.findById(newTransactionId);
          savedTransactions.push(saved);
          successCount++;
        }
      } catch (error) {
        errorCount++;
        logger.error("Failed to save transaction during PDF upload:", {
          error: error.message,
          transaction: transactionData,
          userId,
        });
        // Optionally, rethrow if a single failure should halt the process
      }
    }

    logger.info(
      `PDF processing complete for user ${userId}: ${successCount} transactions saved, ${errorCount} errors.`,
      { filename }
    );

    res.status(200).json({
      message: "Bank statement processed successfully.",
      summary: summary,
      savedTransactions: savedTransactions,
      counts: {
        total: parsedTransactions.length,
        saved: successCount,
        skipped: parsedTransactions.length - successCount,
        errors: errorCount,
      },
    });
  });

  getBankStatementStats = asyncHandler(async (req, res, next) => {
    const { userId } = req.user;
    // This part of the controller would also need refactoring if it used MongoDB aggregation.
    // You would query your MySQL database using Transaction model methods or direct SQL queries
    // to get statistics like total uploaded, processed, pending, errors, etc.
    // Example:
    // const stats = await Transaction.getStatsForBankStatements(userId); // You'd need to implement this
    // res.status(200).json(stats);
    res
      .status(501)
      .json({ message: "Bank statement stats not yet implemented for MySQL." });
  });
}

export default new PDFController(); // Correct way to export for ES Modules
