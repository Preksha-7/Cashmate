// backend/server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { testConnection } from "./src/config/database.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Test database connection on startup
const initializeDatabase = async () => {
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error("Failed to connect to database. Exiting...");
    process.exit(1);
  }
};

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});
app.use("/api/", limiter);

// Health check with database status
app.get("/health", async (req, res) => {
  try {
    const dbStatus = await testConnection();
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: dbStatus ? "connected" : "disconnected",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      database: "error",
      error: error.message,
    });
  }
});

// API Routes (placeholder - will be replaced with actual routes)
app.use("/api/auth", (req, res) => {
  res.json({
    message: "Auth routes ready",
    endpoints: [
      "POST /api/auth/register",
      "POST /api/auth/login",
      "POST /api/auth/refresh",
      "POST /api/auth/logout",
    ],
  });
});

app.use("/api/transactions", (req, res) => {
  res.json({
    message: "Transaction routes ready",
    endpoints: [
      "GET /api/transactions",
      "POST /api/transactions",
      "GET /api/transactions/:id",
      "PUT /api/transactions/:id",
      "DELETE /api/transactions/:id",
      "GET /api/transactions/summary",
      "GET /api/transactions/categories",
    ],
  });
});

app.use("/api/receipts", (req, res) => {
  res.json({
    message: "Receipt routes ready",
    endpoints: [
      "POST /api/receipts/upload",
      "GET /api/receipts",
      "GET /api/receipts/:id",
      "DELETE /api/receipts/:id",
    ],
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Start server
const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

startServer();
