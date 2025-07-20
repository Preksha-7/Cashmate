// File: backend/src/controllers/pdfController.js

import PDFParserService from "../services/pdfParserService.js";
import { Transaction } from "../models/Transaction.js";
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
      parsedData = await this.pdfParserService.parsePDF(pdfBuffer, filename);
    } catch (error) {
      logger.error("Error parsing PDF:", {
        error: error.message,
        filename,
        userId,
      });
      if (error.response && error.response.status === 400) {
        throw new AppError(
          `PDF parsing failed: ${error.response.data.detail || error.message}`,
          400
        );
      }
      throw new AppError(
        `Failed to parse PDF content: ${error.message}`,
        500,
        false,
        error
      ); // Use AppError consistently
    }

    const { transactions: parsedTransactions, summary } =
      this.pdfParserService.transformToTransactions(parsedData, userId);

    const savedTransactions = [];
    let successCount = 0;
    let errorCount = 0;

    for (const transactionData of parsedTransactions) {
      try {
        const existingTransaction = await Transaction.findDuplicate(
          transactionData.user_id,
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

        const newTransactionId = await Transaction.create(transactionData);
        if (newTransactionId) {
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
      }
    }

    res.status(errorCount > 0 ? 207 : 201).json({
      success: errorCount === 0,
      message: `Bank statement processed. ${successCount} transactions saved, ${errorCount} failed or skipped.`,
      data: {
        summary: { ...summary, filename: filename }, // Include filename in summary
        transactions: savedTransactions,
        successful: successCount,
        failedOrSkipped: errorCount,
      },
    });
  });

  getBankStatementStats = asyncHandler(async (req, res, next) => {
    // This method is not fully implemented in the original codebase for MySQL context.
    // It would involve querying the receipts table for processing statuses of bank statements
    // and potentially a separate table if detailed bank statement parsing results are stored.
    // For now, it will return a placeholder.
    // To implement fully: Query receipts table for entries with mime_type = 'application/pdf'
    // and aggregate by processing_status.
    res.status(200).json({
      success: true,
      message: "Bank statement statistics (placeholder)",
      data: {
        totalBankStatements: 0,
        processed: 0,
        pending: 0,
        failed: 0,
      },
    });
  });
}

export const uploadBankStatement = PDFController.prototype.uploadBankStatement;
export const getBankStatementStats =
  PDFController.prototype.getBankStatementStats;
