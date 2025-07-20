// frontend/src/pages/DashboardPage.jsx

import React, { useMemo } from "react"; // Import useMemo
import { Link } from "react-router-dom";
import Header from "../components/common/Header";
import Loading from "../components/common/Loading";
import { useTransactions } from "../hooks/useTransaction";
import Charts from "../components/dashboard/Charts";
import SummaryCards from "../components/dashboard/SummaryCards";

const DashboardPage = () => {
  // Memoize the filters object to prevent re-creation on every render
  // The empty dependency array [] means this object will only be created once.
  const memoizedFilters = useMemo(() => ({ limit: 5 }), []);

  // Pass the memoized filters to the hook
  const { summary, transactions, monthlyData, categoryData, loading } =
    useTransactions(memoizedFilters);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Loading fullScreen text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back! Here's your financial overview.
          </p>
        </div>

        {/* Summary Cards - Now passes summary as a prop */}
        <SummaryCards summary={summary} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Trend Chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Monthly Trend
              </h3>
              <Link
                to="/transactions"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                View All
              </Link>
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
                Top Categories
              </h3>
              <Link
                to="/transactions"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                View All
              </Link>
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

        {/* Recent Transactions */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Transactions
            </h3>
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
                              ? "text-success-600"
                              : "text-danger-600"
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No transactions yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first transaction.
              </p>
              <div className="mt-6">
                <Link to="/transactions" className="btn btn-primary">
                  Add Transaction
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/transactions"
            className="card p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600">💰</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Add Transaction
                </p>
                <p className="text-xs text-gray-500">
                  Record income or expense
                </p>
              </div>
            </div>
          </Link>

          <Link
            to="/upload"
            className="card p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center">
                  <span className="text-success-600">📤</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Upload Receipt
                </p>
                <p className="text-xs text-gray-500">Scan and extract data</p>
              </div>
            </div>
          </Link>

          <Link
            to="/transactions"
            className="card p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-warning-100 rounded-full flex items-center justify-center">
                  <span className="text-warning-600">📊</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  View Reports
                </p>
                <p className="text-xs text-gray-500">Analyze spending</p>
              </div>
            </div>
          </Link>

          <Link
            to="/settings"
            className="card p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-600">⚙️</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Settings</p>
                <p className="text-xs text-gray-500">Manage preferences</p>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
