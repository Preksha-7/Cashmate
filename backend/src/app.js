// backend/src/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import authRoutes from "./routes/auth.js";
import transactionRoutes from "./routes/transactions.js";
import receiptRoutes from "./routes/receipts.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";

// Import services
import { fileCleanupService } from "./services/fileCleanupService.js";

// Import database
import { testConnection } from "./config/database.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests",
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: "Too many authentication attempts",
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiting - more restrictive for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 upload requests per windowMs
  message: {
    error: "Too many upload attempts",
    message: "Too many file upload attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Serve static files from uploads directory (with authentication in routes)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const dbConnected = await testConnection();
    const cleanupStats = await fileCleanupService.getStats();

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: dbConnected ? "connected" : "disconnected",
      fileCleanup: {
        isRunning: cleanupStats?.isRunning || false,
        uploadedFiles: cleanupStats?.uploadDirectory?.fileCount || 0,
        totalStorageUsed: cleanupStats?.uploadDirectory?.totalSizeMB || "0.00",
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// API routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/receipts", uploadLimiter, receiptRoutes);

// Admin endpoint for manual file cleanup (you might want to add auth for this)
app.post("/api/admin/cleanup", async (req, res) => {
  try {
    await fileCleanupService.manualCleanup();
    const stats = await fileCleanupService.getStats();

    res.json({
      success: true,
      message: "Manual cleanup completed",
      stats: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to run manual cleanup",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not found",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Initialize database connection and start cleanup service
const initializeApp = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error("Failed to connect to database");
      process.exit(1);
    }

    // Start file cleanup service
    fileCleanupService.start();

    console.log("🚀 CashMate API initialized successfully");
    console.log("📁 File upload system ready");
    console.log("🧹 File cleanup service started");
  } catch (error) {
    console.error("Failed to initialize app:", error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const handleShutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  // Stop file cleanup service
  fileCleanupService.stop();

  console.log("✅ Cleanup service stopped");
  process.exit(0);
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

// Initialize app on startup
initializeApp();

export default app;
