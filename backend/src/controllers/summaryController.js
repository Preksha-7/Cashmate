import Transaction from "../models/Transaction.js";

export const getCategorySummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Transaction.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMonthlySummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Transaction.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
