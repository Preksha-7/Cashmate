// frontend/src/pages/ReportsPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Header from "../components/common/Header";
import Loading from "../components/common/Loading";
import { useTransactions } from "../hooks/useTransaction"; // Re-use the hook
import Charts from "../components/dashboard/Charts"; // Re-use the Charts component
import SummaryCards from "../components/dashboard/SummaryCards"; // Re-use SummaryCards

const ReportsPage = () => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // Month is 0-indexed
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0);

  // Format dates to YYYY-MM-DD for backend
  const formattedStartDate = firstDayOfMonth.toISOString().split("T")[0];
  const formattedEndDate = lastDayOfMonth.toISOString().split("T")[0];

  // Filters for the useTransactions hook
  // No 'limit' here, as this page is specifically for showing the full monthly data.
  const filters = useMemo(
    () => ({
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      year: selectedYear, // Pass year for monthly trend chart
    }),
    [formattedStartDate, formattedEndDate, selectedYear]
  );

  const { summary, transactions, monthlyData, categoryData, loading, refresh } =
    useTransactions(filters); // Pass filters to the hook

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  // Effect to refresh data when month/year changes
  useEffect(() => {
    refresh(); // Refresh all data when filters change
  }, [selectedMonth, selectedYear, refresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-900">
        <Header />
        <Loading fullScreen text="Loading reports..." />
      </div>
    );
  }

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const years = Array.from(
    { length: 5 },
    (_, i) => today.getFullYear() - 2 + i
  ); // Current year +/- 2

  return (
    <div className="min-h-screen bg-primary-900">
      <Header />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Reports Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-100">Monthly Reports</h1>
          <p className="mt-1 text-sm text-gray-300">
            View detailed financial reports by month.
          </p>
        </div>

        {/* Month and Year Selection UI */}
        <div className="flex gap-4 mb-6">
          <select
            className="form-select px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          <select
            className="form-select px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Summary Cards */}
        <SummaryCards summary={summary} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Trend Chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Monthly Trend (for {selectedYear})
              </h3>
              {/* Optional: Link to a full transactions page if desired */}
              {/* <Link to="/transactions" className="text-sm text-primary-500 hover:text-primary-400">
                View All
              </Link> */}
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Loading size="md" text="Loading chart..." />
              </div>
            ) : monthlyData.length > 0 ? (
              <Charts data={monthlyData} type="monthly" />
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">No monthly data available</p>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Category Breakdown (for {months[selectedMonth - 1].label}{" "}
                {selectedYear})
              </h3>
              {/* Optional: Link to a full transactions page if desired */}
              {/* <Link to="/transactions" className="text-sm text-primary-500 hover:text-primary-400">
                View All
              </Link> */}
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Loading size="md" text="Loading categories..." />
              </div>
            ) : categoryData.length > 0 ? (
              <Charts data={categoryData} type="category" />
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">No category data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Transactions List for the selected month/year */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Transactions for {months[selectedMonth - 1].label} {selectedYear}
            </h3>
            {/* You can still provide a link to the main transactions page here if needed */}
            <Link to="/transactions" className="btn btn-primary">
              View All Transactions
            </Link>
          </div>

          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {transaction.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`font-medium ${
                            transaction.type === "income"
                              ? "text-success-500"
                              : "text-danger-500"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-100">
                No transactions yet for this period
              </h3>
              <p className="mt-1 text-sm text-gray-300">
                Adjust the month/year or add a new transaction.
              </p>
              <div className="mt-6">
                <Link to="/transactions" className="btn btn-primary">
                  Add Transaction
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
