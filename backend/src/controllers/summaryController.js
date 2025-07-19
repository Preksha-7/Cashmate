import Transaction from "../models/Transaction.js";

export const getCategorySummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const summary = await Transaction.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMonthlySummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const summary = await Transaction.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
