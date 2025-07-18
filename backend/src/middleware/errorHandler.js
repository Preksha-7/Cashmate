// backend/src/middleware/errorHandler.js
import { logger } from "../utils/logger.js";

export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error({
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // MySQL duplicate entry error
  if (error.code === "ER_DUP_ENTRY") {
    const message = "Duplicate entry found";
    error = new AppError(message, 409);
  }

  // MySQL foreign key constraint error
  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    const message = "Referenced record not found";
    error = new AppError(message, 400);
  }

  // MySQL connection error
  if (
    error.code === "ECONNREFUSED" ||
    error.code === "PROTOCOL_CONNECTION_LOST"
  ) {
    const message = "Database connection failed";
    error = new AppError(message, 503);
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = new AppError(message, 401);
  }

  if (error.name === "TokenExpiredError") {
    const message = "Token expired";
    error = new AppError(message, 401);
  }

  // Validation errors
  if (error.name === "ValidationError") {
    const message = Object.values(error.errors)
      .map((val) => val.message)
      .join(", ");
    error = new AppError(message, 400);
  }

  // Cast errors (invalid ObjectId, etc.)
  if (error.name === "CastError") {
    const message = `Invalid ${error.path}: ${error.value}`;
    error = new AppError(message, 400);
  }

  // File upload errors
  if (error.code === "LIMIT_FILE_SIZE") {
    const message = "File too large";
    error = new AppError(message, 413);
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    const message = "Too many files";
    error = new AppError(message, 413);
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    const message = "Unexpected file field";
    error = new AppError(message, 400);
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: getErrorName(statusCode),
    message: message,
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      timestamp: error.timestamp,
    }),
  });
};

// Get error name based on status code
const getErrorName = (statusCode) => {
  switch (statusCode) {
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 409:
      return "Conflict";
    case 413:
      return "Payload Too Large";
    case 422:
      return "Unprocessable Entity";
    case 429:
      return "Too Many Requests";
    case 500:
      return "Internal Server Error";
    case 503:
      return "Service Unavailable";
    default:
      return "Error";
  }
};

// Async error handler wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  logger.error("Unhandled Promise Rejection:", err);
  // Close server & exit process
  process.exit(1);
});
