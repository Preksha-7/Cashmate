import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Receipt } from "../models/Receipt.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileCleanupService {
  constructor() {
    this.uploadDir = path.join(__dirname, "../../uploads");
    this.maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour in milliseconds
    this.isRunning = false;
  }

  // Start the cleanup service
  start() {
    if (this.isRunning) {
      console.log("File cleanup service is already running");
      return;
    }

    this.isRunning = true;
    console.log("🧹 File cleanup service started");

    // Run cleanup immediately
    this.runCleanup();

    // Set up periodic cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, this.cleanupInterval);
  }

  // Stop the cleanup service
  stop() {
    if (!this.isRunning) {
      console.log("File cleanup service is not running");
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log("🛑 File cleanup service stopped");
  }

  // Run cleanup process
  async runCleanup() {
    try {
      console.log("🔍 Running file cleanup...");

      const stats = await this.cleanupOrphanedFiles();
      const tempStats = await this.cleanupTempFiles();

      const totalCleaned = stats.cleaned + tempStats.cleaned;
      const totalErrors = stats.errors + tempStats.errors;

      if (totalCleaned > 0 || totalErrors > 0) {
        console.log(
          `✅ Cleanup completed: ${totalCleaned} files cleaned, ${totalErrors} errors`
        );
      }
    } catch (error) {
      console.error("❌ File cleanup error:", error);
    }
  }

  // Clean up orphaned files (files not referenced in database)
  async cleanupOrphanedFiles() {
    let cleaned = 0;
    let errors = 0;

    try {
      // Check if uploads directory exists
      try {
        await fs.access(this.uploadDir);
      } catch {
        return { cleaned, errors };
      }

      // Get all files in uploads directory
      const files = await fs.readdir(this.uploadDir);

      for (const filename of files) {
        try {
          const filePath = path.join(this.uploadDir, filename);
          const stats = await fs.stat(filePath);

          // Skip directories
          if (stats.isDirectory()) continue;

          // Check if file exists in database
          const receipt = await this.findReceiptByFilename(filename);

          if (!receipt) {
            // File is orphaned, delete it
            await fs.unlink(filePath);
            cleaned++;
            console.log(`🗑️ Deleted orphaned file: ${filename}`);
          }
        } catch (error) {
          console.error(`Error processing file ${filename}:`, error.message);
          errors++;
        }
      }
    } catch (error) {
      console.error("Error during orphaned files cleanup:", error);
      errors++;
    }

    return { cleaned, errors };
  }

  // Clean up temporary files (old files based on timestamp)
  async cleanupTempFiles() {
    let cleaned = 0;
    let errors = 0;

    try {
      // Check if uploads directory exists
      try {
        await fs.access(this.uploadDir);
      } catch {
        return { cleaned, errors };
      }

      const files = await fs.readdir(this.uploadDir);
      const now = Date.now();

      for (const filename of files) {
        try {
          const filePath = path.join(this.uploadDir, filename);
          const stats = await fs.stat(filePath);

          // Skip directories
          if (stats.isDirectory()) continue;

          // Check if file is older than maxAge
          const fileAge = now - stats.mtime.getTime();

          if (fileAge > this.maxAge) {
            // Check if file is still referenced in database
            const receipt = await this.findReceiptByFilename(filename);

            if (!receipt) {
              await fs.unlink(filePath);
              cleaned++;
              console.log(`🗑️ Deleted old temp file: ${filename}`);
            }
          }
        } catch (error) {
          console.error(
            `Error processing temp file ${filename}:`,
            error.message
          );
          errors++;
        }
      }
    } catch (error) {
      console.error("Error during temp files cleanup:", error);
      errors++;
    }

    return { cleaned, errors };
  }

  // Find receipt by filename in database
  async findReceiptByFilename(filename) {
    try {
      // This is a simplified search - you might want to add this method to Receipt model
      const query = "SELECT id FROM receipts WHERE filename = ? LIMIT 1";
      const { executeQuery } = await import("../config/database.js");
      const rows = await executeQuery(query, [filename]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Error finding receipt by filename:", error);
      return null;
    }
  }

  // Manual cleanup method
  async manualCleanup() {
    console.log("🧹 Running manual file cleanup...");
    await this.runCleanup();
  }

  // Get cleanup statistics
  async getStats() {
    try {
      const uploadStats = await this.getUploadDirStats();
      const dbStats = await this.getDatabaseStats();

      return {
        uploadDirectory: uploadStats,
        database: dbStats,
        isRunning: this.isRunning,
        maxAge: this.maxAge,
        cleanupInterval: this.cleanupInterval,
      };
    } catch (error) {
      console.error("Error getting cleanup stats:", error);
      return null;
    }
  }

  // Get upload directory statistics
  async getUploadDirStats() {
    try {
      await fs.access(this.uploadDir);
      const files = await fs.readdir(this.uploadDir);

      let totalSize = 0;
      let fileCount = 0;

      for (const filename of files) {
        try {
          const filePath = path.join(this.uploadDir, filename);
          const stats = await fs.stat(filePath);

          if (stats.isFile()) {
            totalSize += stats.size;
            fileCount++;
          }
        } catch (error) {
          // Skip files that can't be accessed
        }
      }

      return {
        fileCount,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      };
    } catch (error) {
      return {
        fileCount: 0,
        totalSize: 0,
        totalSizeMB: "0.00",
      };
    }
  }

  // Get database statistics
  async getDatabaseStats() {
    try {
      const { executeQuery } = await import("../config/database.js");

      const countQuery = "SELECT COUNT(*) as count FROM receipts";
      const sizeQuery = "SELECT SUM(file_size) as totalSize FROM receipts";

      const [countResult] = await executeQuery(countQuery);
      const [sizeResult] = await executeQuery(sizeQuery);

      return {
        receiptCount: countResult.count,
        totalSize: sizeResult.totalSize || 0,
        totalSizeMB: ((sizeResult.totalSize || 0) / (1024 * 1024)).toFixed(2),
      };
    } catch (error) {
      return {
        receiptCount: 0,
        totalSize: 0,
        totalSizeMB: "0.00",
      };
    }
  }
}

// Export singleton instance
export const fileCleanupService = new FileCleanupService();
