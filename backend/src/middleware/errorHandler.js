// backend/src/middleware/errorHandler.js
import multer from "multer";

export const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal Server Error";
  let details = null;

  // Handle Multer errors
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        statusCode = 413;
        message = "File too large";
        details = `Maximum file size is ${Math.floor(
          (process.env.MAX_FILE_SIZE || 10485760) / 1024 / 1024
        )}MB`;
        break;
      case "LIMIT_FILE_COUNT":
        statusCode = 413;
        message = "Too many files";
        details = `Maximum ${
          process.env.MAX_FILES_PER_REQUEST || 5
        } files allowed per request`;
        break;
      case "LIMIT_UNEXPECTED_FILE":
        statusCode = 400;
        message = "Unexpected file field";
        details = "Check the file field name in your request";
        break;
      case "LIMIT_PART_COUNT":
        statusCode = 400;
        message = "Too many parts";
        details = "Request contains too many parts";
        break;
      case "LIMIT_FIELD_KEY":
        statusCode = 400;
        message = "Field name too long";
        break;
      case "LIMIT_FIELD_VALUE":
        statusCode = 400;
        message = "Field value too long";
        break;
      case "LIMIT_FIELD_COUNT":
        statusCode = 400;
        message = "Too many fields";
        break;
      default:
        statusCode = 400;
        message = "File upload error";
        details = error.message;
    }
  }

  // Handle file type validation errors
  if (error.message && error.message.includes("Invalid file type")) {
    statusCode = 400;
    message = "Invalid file type";
    details = error.message;
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    details = "Please provide a valid authentication token";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    details = "Please login again to get a new token";
  }

  // Handle Joi validation errors
  if (error.isJoi) {
    statusCode = 400;
    message = "Validation error";
    details = error.details.map((detail) => detail.message);
  }

  // Handle database errors
  if (error.code === "ER_DUP_ENTRY") {
    statusCode = 409;
    message = "Resource already exists";
    details = "This record already exists in the database";
  }

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    statusCode = 400;
    message = "Invalid reference";
    details = "Referenced resource does not exist";
  }

  // Handle file system errors
  if (error.code === "ENOENT") {
    statusCode = 404;
    message = "File not found";
    details = "The requested file does not exist";
  }

  if (error.code === "EACCES") {
    statusCode = 403;
    message = "Permission denied";
    details = "Insufficient permissions to access the file";
  }

  if (error.code === "ENOSPC") {
    statusCode = 507;
    message = "Insufficient storage";
    details = "Not enough storage space available";
  }

  // Log the error
  console.error("Error:", {
    timestamp: new Date().toISOString(),
    statusCode,
    message,
    details,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Prepare response
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  };

  // Add details in development or for specific error types
  if (details && (process.env.NODE_ENV === "development" || statusCode < 500)) {
    response.details = details;
  }

  // Add stack trace in development for server errors
  if (process.env.NODE_ENV === "development" && statusCode >= 500) {
    response.stack = error.stack;
  }

  // Add request info for debugging in development
  if (process.env.NODE_ENV === "development") {
    response.request = {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
    };
  }

  res.status(statusCode).json(response);
};
