// src/services/pdfParserService.js
import axios from "axios"; // Use import instead of require
import FormData from "form-data"; // Use import instead of require
import { logger } from "../utils/logger.js"; // Use import instead of require

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
        filename: filename, // Correctly pass filename here
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

      if (error.response?.status === 400) {
        throw new Error(`Invalid PDF format: ${error.response.data.detail}`);
      } else if (error.response?.status === 500) {
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
      user_id: userId, // Changed to user_id to match MySQL schema
      date: transaction.date, // Date should already be 'YYYY-MM-DD' from Python service
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      type: transaction.transaction_type === "debit" ? "expense" : "income", // Map 'debit'/'credit' to 'expense'/'income'
      category:
        transaction.category ||
        this.categorizeTransaction(transaction.description), // Use category from parser if available, else categorize
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
        transactionCount: parsedData.transaction_count,
        openingBalance: parsedData.opening_balance,
        closingBalance: parsedData.closing_balance,
      },
    };
  }

  /**
   * Simple transaction categorization
   * @param {string} description - Transaction description
   * @returns {string} Category
   */
  categorizeTransaction(description) {
    const desc = description.toLowerCase();

    // Define category keywords
    const categories = {
      food: ["restaurant", "food", "cafe", "pizza", "burger", "meal"],
      transport: ["uber", "taxi", "bus", "train", "petrol", "gas", "parking"],
      shopping: ["amazon", "flipkart", "mall", "store", "shop", "purchase"],
      bills: ["electricity", "water", "gas", "phone", "internet", "utility"],
      entertainment: ["movie", "cinema", "netflix", "spotify", "game"],
      healthcare: ["hospital", "doctor", "pharmacy", "medical", "health"],
      salary: ["salary", "wage", "payroll", "income"],
      transfer: ["transfer", "sent", "received", "deposit", "upi"],
      withdrawal: ["atm", "cash", "withdrawal"],
      fees: ["fee", "charge", "penalty", "interest"],
      groceries: [
        "supermarket",
        "kirana",
        "grocery",
        "d-mart",
        "reliance fresh",
      ],
      housing: ["rent", "mortgage", "housing", "maintenance"],
      education: ["school", "college", "fees", "books", "tuition"],
      investments: ["investment", "stocks", "mutual fund"],
      personal: ["salon", "spa", "gym"],
      travel: ["flight", "hotel", "travel"],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => desc.includes(keyword))) {
        return category;
      }
    }

    return "miscellaneous"; // Default category if none match
  }
}

export default new PDFParserService();
