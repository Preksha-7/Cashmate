import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";

// Import routes
import authRoutes from "./routes/auth.js";
import transactionRoutes from "./routes/transactions.js";
import receiptRoutes from "./routes/receipts.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Rate limiting - more lenient in development
const isDevelopment = process.env.NODE_ENV === "development";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Much higher limit in development
  message: {
    error: "Too many requests",
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development for localhost
  skip: (req) => {
    return (
      isDevelopment &&
      (req.ip === "127.0.0.1" ||
        req.ip === "::1" ||
        req.ip?.includes("localhost"))
    );
  },
});

app.use("/api/", limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 10, // More lenient in development
  message: {
    error: "Too many authentication attempts",
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return (
      isDevelopment &&
      (req.ip === "127.0.0.1" ||
        req.ip === "::1" ||
        req.ip?.includes("localhost"))
    );
  },
});

// Upload rate limiting for receipt endpoints
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 200 : 20, // More lenient in development
  message: {
    error: "Too many upload attempts",
    message: "Too many upload attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return (
      isDevelopment &&
      (req.ip === "127.0.0.1" ||
        req.ip === "::1" ||
        req.ip?.includes("localhost"))
    );
  },
});

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware with more details in development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));

  // Additional logging for debugging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get("User-Agent")?.substring(0, 50),
      headers: {
        authorization: req.headers.authorization ? "Bearer [token]" : "None",
        "content-type": req.headers["content-type"],
      },
    });
    next();
  });
} else {
  app.use(morgan("combined"));
}

// Serve static files (uploaded receipts)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    service: "Cashmate API",
    version: "1.0.0",
  });
});

// API routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/receipts", uploadLimiter, receiptRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

export default app;
