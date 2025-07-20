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

        setTransactions(response.transactions); // Access response.transactions directly
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
  );

  // Fetch summary
  const fetchSummary = useCallback(async (summaryFilters = {}) => {
    try {
      const response = await transactionService.getSummary(summaryFilters);
      setSummary(response.summary); // Access response.summary directly
    } catch (err) {
      console.error("Error fetching summary:", err);
      setSummary({ totalIncome: 0, totalExpenses: 0, balance: 0 });
    }
  }, []);

  // NEW: Fetch chart data (monthly and category)
  const fetchChartData = useCallback(async () => {
    try {
      const [monthlyResponse, categoryResponse] = await Promise.all([
        transactionService.getMonthlySummary(),
        transactionService.getByCategory(),
      ]);
      setMonthlyData(monthlyResponse.monthlyData || []); // Access monthlyData directly
      setCategoryData(categoryResponse.categories || []); // Access categories directly
    } catch (error) {
      console.error("Error loading chart data:", error);
      setMonthlyData([]);
      setCategoryData([]);
    }
  }, []);

  // Add transaction
  const addTransaction = async (transactionData) => {
    try {
      setLoading(true);
      const response = await transactionService.createTransaction(
        // Get full response
        transactionData
      );

      // Optimistically update the list
      setTransactions((prev) => [response.transaction, ...prev]); // Access response.transaction

      // Refresh summary and chart data
      await Promise.all([fetchSummary(filters), fetchChartData()]);

      return { success: true, data: response.transaction }; // Return response.transaction
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
        // Get full response
        id,
        transactionData
      );

      // Update the transaction in the list
      setTransactions(
        (prev) => prev.map((t) => (t.id === id ? response.transaction : t)) // Access response.transaction
      );

      // Refresh summary and chart data
      await Promise.all([fetchSummary(filters), fetchChartData()]);

      return { success: true, data: response.transaction }; // Return response.transaction
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
    fetchChartData();
  };

  // Initial load for all data
  useEffect(() => {
    fetchTransactions();
    fetchSummary(filters);
    fetchChartData();
  }, [fetchTransactions, fetchSummary, fetchChartData, filters]);

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
