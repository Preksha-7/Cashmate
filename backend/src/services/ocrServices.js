// backend/src/services/ocrService.js
import FormData from "form-data";
import fs from "fs";
import fetch from "node-fetch";

class OCRService {
  constructor() {
    this.ocrServiceUrl = process.env.OCR_SERVICE_URL || "http://localhost:8000";
  }

  /**
   * Process a single receipt using OCR service
   * @param {string} filePath - Path to the receipt file
   * @returns {Promise<Object>} OCR processing result
   */
  async processReceipt(filePath) {
    try {
      const formData = new FormData();
      const fileStream = fs.createReadStream(filePath);
      formData.append("file", fileStream);

      const response = await fetch(`${this.ocrServiceUrl}/ocr/receipt`, {
        method: "POST",
        body: formData,
        headers: formData.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OCR service error: ${errorData.detail || "Unknown error"}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("OCR processing error:", error);
      throw new Error(`Failed to process receipt: ${error.message}`);
    }
  }

  /**
   * Process multiple receipts in batch
   * @param {Array<string>} filePaths - Array of file paths
   * @returns {Promise<Object>} Batch processing result
   */
  async processBatchReceipts(filePaths) {
    try {
      const formData = new FormData();

      filePaths.forEach((filePath) => {
        const fileStream = fs.createReadStream(filePath);
        formData.append("files", fileStream);
      });

      const response = await fetch(`${this.ocrServiceUrl}/ocr/batch`, {
        method: "POST",
        body: formData,
        headers: formData.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OCR batch service error: ${errorData.detail || "Unknown error"}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("OCR batch processing error:", error);
      throw new Error(`Failed to process batch receipts: ${error.message}`);
    }
  }

  /**
   * Check if OCR service is healthy
   * @returns {Promise<boolean>} Service health status
   */
  async isServiceHealthy() {
    try {
      const response = await fetch(`${this.ocrServiceUrl}/health`, {
        method: "GET",
        timeout: 5000,
      });

      return response.ok;
    } catch (error) {
      console.error("OCR service health check failed:", error);
      return false;
    }
  }

  /**
   * Extract and validate receipt data
   * @param {Object} ocrResult - Result from OCR service
   * @returns {Object} Validated and formatted receipt data
   */
  extractReceiptData(ocrResult) {
    if (!ocrResult.success || !ocrResult.data) {
      return null;
    }

    const { extracted_data, confidence_score, processing_status } =
      ocrResult.data;

    return {
      amount: extracted_data.amount,
      date: extracted_data.date,
      vendor: extracted_data.vendor,
      currency: extracted_data.currency || "INR",
      confidence_score: confidence_score,
      processing_status: processing_status,
      raw_text: ocrResult.data.raw_text?.substring(0, 1000), // Limit raw text size
    };
  }
}

export default new OCRService();
