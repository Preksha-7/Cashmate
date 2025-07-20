import React from "react";

const SummaryCards = ({ summary }) => {
  if (!summary) return null; // Or return a skeleton loading component

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-green-100 p-4 rounded shadow">
        {/* Changed text color to gray-900 for black text */}
        <h3 className="text-gray-900">Total Income</h3>
        <p className="text-gray-900 text-xl font-bold">
          {formatCurrency(summary.totalIncome)}
        </p>
      </div>
      <div className="bg-red-100 p-4 rounded shadow">
        {/* Changed text color to gray-900 for black text */}
        <h3 className="text-gray-900">Total Expenses</h3>
        <p className="text-gray-900 text-xl font-bold">
          {formatCurrency(summary.totalExpenses)}
        </p>
      </div>
      <div className="bg-blue-100 p-4 rounded shadow">
        {/* Changed text color to gray-900 for black text */}
        <h3 className="text-gray-900">Net Balance</h3>
        <p className="text-gray-900 text-xl font-bold">
          {formatCurrency(summary.balance)}
        </p>
      </div>
    </div>
  );
};

export default SummaryCards;
