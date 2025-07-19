// backend/src/middleware/errorHandler.js
import { logger } from "../utils/logger.js";

export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
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
    ...(error.details && { details: error.details }),
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

  // MySQL data too long error
  if (error.code === "ER_DATA_TOO_LONG") {
    const message = "Data too long for column";
    error = new AppError(message, 400);
  }

  // MySQL invalid data type error
  if (error.code === "ER_TRUNCATED_WRONG_VALUE") {
    const message = "Invalid data type provided";
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

  // Joi validation errors
  if (error.name === "ValidationError" && error.details) {
    const validationErrors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
      value: detail.context?.value,
    }));

    const message = `Validation failed: ${validationErrors
      .map((e) => e.message)
      .join(", ")}`;
    error = new AppError(message, 400, true, { validationErrors });
  }

  // Mongoose validation errors
  if (error.name === "ValidationError" && error.errors) {
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

  // Rate limiting errors
  if (error.statusCode === 429 || error.code === "RATE_LIMIT_EXCEEDED") {
    const message = "Too many requests, please try again later";
    error = new AppError(message, 429);
  }

  // Timeout errors
  if (error.code === "ETIMEDOUT" || error.code === "ESOCKETTIMEDOUT") {
    const message = "Request timeout";
    error = new AppError(message, 408);
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  // Build error response
  const errorResponse = {
    success: false,
    error: getErrorName(statusCode),
    message: message,
    timestamp: error.timestamp || new Date().toISOString(),
  };

  // Add validation errors if present
  if (error.details?.validationErrors) {
    errorResponse.validationErrors = error.details.validationErrors;
  }

  // Add stack trace and additional details in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = error.stack;
    if (error.details && !error.details.validationErrors) {
      errorResponse.details = error.details;
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
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
    case 405:
      return "Method Not Allowed";
    case 408:
      return "Request Timeout";
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
    case 502:
      return "Bad Gateway";
    case 503:
      return "Service Unavailable";
    case 504:
      return "Gateway Timeout";
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

// Validation error formatter
export const formatValidationError = (error) => {
  if (error.name === "ValidationError" && error.details) {
    return error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
      value: detail.context?.value,
    }));
  }
  return null;
};

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  // Graceful shutdown
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  logger.error("Unhandled Promise Rejection:", {
    message: err.message,
    stack: err.stack,
    promise: promise.toString(),
    timestamp: new Date().toISOString(),
  });

  // Graceful shutdown
  process.exit(1);
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});
