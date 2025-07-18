import { executeQuery } from "../config/database.js";

export class Transaction {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.amount = data.amount;
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
      description,
      date,
    ]);

    return result.insertId;
  }

  // Get transactions by user ID with filters
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
    }

    // Add type filter
    if (filters.type) {
      query += " AND type = ?";
      params.push(filters.type);
    }

    // Add category filter
    if (filters.category) {
      query += " AND category = ?";
      params.push(filters.category);
    }

    // Add sorting
    query += " ORDER BY date DESC, created_at DESC";

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

  // Get transaction by ID
  static async findById(id) {
    const query = "SELECT * FROM transactions WHERE id = ?";
    const rows = await executeQuery(query, [id]);
    return rows.length > 0 ? new Transaction(rows[0]) : null;
  }

  // Update transaction
  static async update(id, transactionData) {
    const { amount, type, category, description, date } = transactionData;

    const query = `
      UPDATE transactions 
      SET amount = ?, type = ?, category = ?, description = ?, date = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [amount, type, category, description, date, id]);
    return await Transaction.findById(id);
  }

  // Delete transaction
  static async delete(id) {
    const query = "DELETE FROM transactions WHERE id = ?";
    await executeQuery(query, [id]);
  }

  // Get financial summary for user
  static async getFinancialSummary(userId, startDate, endDate) {
    const query = `
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_balance,
        COUNT(*) as total_transactions
      FROM transactions 
      WHERE user_id = ? AND date BETWEEN ? AND ?
    `;

    const rows = await executeQuery(query, [userId, startDate, endDate]);
    return rows[0];
  }

  // Get transactions by category
  static async getByCategory(userId, startDate, endDate) {
    const query = `
      SELECT 
        category,
        type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions 
      WHERE user_id = ? AND date BETWEEN ? AND ?
      GROUP BY category, type
      ORDER BY total_amount DESC
    `;

    return await executeQuery(query, [userId, startDate, endDate]);
  }

  // Get monthly summary
  static async getMonthlySummary(userId, year) {
    const query = `
      SELECT 
        MONTH(date) as month,
        type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions 
      WHERE user_id = ? AND YEAR(date) = ?
      GROUP BY MONTH(date), type
      ORDER BY month
    `;

    return await executeQuery(query, [userId, year]);
  }
}
