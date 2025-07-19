// backend/src/middleware/validation.js
import Joi from "joi";
import { AppError } from "./errorHandler.js";

// Transaction creation schema
export const transactionSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .precision(2)
    .max(9999999.99)
    .required()
    .messages({
      "number.base": "Amount must be a number",
      "number.positive": "Amount must be positive",
      "number.max": "Amount cannot exceed 9,999,999.99",
      "number.precision": "Amount can have maximum 2 decimal places",
      "any.required": "Amount is required",
    }),

  type: Joi.string().valid("income", "expense").required().messages({
    "string.base": "Type must be a string",
    "any.only": 'Type must be either "income" or "expense"',
    "any.required": "Type is required",
  }),

  category: Joi.string().trim().min(1).max(50).required().messages({
    "string.base": "Category must be a string",
    "string.empty": "Category cannot be empty",
    "string.min": "Category must be at least 1 character long",
    "string.max": "Category cannot exceed 50 characters",
    "any.required": "Category is required",
  }),

  description: Joi.string().trim().max(255).allow("").optional().messages({
    "string.base": "Description must be a string",
    "string.max": "Description cannot exceed 255 characters",
  }),

  date: Joi.date().iso().max("now").required().messages({
    "date.base": "Date must be a valid date",
    "date.format": "Date must be in ISO format (YYYY-MM-DD)",
    "date.max": "Date cannot be in the future",
    "any.required": "Date is required",
  }),
});

// Transaction update schema (all fields optional)
export const updateTransactionSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .precision(2)
    .max(9999999.99)
    .optional()
    .messages({
      "number.base": "Amount must be a number",
      "number.positive": "Amount must be positive",
      "number.max": "Amount cannot exceed 9,999,999.99",
      "number.precision": "Amount can have maximum 2 decimal places",
    }),

  type: Joi.string().valid("income", "expense").optional().messages({
    "string.base": "Type must be a string",
    "any.only": 'Type must be either "income" or "expense"',
  }),

  category: Joi.string().trim().min(1).max(50).optional().messages({
    "string.base": "Category must be a string",
    "string.empty": "Category cannot be empty",
    "string.min": "Category must be at least 1 character long",
    "string.max": "Category cannot exceed 50 characters",
  }),

  description: Joi.string().trim().max(255).allow("").optional().messages({
    "string.base": "Description must be a string",
    "string.max": "Description cannot exceed 255 characters",
  }),

  date: Joi.date().iso().max("now").optional().messages({
    "date.base": "Date must be a valid date",
    "date.format": "Date must be in ISO format (YYYY-MM-DD)",
    "date.max": "Date cannot be in the future",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// Transaction query parameters schema
export const transactionQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .default(1)
    .optional()
    .messages({
      "number.base": "Page must be a number",
      "number.integer": "Page must be an integer",
      "number.min": "Page must be at least 1",
      "number.max": "Page cannot exceed 10000",
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 100",
    }),

  startDate: Joi.date().iso().optional().messages({
    "date.base": "Start date must be a valid date",
    "date.format": "Start date must be in ISO format (YYYY-MM-DD)",
  }),

  endDate: Joi.date().iso().min(Joi.ref("startDate")).optional().messages({
    "date.base": "End date must be a valid date",
    "date.format": "End date must be in ISO format (YYYY-MM-DD)",
    "date.min": "End date must be after start date",
  }),

  type: Joi.string().valid("income", "expense").optional().messages({
    "string.base": "Type must be a string",
    "any.only": 'Type must be either "income" or "expense"',
  }),

  category: Joi.string().trim().min(1).max(50).optional().messages({
    "string.base": "Category must be a string",
    "string.empty": "Category cannot be empty",
    "string.min": "Category must be at least 1 character long",
    "string.max": "Category cannot exceed 50 characters",
  }),

  sort: Joi.string()
    .valid("date", "amount", "category", "type", "created_at")
    .default("date")
    .optional()
    .messages({
      "string.base": "Sort must be a string",
      "any.only":
        "Sort must be one of: date, amount, category, type, created_at",
    }),

  order: Joi.string().valid("asc", "desc").default("desc").optional().messages({
    "string.base": "Order must be a string",
    "any.only": 'Order must be either "asc" or "desc"',
  }),

  year: Joi.number()
    .integer()
    .min(2000)
    .max(new Date().getFullYear() + 1)
    .optional()
    .messages({
      "number.base": "Year must be a number",
      "number.integer": "Year must be an integer",
      "number.min": "Year must be at least 2000",
      "number.max": `Year cannot exceed ${new Date().getFullYear() + 1}`,
    }),
});

// Validation middleware function
export const validateRequest = (schema, source = "body") => {
  return (req, res, next) => {
    const data =
      source === "query"
        ? req.query
        : source === "params"
        ? req.params
        : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true, // Convert types when possible
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));

      return next(
        new AppError(
          `Validation failed: ${validationErrors
            .map((e) => e.message)
            .join(", ")}`,
          400,
          true,
          { validationErrors }
        )
      );
    }

    // Replace the original data with validated and sanitized data
    if (source === "query") {
      req.query = value;
    } else if (source === "params") {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

// Parameter validation for route parameters
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      return next(new AppError(`Invalid parameters: ${message}`, 400));
    }

    req.params = value;
    next();
  };
};

// ID parameter validation
export const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "ID must be a number",
    "number.integer": "ID must be an integer",
    "number.positive": "ID must be positive",
    "any.required": "ID is required",
  }),
});

// Sanitize input to prevent XSS
export const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        // Basic XSS prevention
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+=/gi, "");
      }
    });
  }
  next();
};

// Rate limiting validation
export const rateLimitSchema = Joi.object({
  windowMs: Joi.number().integer().min(1000).default(900000), // 15 minutes
  max: Joi.number().integer().min(1).default(100), // 100 requests per windowMs
  standardHeaders: Joi.boolean().default(true),
  legacyHeaders: Joi.boolean().default(false),
});
