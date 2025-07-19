import { useState, useEffect, useCallback } from "react";
import { transactionService } from "../services/transactions";

export const useTransactions = (filters = {}) => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(false);
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

      // Refresh summary
      await fetchSummary(filters);

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

      // Refresh summary
      await fetchSummary(filters);

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

      // Refresh summary
      await fetchSummary(filters);

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
  };

  // Initial load
  useEffect(() => {
    fetchTransactions();
    fetchSummary(filters);
  }, [fetchTransactions, fetchSummary]);

  return {
    // Data
    transactions,
    summary,
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
