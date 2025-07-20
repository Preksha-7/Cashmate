// File: frontend/src/components/dashboard/SummaryCards.jsx

import React from "react";
// This component should ideally be used within DashboardPage and receive summary as prop
// For DashboardPage, I've embedded the summary card HTML directly to avoid passing many props
// but if you wish to use this component, it would look like this:

const SummaryCards = ({ summary }) => {
  // Receives summary as a prop
  // If summary is null/undefined due to loading or error in parent, return null or a loading state
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
        <h3 className="text-green-800">Total Income</h3>
        <p className="text-xl font-bold">
          {formatCurrency(summary.totalIncome)}
        </p>
      </div>
      <div className="bg-red-100 p-4 rounded shadow">
        <h3 className="text-red-800">Total Expenses</h3>
        <p className="text-xl font-bold">
          {formatCurrency(summary.totalExpenses)}
        </p>
      </div>
      <div className="bg-blue-100 p-4 rounded shadow">
        <h3 className="text-blue-800">Net Balance</h3>
        <p className="text-xl font-bold">{formatCurrency(summary.balance)}</p>
      </div>
    </div>
  );
};

export default SummaryCards;
