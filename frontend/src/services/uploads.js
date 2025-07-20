import { apiService } from "./api";

export const uploadService = {
  // Upload receipt image for OCR processing
  uploadReceipt: async (file, onUploadProgress = null) => {
    try {
      const formData = new FormData();
      formData.append("receipt", file);

      // Uses backend route /api/receipts/upload
      const response = await apiService.upload(
        "/receipts/upload",
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

      // Uses backend route /api/uploads/bank-statement (from pdfController)
      const response = await apiService.upload(
        "/uploads/bank-statement", // This route is handled by pdfController
        formData,
        onUploadProgress
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get upload status/details for a specific receipt (used for polling)
  // This now calls /api/receipts/:id
  getUploadStatus: async (receiptId) => {
    try {
      const response = await apiService.get(`/receipts/${receiptId}`);
      return response; // Response contains { success, message, data: { receipt } }
    } catch (error) {
      throw error;
    }
  },

  // Update processed data (e.g., after user edits the preview) and/or status
  // This now calls PUT /api/receipts/:id
  updateProcessedData: async (receiptId, updateData) => {
    try {
      const response = await apiService.put(
        `/receipts/${receiptId}`,
        updateData
      );
      return response; // Response contains { success, message, data: { receipt } }
    } catch (error) {
      throw error;
    }
  },

  // Get all uploads for user (if you implement a list of all uploads)
  getUserUploads: async (params = {}) => {
    try {
      // This route would be /api/receipts
      const response = await apiService.get("/receipts", params);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete upload
  deleteUpload: async (uploadId) => {
    try {
      // This route would be DELETE /api/receipts/:id
      const response = await apiService.delete(`/receipts/${uploadId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
};
