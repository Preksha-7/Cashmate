import { executeQuery } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";

export class Transaction {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.amount = parseFloat(data.amount);
    this.type = data.type;
    this.category = data.category;
    this.description = data.description;
    this.date = data.date;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create({ user_id, amount, type, category, date, description }) {
    try {
      const query = `
        INSERT INTO transactions (user_id, amount, type, category, date, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const result = await executeQuery(query, [
        user_id,
        amount,
        type,
        category,
        date,
        description,
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

  static async findById(id) {
    const query = "SELECT * FROM transactions WHERE id = ?";
    const rows = await executeQuery(query, [id]);
    return rows.length > 0 ? new Transaction(rows[0]) : null;
  }

  static async update(id, transactionData) {
    const updateFields = [];
    const params = [];

    for (const key in transactionData) {
      if (transactionData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(transactionData[key]);
      }
    }

    if (updateFields.length === 0) {
      return await Transaction.findById(id);
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    const query = `
      UPDATE transactions
      SET ${updateFields.join(", ")}
      WHERE id = ?
    `;

    await executeQuery(query, params);
    return await Transaction.findById(id);
  }

  static async delete(id) {
    const query = "DELETE FROM transactions WHERE id = ?";
    const result = await executeQuery(query, [id]);
    return result.affectedRows > 0;
  }

  static async getByUserId(userId, filters = {}) {
    let queryParts = ["SELECT * FROM transactions"];
    const conditions = ["user_id = ?"];
    const queryParams = [userId];

    if (filters.startDate && filters.endDate) {
      conditions.push("date BETWEEN ? AND ?");
      queryParams.push(filters.startDate, filters.endDate);
    }
    if (filters.type) {
      conditions.push("type = ?");
      queryParams.push(filters.type);
    }
    if (filters.category) {
      conditions.push("category = ?");
      queryParams.push(filters.category);
    }

    queryParts.push(`WHERE ${conditions.join(" AND ")}`);

    const sortableFields = ["date", "amount", "category", "type", "created_at"];
    const orderBy = sortableFields.includes(filters.sort)
      ? filters.sort
      : "date";
    const orderDirection = filters.order === "asc" ? "ASC" : "DESC";
    queryParts.push(`ORDER BY ${orderBy} ${orderDirection}`);

    if (filters.limit !== undefined && filters.offset !== undefined) {
      const limitValue = Math.floor(Number(filters.limit));
      const offsetValue = Math.floor(Number(filters.offset));

      if (
        !isNaN(limitValue) &&
        limitValue >= 0 &&
        !isNaN(offsetValue) &&
        offsetValue >= 0
      ) {
        queryParts.push(`LIMIT ${limitValue} OFFSET ${offsetValue}`);
      } else {
        console.warn(
          "Invalid pagination values received in getByUserId (after floor):",
          filters.limit,
          filters.offset
        );
      }
    }

    const finalQuery = queryParts.join(" ");
    const rows = await executeQuery(finalQuery, queryParams);
    return rows.map((row) => new Transaction(row));
  }

  static async getCountByUserId(userId, filters = {}) {
    let baseQuery = "SELECT COUNT(*) as count FROM transactions";
    const conditions = ["user_id = ?"];
    const params = [userId];

    if (filters.startDate && filters.endDate) {
      conditions.push("date BETWEEN ? AND ?");
      params.push(filters.startDate, filters.endDate);
    }
    if (filters.type) {
      conditions.push("type = ?");
      params.push(filters.type);
    }
    if (filters.category) {
      conditions.push("category = ?");
      params.push(filters.category);
    }

    let finalQuery = `${baseQuery} WHERE ${conditions.join(" AND ")}`;
    const rows = await executeQuery(finalQuery, params);
    return rows[0].count;
  }

  // Get financial summary
  static async getFinancialSummary(userId, startDate, endDate) {
    const query = `
      SELECT
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpenses,
          SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
      FROM transactions
      WHERE user_id = ? AND date BETWEEN ? AND ?;
    `;
    const rows = await executeQuery(query, [userId, startDate, endDate]);
    // Ensure that if no transactions are found, sums default to 0
    return {
      totalIncome: parseFloat(rows[0].totalIncome || 0),
      totalExpenses: parseFloat(rows[0].totalExpenses || 0),
      balance: parseFloat(rows[0].balance || 0),
    };
  }

  // Get transactions by category
  static async getByCategory(userId, startDate, endDate) {
    const query = `
      SELECT category, SUM(amount) as totalAmount, COUNT(*) as count
      FROM transactions
      WHERE user_id = ? AND date BETWEEN ? AND ?
      GROUP BY category
      ORDER BY totalAmount DESC;
    `;
    const result = await executeQuery(query, [userId, startDate, endDate]);
    return result.map((row) => ({
      category: row.category,
      totalAmount: parseFloat(row.totalAmount),
      count: parseInt(row.count),
    }));
  }

  // Get monthly summary
  static async getMonthlySummary(userId, year) {
    const query = `
      SELECT
          YEAR(date) as year,
          MONTH(date) as monthNum,
          DATE_FORMAT(date, '%b') as month,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
      FROM transactions
      WHERE user_id = ? AND YEAR(date) = ?
      GROUP BY YEAR(date), MONTH(date), month
      ORDER BY YEAR(date), MONTH(date);
    `;
    const rows = await executeQuery(query, [userId, year]);
    return rows.map((row) => ({
      year: row.year,
      monthNum: row.monthNum,
      month: row.month,
      income: parseFloat(row.income),
      expenses: parseFloat(row.expenses),
    }));
  }

  // Get user's unique categories (for categorization features)
  static async getCategories(userId) {
    const query = `
      SELECT DISTINCT category
      FROM transactions
      WHERE user_id = ?
      ORDER BY category ASC;
    `;
    const rows = await executeQuery(query, [userId]);
    return rows.map((row) => row.category);
  }

  // Get recent transactions
  static async getRecent(userId, limit = 5) {
    const query = `
      SELECT id, date, description, amount, type, category
      FROM transactions
      WHERE user_id = ?
      ORDER BY date DESC, created_at DESC
      LIMIT ?;
    `;
    const rows = await executeQuery(query, [userId, limit]);
    return rows.map((row) => new Transaction(row));
  }

  // Get transaction statistics (overview)
  static async getStats(userId, startDate, endDate) {
    const query = `
      SELECT
          COUNT(*) as totalTransactions,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpenses,
          SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as netBalance
      FROM transactions
      WHERE user_id = ? AND date BETWEEN ? AND ?;
    `;
    const rows = await executeQuery(query, [userId, startDate, endDate]);
    return {
      totalTransactions: parseInt(rows[0].totalTransactions || 0),
      totalIncome: parseFloat(rows[0].totalIncome || 0),
      totalExpenses: parseFloat(rows[0].totalExpenses || 0),
      netBalance: parseFloat(rows[0].netBalance || 0),
    };
  }

  // Check for duplicate transactions (for PDF parsing)
  static async findDuplicate(userId, date, amount, description) {
    try {
      const query = `
        SELECT id FROM transactions
        WHERE user_id = ? AND date = ? AND amount = ? AND description = ?
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
}
