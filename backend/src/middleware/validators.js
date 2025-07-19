import { body, validationResult } from "express-validator";

export const validateTransaction = [
  body("amount").isNumeric().withMessage("Amount must be a number"),
  body("type").isIn(["income", "expense"]).withMessage("Invalid type"),
  body("category").notEmpty().withMessage("Category is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
