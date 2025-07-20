// frontend/src/services/transactions.js
import { apiService } from "./api";

export const transactionService = {
  // Get transactions with filters and pagination
  getTransactions: async (params = {}) => {
    try {
      const response = await apiService.get("/transactions", params);
      return response;
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw error;
    }
  },

  // Get single transaction by ID
  getTransaction: async (id) => {
    try {
      const response = await apiService.get(`/transactions/${id}`);
      return response.data.transaction;
    } catch (error) {
      console.error("Error fetching transaction:", error);
      throw error;
    }
  },

  // Create new transaction
  createTransaction: async (transactionData) => {
    try {
      const response = await apiService.post("/transactions", transactionData);
      return response.transaction; // Corrected line: access transaction directly from response
    } catch (error) {
      console.error("Error creating transaction:", error);
      throw error;
    }
  },

  // Update transaction
  updateTransaction: async (id, transactionData) => {
    try {
      const response = await apiService.put(
        `/transactions/${id}`,
        transactionData
      );
      return response.data.transaction;
    } catch (error) {
      console.error("Error updating transaction:", error);
      throw error;
    }
  },

  // Delete transaction
  deleteTransaction: async (id) => {
    try {
      const response = await apiService.delete(`/transactions/${id}`);
      return response;
    } catch (error) {
      console.error("Error deleting transaction:", error);
      throw error;
    }
  },

  // Get financial summary
  getSummary: async (params = {}) => {
    try {
      const response = await apiService.get("/transactions/summary", params);
      return response; // Response contains { success, message, summary }
    } catch (error) {
      console.error("Error fetching summary:", error);
      throw error;
    }
  },

  // Get transactions by category
  getByCategory: async (params = {}) => {
    try {
      const response = await apiService.get("/transactions/categories", params);
      return response; // Response contains { success, message, categories }
    } catch (error) {
      console.error("Error fetching by category:", error);
      throw error;
    }
  },

  // Get monthly summary
  getMonthlySummary: async (params = {}) => {
    try {
      const response = await apiService.get(
        "/transactions/monthly-summary",
        params
      );
      return response; // Response contains { success, message, monthlyData }
    } catch (error) {
      console.error("Error fetching monthly summary:", error);
      throw error;
    }
  },

  // Get categories (unique categories from user's transactions)
  getCategories: async () => {
    try {
      const response = await apiService.get("/transactions/meta/categories");
      return response.data.categories; // Accesses response.data.categories
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  },

  // Get recent transactions
  getRecentTransactions: async (limit = 5) => {
    try {
      const response = await apiService.get(`/transactions/recent/${limit}`);
      return response.data.transactions;
    } catch (error) {
      console.error("Error fetching recent transactions:", error);
      throw error;
    }
  },

  // Get transaction statistics
  getStats: async (params = {}) => {
    try {
      const response = await apiService.get(
        "/transactions/stats/overview",
        params
      );
      return response.data.stats;
    } catch (error) {
      console.error("Error fetching stats:", error);
      throw error;
    }
  },

  // Bulk import transactions (for bank statements)
  bulkImport: async (transactions) => {
    try {
      const response = await apiService.post("/transactions/bulk", {
        transactions,
      });
      return response; // Response should contain results, errors, etc.
    } catch (error) {
      console.error("Error bulk importing transactions:", error);
      throw error;
    }
  },

  // Export transactions (if implemented)
  exportTransactions: async (params = {}) => {
    try {
      const response = await apiService.download(
        "/transactions/export",
        params
      ); // Assuming a download method in apiService
      return response;
    } catch (error) {
      console.error("Error exporting transactions:", error);
      throw error;
    }
  },
};
