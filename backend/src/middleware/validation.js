// backend/src/middleware/validation.js
import Joi from "joi";

export const validateRequest = (schema, source = "body") => {
  return (req, res, next) => {
    const dataToValidate = source === "query" ? req.query : req.body;
    const { error } = schema.validate(dataToValidate, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
          value: detail.context?.value,
        })),
      });
    }
    next();
  };
};

// Auth validation schemas
export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name must not exceed 50 characters",
    "any.required": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required",
  }),
});

// Transaction validation schemas
export const transactionSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required().messages({
    "number.positive": "Amount must be a positive number",
    "number.precision": "Amount can have at most 2 decimal places",
    "any.required": "Amount is required",
  }),
  type: Joi.string().valid("income", "expense").required().messages({
    "any.only": "Type must be either 'income' or 'expense'",
    "any.required": "Type is required",
  }),
  category: Joi.string().min(1).max(50).required().messages({
    "string.min": "Category is required",
    "string.max": "Category must not exceed 50 characters",
    "any.required": "Category is required",
  }),
  description: Joi.string().max(200).optional().allow("").messages({
    "string.max": "Description must not exceed 200 characters",
  }),
  date: Joi.date().max("now").required().messages({
    "date.max": "Date cannot be in the future",
    "any.required": "Date is required",
  }),
});

export const updateTransactionSchema = Joi.object({
  amount: Joi.number().positive().precision(2).optional().messages({
    "number.positive": "Amount must be a positive number",
    "number.precision": "Amount can have at most 2 decimal places",
  }),
  type: Joi.string().valid("income", "expense").optional().messages({
    "any.only": "Type must be either 'income' or 'expense'",
  }),
  category: Joi.string().min(1).max(50).optional().messages({
    "string.min": "Category cannot be empty",
    "string.max": "Category must not exceed 50 characters",
  }),
  description: Joi.string().max(200).optional().allow("").messages({
    "string.max": "Description must not exceed 200 characters",
  }),
  date: Joi.date().max("now").optional().messages({
    "date.max": "Date cannot be in the future",
  }),
});

export const transactionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.integer": "Page must be an integer",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit must not exceed 100",
  }),
  startDate: Joi.date().optional().messages({
    "date.base": "Start date must be a valid date",
  }),
  endDate: Joi.date().min(Joi.ref("startDate")).optional().messages({
    "date.base": "End date must be a valid date",
    "date.min": "End date must be after start date",
  }),
  type: Joi.string().valid("income", "expense").optional().messages({
    "any.only": "Type must be either 'income' or 'expense'",
  }),
  category: Joi.string().max(50).optional().messages({
    "string.max": "Category must not exceed 50 characters",
  }),
  sort: Joi.string()
    .valid("date", "amount", "category", "type", "created_at")
    .default("date")
    .messages({
      "any.only":
        "Sort must be one of: date, amount, category, type, created_at",
    }),
  order: Joi.string().valid("asc", "desc").default("desc").messages({
    "any.only": "Order must be either 'asc' or 'desc'",
  }),
  year: Joi.number()
    .integer()
    .min(2000)
    .max(new Date().getFullYear())
    .optional()
    .messages({
      "number.integer": "Year must be an integer",
      "number.min": "Year must be at least 2000",
      "number.max": `Year cannot be greater than ${new Date().getFullYear()}`,
    }),
});

// ID parameter validation
export const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.integer": "ID must be an integer",
    "number.positive": "ID must be a positive number",
    "any.required": "ID is required",
  }),
});

export const validateIdParam = (req, res, next) => {
  const { error } = idParamSchema.validate(req.params);
  if (error) {
    return res.status(400).json({
      success: false,
      error: "Invalid ID parameter",
      details: error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      })),
    });
  }
  next();
};
