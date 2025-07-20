import React, { useEffect, useState } from "react";
import { transactionService } from "../../services/transactions";
import Loading from "../common/Loading"; // Import Loading component

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state
  const [error, setError] = useState(null); // Add error state

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await transactionService.getTransactions();
      // adjust based on API response shape:
      setTransactions(data.transactions || data);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      // Using window.confirm for simplicity, consider custom modal for production
      try {
        setLoading(true);
        await transactionService.deleteTransaction(id);
        loadData(); // Reload data after deletion
      } catch (err) {
        console.error("Error deleting transaction:", err);
        setError("Failed to delete transaction.");
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return <Loading text="Loading transactions..." />;
  }

  if (error) {
    return (
      <div className="bg-danger-900 border border-danger-700 text-danger-200 px-4 py-3 rounded-lg shadow-md text-center">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700 text-gray-100">
      <h3 className="text-xl font-semibold mb-4">Transaction List</h3>
      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-300">
          <p>No transactions found. Start by adding a new one!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-primary-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                    {tx.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-primary-700 text-primary-50">
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`font-medium ${
                        tx.type === "income"
                          ? "text-success-500"
                          : "text-danger-500"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        minimumFractionDigits: 2,
                      }).format(Math.abs(tx.amount))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="text-danger-500 hover:text-danger-400 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
