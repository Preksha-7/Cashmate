// src/services/pdfParserService.js
import axios from "axios";
import FormData from "form-data";
import { logger } from "../utils/logger.js";
import { categorizeTransaction } from "../utils/categorization.js"; // Import categorization utility

class PDFParserService {
  constructor() {
    this.baseURL =
      process.env.PDF_PARSER_SERVICE_URL || "http://localhost:8000";
    this.timeout = 30000; // 30 seconds timeout
  }

  /**
   * Parse PDF bank statement
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} Parsed transaction data
   */
  async parsePDF(pdfBuffer, filename) {
    try {
      const formData = new FormData();
      formData.append("file", pdfBuffer, {
        filename: filename,
        contentType: "application/pdf",
      });

      const response = await axios.post(`${this.baseURL}/parse-pdf`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: this.timeout,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      logger.info(`PDF parsed successfully: ${filename}`, {
        transactionCount: response.data.transaction_count,
        accountNumber: response.data.account_number,
      });

      return response.data;
    } catch (error) {
      logger.error("PDF parsing failed:", {
        filename,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response && error.response.status === 400) {
        throw new Error(`Invalid PDF format: ${error.response.data.detail}`);
      } else if (error.response && error.response.status === 500) {
        throw new Error(`PDF processing failed: ${error.response.data.detail}`);
      } else if (error.code === "ECONNREFUSED") {
        throw new Error("PDF parser service is unavailable");
      } else {
        throw new Error(`PDF parsing service error: ${error.message}`);
      }
    }
  }

  /**
   * Check if PDF parser service is healthy
   * @returns {Promise<boolean>} Service health status
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000,
      });
      return response.data.status === "healthy";
    } catch (error) {
      logger.error("PDF parser service health check failed:", error.message);
      return false;
    }
  }

  /**
   * Transform parsed data to match database schema
   * @param {Object} parsedData - Data from PDF parser
   * @param {string} userId - User ID
   * @returns {Object} Transformed data with transactions and summary
   */
  transformToTransactions(parsedData, userId) {
    const transactions = parsedData.transactions.map((transaction) => ({
      user_id: userId,
      date: transaction.date,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      type: transaction.transaction_type === "debit" ? "expense" : "income",
      category: categorizeTransaction(transaction.description), // Use categorization utility
      // balance: transaction.balance, // Not directly stored in Transaction model
      // source: "bank_statement", // Not directly stored in Transaction model
    }));

    return {
      transactions,
      summary: {
        accountNumber: parsedData.account_number,
        accountHolder: parsedData.account_holder,
        statementPeriod: parsedData.statement_period,
        totalCredits: parsedData.total_credits,
        totalDebits: parsedData.total_debits,
        transaction_count: parsedData.transaction_count,
        openingBalance: parsedData.opening_balance,
        closingBalance: parsedData.closing_balance,
      },
    };
  }
}

export default new PDFParserService();
