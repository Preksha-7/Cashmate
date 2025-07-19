import { apiService } from "./api";

export const transactionService = {
  // Get transactions with filters and pagination
  getTransactions: async (params = {}) => {
    try {
      const response = await apiService.get("/transactions", params);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get single transaction by ID
  getTransaction: async (id) => {
    try {
      const response = await apiService.get(`/transactions/${id}`);
      return response.transaction;
    } catch (error) {
      throw error;
    }
  },

  // Create new transaction
  createTransaction: async (transactionData) => {
    try {
      const response = await apiService.post("/transactions", transactionData);
      return response.transaction;
    } catch (error) {
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
      return response.transaction;
    } catch (error) {
      throw error;
    }
  },

  // Delete transaction
  deleteTransaction: async (id) => {
    try {
      const response = await apiService.delete(`/transactions/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get financial summary
  getSummary: async (params = {}) => {
    try {
      const response = await apiService.get("/transactions/summary", params);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get transactions by category
  getByCategory: async (params = {}) => {
    try {
      const response = await apiService.get(
        "/transactions/by-category",
        params
      );
      return response;
    } catch (error) {
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
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get categories
  getCategories: async () => {
    try {
      const response = await apiService.get("/categories");
      return response.categories;
    } catch (error) {
      throw error;
    }
  },

  // Bulk import transactions
  bulkImport: async (transactions) => {
    try {
      const response = await apiService.post("/transactions/bulk-import", {
        transactions,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Export transactions
  exportTransactions: async (params = {}) => {
    try {
      const response = await apiService.download(
        "/transactions/export",
        "transactions.csv"
      );
      return response;
    } catch (error) {
      throw error;
    }
  },
};
