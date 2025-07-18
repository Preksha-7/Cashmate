import { executeQuery } from "../config/database.js";

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

  // Create new transaction
  static async create(transactionData) {
    const { user_id, amount, type, category, description, date } =
      transactionData;

    const query = `
      INSERT INTO transactions (user_id, amount, type, category, description, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [
      user_id,
      amount,
      type,
      category,
      description || null,
      date,
    ]);

    return result.insertId;
  }

  // Get transactions by user ID with advanced filters
  static async getByUserId(userId, filters = {}) {
    let query = `
      SELECT * FROM transactions 
      WHERE user_id = ?
    `;
    const params = [userId];

    // Add date range filter
    if (filters.startDate && filters.endDate) {
      query += " AND date BETWEEN ? AND ?";
      params.push(filters.startDate, filters.endDate);
    } else if (filters.startDate) {
      query += " AND date >= ?";
      params.push(filters.startDate);
    } else if (filters.endDate) {
      query += " AND date <= ?";
      params.push(filters.endDate);
    }

    // Add type filter
    if (filters.type) {
      query += " AND type = ?";
      params.push(filters.type);
    }

    // Add category filter
    if (filters.category) {
      query += " AND category LIKE ?";
      params.push(`%${filters.category}%`);
    }

    // Add sorting
    const validSortFields = [
      "date",
      "amount",
      "category",
      "type",
      "created_at",
    ];
    const sortField = validSortFields.includes(filters.sort)
      ? filters.sort
      : "date";
    const sortOrder = filters.order === "asc" ? "ASC" : "DESC";

    query += ` ORDER BY ${sortField} ${sortOrder}`;

    // Add secondary sort to ensure consistent ordering
    if (sortField !== "created_at") {
      query += `, created_at DESC`;
    }

    // Add pagination
    if (filters.limit) {
      query += " LIMIT ?";
      params.push(parseInt(filters.limit));

      if (filters.offset) {
        query += " OFFSET ?";
        params.push(parseInt(filters.offset));
      }
    }

    const rows = await executeQuery(query, params);
    return rows.map((row) => new Transaction(row));
  }

  // Get count of transactions for pagination
  static async getCountByUserId(userId, filters = {}) {
    let query = `
      SELECT COUNT(*) as count FROM transactions 
      WHERE user_id = ?
    `;
    const params = [userId];

    // Add date range filter
    if (filters.startDate && filters.endDate) {
      query += " AND date BETWEEN ? AND ?";
      params.push(filters.startDate, filters.endDate);
    } else if (filters.startDate) {
      query += " AND date >= ?";
      params.push(filters.startDate);
    } else if (filters.endDate) {
      query += " AND date <= ?";
      params.push(filters.endDate);
    }

    // Add type filter
    if (filters.type) {
      query += " AND type = ?";
      params.push(filters.type);
    }

    // Add category filter
    if (filters.category) {
      query += " AND category LIKE ?";
      params.push(`%${filters.category}%`);
    }

    const rows = await executeQuery(query, params);
    return rows[0].count;
  }

  // Get transaction by ID
  static async findById(id) {
    const query = "SELECT * FROM transactions WHERE id = ?";
    const rows = await executeQuery(query, [id]);
    return rows.length > 0 ? new Transaction(rows[0]) : null;
  }

  // Update transaction
  static async update(id, transactionData) {
    const updateFields = [];
    const params = [];

    // Build dynamic update query
    if (transactionData.amount !== undefined) {
      updateFields.push("amount = ?");
      params.push(transactionData.amount);
    }

    if (transactionData.type !== undefined) {
      updateFields.push("type = ?");
      params.push(transactionData.type);
    }

    if (transactionData.category !== undefined) {
      updateFields.push("category = ?");
      params.push(transactionData.category);
    }

    if (transactionData.description !== undefined) {
      updateFields.push("description = ?");
      params.push(transactionData.description || null);
    }

    if (transactionData.date !== undefined) {
      updateFields.push("date = ?");
      params.push(transactionData.date);
    }

    if (updateFields.length === 0) {
      throw new Error("No fields to update");
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

  // Delete transaction
  static async delete(id) {
    const query = "DELETE FROM transactions WHERE id = ?";
    const result = await executeQuery(query, [id]);
    return result.affectedRows > 0;
  }

  // Get financial summary for user
  static async getFinancialSummary(userId, startDate, endDate) {
    const query = `
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_balance,
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
      FROM transactions 
      WHERE user_id = ? AND date BETWEEN ? AND ?
    `;

    const rows = await executeQuery(query, [userId, startDate, endDate]);
    const summary = rows[0];

    return {
      total_income: parseFloat(summary.total_income || 0),
      total_expenses: parseFloat(summary.total_expenses || 0),
      net_balance: parseFloat(summary.net_balance || 0),
      total_transactions: parseInt(summary.total_transactions || 0),
      income_count: parseInt(summary.income_count || 0),
      expense_count: parseInt(summary.expense_count || 0),
    };
  }

  // Get transactions by category
  static async getByCategory(userId, startDate, endDate) {
    const query = `
      SELECT 
        category,
        type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_amount,
        MAX(amount) as max_amount,
        MIN(amount) as min_amount
      FROM transactions 
      WHERE user_id = ? AND date BETWEEN ? AND ?
      GROUP BY category, type
      ORDER BY total_amount DESC
    `;

    const rows = await executeQuery(query, [userId, startDate, endDate]);
    return rows.map((row) => ({
      ...row,
      total_amount: parseFloat(row.total_amount),
      avg_amount: parseFloat(row.avg_amount),
      max_amount: parseFloat(row.max_amount),
      min_amount: parseFloat(row.min_amount),
    }));
  }

  // Get monthly summary
  static async getMonthlySummary(userId, year) {
    const query = `
      SELECT 
        MONTH(date) as month,
        MONTHNAME(date) as month_name,
        type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_amount
      FROM transactions 
      WHERE user_id = ? AND YEAR(date) = ?
      GROUP BY MONTH(date), MONTHNAME(date), type
      ORDER BY month, type
    `;

    const rows = await executeQuery(query, [userId, year]);
    return rows.map((row) => ({
      ...row,
      total_amount: parseFloat(row.total_amount),
      avg_amount: parseFloat(row.avg_amount),
    }));
  }

  // Get recent transactions
  static async getRecent(userId, limit = 5) {
    const query = `
      SELECT * FROM transactions 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const rows = await executeQuery(query, [userId, limit]);
    return rows.map((row) => new Transaction(row));
  }

  // Get all unique categories for a user
  static async getCategories(userId) {
    const query = `
      SELECT DISTINCT category
      FROM transactions 
      WHERE user_id = ?
      ORDER BY category
    `;

    const rows = await executeQuery(query, [userId]);
    return rows.map((row) => row.category);
  }

  // Get transaction statistics
  static async getStats(userId, startDate, endDate) {
    const query = `
      SELECT 
        type,
        COUNT(*) as count,
        SUM(amount) as total,
        AVG(amount) as average,
        MAX(amount) as maximum,
        MIN(amount) as minimum
      FROM transactions 
      WHERE user_id = ? AND date BETWEEN ? AND ?
      GROUP BY type
    `;

    const rows = await executeQuery(query, [userId, startDate, endDate]);
    return rows.map((row) => ({
      ...row,
      total: parseFloat(row.total),
      average: parseFloat(row.average),
      maximum: parseFloat(row.maximum),
      minimum: parseFloat(row.minimum),
    }));
  }
}
