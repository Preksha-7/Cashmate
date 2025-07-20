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
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Fetch transactions based on filters
  const fetchTransactions = useCallback(
    async (newFilters = {}) => {
      try {
        setLoading(true);
        setError(null);

        // Merge initial filters with any new filters (e.g., for pagination)
        const currentFilters = { ...filters, ...newFilters };

        const response = await transactionService.getTransactions(
          currentFilters
        ); // Pass all relevant filters
        setTransactions(response.transactions);
        setPagination(response.pagination);
      } catch (err) {
        setError(err.message || "Failed to fetch transactions");
        console.error("Error fetching transactions:", err);
        setTransactions([]);
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
      } finally {
        setLoading(false);
      }
    },
    [filters]
  ); // Depend on filters object

  // Fetch summary based on filters
  const fetchSummary = useCallback(async () => {
    try {
      const response = await transactionService.getSummary({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      setSummary(response.summary);
    } catch (err) {
      console.error("Error fetching summary:", err);
      setSummary({ totalIncome: 0, totalExpenses: 0, balance: 0 });
    }
  }, [filters.startDate, filters.endDate]); // Depend on relevant filter props

  // Fetch chart data (monthly and category) based on filters
  const fetchChartData = useCallback(async () => {
    try {
      const [monthlyResponse, categoryResponse] = await Promise.all([
        transactionService.getMonthlySummary({ year: filters.year }), // Pass year for monthly trend
        transactionService.getByCategory({
          startDate: filters.startDate,
          endDate: filters.endDate,
        }), // Pass date range for category
      ]);
      setMonthlyData(monthlyResponse.monthlyData || []);
      setCategoryData(categoryResponse.categories || []);
    } catch (error) {
      console.error("Error loading chart data:", error);
      setMonthlyData([]);
      setCategoryData([]);
    }
  }, [filters.year, filters.startDate, filters.endDate]); // Depend on relevant filter props

  // Add transaction
  const addTransaction = async (transactionData) => {
    try {
      setLoading(true);
      const response = await transactionService.createTransaction(
        transactionData
      );
      setTransactions((prev) => [response.transaction, ...prev]);
      // Refresh all data relevant to the current view
      await Promise.all([
        fetchSummary(),
        fetchChartData(),
        fetchTransactions(),
      ]); // Refresh with current filters
      return { success: true, data: response.transaction };
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
      const response = await transactionService.updateTransaction(
        id,
        transactionData
      );
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? response.transaction : t))
      );
      // Refresh all data relevant to the current view
      await Promise.all([
        fetchSummary(),
        fetchChartData(),
        fetchTransactions(),
      ]); // Refresh with current filters
      return { success: true, data: response.transaction };
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
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      // Refresh all data relevant to the current view
      await Promise.all([
        fetchSummary(),
        fetchChartData(),
        fetchTransactions(),
      ]); // Refresh with current filters
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

  // Refresh all data based on current filters
  const refresh = useCallback(() => {
    fetchTransactions({ page: 1 }); // Reset to page 1 on full refresh
    fetchSummary();
    fetchChartData();
  }, [fetchTransactions, fetchSummary, fetchChartData]);

  // Initial load for all data when filters change
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    // Data
    transactions,
    summary,
    monthlyData,
    categoryData,
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
