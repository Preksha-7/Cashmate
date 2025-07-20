// File: frontend/src/hooks/useTransaction.js

import { useState, useEffect, useCallback } from "react";
import { transactionService } from "../services/transactions";

export const useTransactions = (filters = {}) => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
  });
  const [monthlyData, setMonthlyData] = useState([]); // NEW: State for monthly trend data
  const [categoryData, setCategoryData] = useState([]); // NEW: State for category breakdown data
  const [loading, setLoading] = useState(true); // Changed initial state to true to show loading on first load
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Fetch transactions
  const fetchTransactions = useCallback(
    async (newFilters = {}) => {
      try {
        setLoading(true);
        setError(null);

        const response = await transactionService.getTransactions({
          ...filters,
          ...newFilters,
        });

        setTransactions(response.transactions);
        setPagination(response.pagination);
      } catch (err) {
        setError(err.message || "Failed to fetch transactions");
        console.error("Error fetching transactions:", err);
        setTransactions([]); // Clear transactions on error
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 }); // Reset pagination on error
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Fetch summary
  const fetchSummary = useCallback(async (summaryFilters = {}) => {
    try {
      const response = await transactionService.getSummary(summaryFilters);
      setSummary(response);
    } catch (err) {
      console.error("Error fetching summary:", err);
      setSummary({ totalIncome: 0, totalExpenses: 0, balance: 0 }); // Reset summary on error
    }
  }, []);

  // NEW: Fetch chart data (monthly and category)
  const fetchChartData = useCallback(async () => {
    try {
      const [monthlyResponse, categoryResponse] = await Promise.all([
        transactionService.getMonthlySummary(),
        transactionService.getByCategory(),
      ]);
      setMonthlyData(monthlyResponse.data || []);
      setCategoryData(categoryResponse.data || []);
    } catch (error) {
      console.error("Error loading chart data:", error);
      setMonthlyData([]); // Clear data on error
      setCategoryData([]); // Clear data on error
    }
  }, []);

  // Add transaction
  const addTransaction = async (transactionData) => {
    try {
      setLoading(true);
      const newTransaction = await transactionService.createTransaction(
        transactionData
      );

      // Optimistically update the list
      setTransactions((prev) => [newTransaction, ...prev]);

      // Refresh summary and chart data
      await Promise.all([fetchSummary(filters), fetchChartData()]);

      return { success: true, data: newTransaction };
    } catch (err) {
      setError(err.message || "Failed to add transaction");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Update transaction
  const updateTransaction = async (id, transactionData) => {
    try {
      setLoading(true);
      const updatedTransaction = await transactionService.updateTransaction(
        id,
        transactionData
      );

      // Update the transaction in the list
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? updatedTransaction : t))
      );

      // Refresh summary and chart data
      await Promise.all([fetchSummary(filters), fetchChartData()]);

      return { success: true, data: updatedTransaction };
    } catch (err) {
      setError(err.message || "Failed to update transaction");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Delete transaction
  const deleteTransaction = async (id) => {
    try {
      setLoading(true);
      await transactionService.deleteTransaction(id);

      // Remove transaction from list
      setTransactions((prev) => prev.filter((t) => t.id !== id));

      // Refresh summary and chart data
      await Promise.all([fetchSummary(filters), fetchChartData()]);

      return { success: true };
    } catch (err) {
      setError(err.message || "Failed to delete transaction");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Load more transactions (pagination)
  const loadMore = () => {
    if (pagination.page < pagination.totalPages) {
      fetchTransactions({ page: pagination.page + 1 });
    }
  };

  // Refresh data
  const refresh = () => {
    fetchTransactions();
    fetchSummary(filters);
    fetchChartData(); // NEW: Refresh chart data on refresh
  };

  // Initial load for all data
  useEffect(() => {
    fetchTransactions();
    fetchSummary(filters);
    fetchChartData(); // NEW: Fetch chart data on initial load
  }, [fetchTransactions, fetchSummary, fetchChartData, filters]); // Added fetchChartData to dependency array

  return {
    // Data
    transactions,
    summary,
    monthlyData, // NEW: Return monthly data
    categoryData, // NEW: Return category data
    pagination,

    // State
    loading,
    error,

    // Actions
    addTransaction,
    updateTransaction,
    deleteTransaction,
    fetchTransactions,
    loadMore,
    refresh,

    // Utils
    clearError: () => setError(null),
  };
};
