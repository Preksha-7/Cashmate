import { Transaction } from "../models/Transaction.js";
import { executeQuery } from "../config/database.js"; // Import executeQuery
import { AppError } from "../middleware/errorHandler.js"; // Import AppError for consistent error handling

export const getCategorySummary = async (req, res, next) => {
  // Added next for error handling
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    let dateFilter = "";
    const params = [userId];

    if (startDate && endDate) {
      dateFilter = "AND date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    const query = `
      SELECT category, SUM(amount) as totalAmount, COUNT(*) as count
      FROM transactions
      WHERE user_id = ? ${dateFilter}
      GROUP BY category
      ORDER BY totalAmount DESC;
    `;

    const result = await executeQuery(query, params);

    res.status(200).json({
      success: true,
      message: "Category summary retrieved successfully",
      categories: result, // Directly return the array of categories
    });
  } catch (err) {
    console.error("Get category summary error:", err);
    next(
      new AppError("Failed to retrieve category summary", 500, false, {
        error: err.message,
      })
    );
  }
};

export const getMonthlySummary = async (req, res, next) => {
  // Added next for error handling
  try {
    const userId = req.user.id;
    const { year } = req.query; // Assuming year is passed for monthly summary

    // Default to current year if not provided
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const query = `
      SELECT 
          YEAR(date) as year,
          MONTH(date) as monthNum,
          DATE_FORMAT(date, '%b') as month,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
      FROM transactions
      WHERE user_id = ? AND YEAR(date) = ?
      GROUP BY YEAR(date), MONTH(date)
      ORDER BY YEAR(date), MONTH(date);
    `;

    const result = await executeQuery(query, [userId, targetYear]);

    res.status(200).json({
      success: true,
      message: "Monthly summary retrieved successfully",
      monthlyData: result, // Directly return the array of monthly data
    });
  } catch (err) {
    console.error("Get monthly summary error:", err);
    next(
      new AppError("Failed to retrieve monthly summary", 500, false, {
        error: err.message,
      })
    );
  }
};
