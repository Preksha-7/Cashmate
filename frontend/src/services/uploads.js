import { apiService } from "./api";

export const uploadService = {
  // Upload receipt image for OCR processing
  uploadReceipt: async (file, onUploadProgress = null) => {
    try {
      const formData = new FormData();
      formData.append("receipt", file);

      const response = await apiService.upload(
        "/uploads/receipt",
        formData,
        onUploadProgress
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Upload bank statement PDF
  uploadBankStatement: async (file, onUploadProgress = null) => {
    try {
      const formData = new FormData();
      formData.append("statement", file);

      const response = await apiService.upload(
        "/uploads/bank-statement",
        formData,
        onUploadProgress
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get upload status
  getUploadStatus: async (uploadId) => {
    try {
      const response = await apiService.get(`/uploads/status/${uploadId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get all uploads for user
  getUserUploads: async (params = {}) => {
    try {
      const response = await apiService.get("/uploads", params);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete upload
  deleteUpload: async (uploadId) => {
    try {
      const response = await apiService.delete(`/uploads/${uploadId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Process uploaded receipt manually
  processReceipt: async (uploadId) => {
    try {
      const response = await apiService.post(`/uploads/process/${uploadId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get processed data from upload
  getProcessedData: async (uploadId) => {
    try {
      const response = await apiService.get(`/uploads/processed/${uploadId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update processed transaction data
  updateProcessedData: async (uploadId, transactionData) => {
    try {
      const response = await apiService.put(
        `/uploads/processed/${uploadId}`,
        transactionData
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Confirm and save processed transactions
  confirmProcessedTransactions: async (uploadId, transactions) => {
    try {
      const response = await apiService.post(`/uploads/confirm/${uploadId}`, {
        transactions,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export const uploadReceipt = uploadService.uploadReceipt;
