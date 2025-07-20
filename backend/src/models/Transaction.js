// File: backend/src/models/Transaction.js

import { executeQuery } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";

export class Transaction {
  static async create({
    userId,
    amount,
    type,
    category,
    date,
    description,
    notes,
  }) {
    // ... (existing create method content) ...
    try {
      const query = `
        INSERT INTO transactions (userId, amount, type, category, date, description, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const result = await executeQuery(query, [
        userId,
        amount,
        type,
        category,
        date,
        description,
        notes,
      ]);
      return result.insertId;
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new AppError(
          "Transaction with these details already exists.",
          409
        );
      }
      throw new AppError(
        `Error creating transaction: ${error.message}`,
        500,
        error
      );
    }
  }

  // ... (existing findById, update, delete, etc. methods) ...

  // NEW METHOD: Add this to check for duplicate transactions
  static async findDuplicate(userId, date, amount, description) {
    try {
      // Adjust the WHERE clause to match your definition of a duplicate transaction
      // For example, you might consider date, amount, and a sanitized description substring
      const query = `
        SELECT id FROM transactions
        WHERE userId = ?
        AND date = ?
        AND amount = ?
        AND description = ?
        LIMIT 1
      `;
      const [rows] = await executeQuery(query, [
        userId,
        date,
        amount,
        description,
      ]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new AppError(
        `Error checking for duplicate transaction: ${error.message}`,
        500,
        error
      );
    }
  }

  // ... (rest of your existing methods like getByUserId, getFinancialSummary, etc.) ...
}
