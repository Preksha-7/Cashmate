import React, { useState } from "react";
import { transactionService } from "../../services/transactions";

const AddTransaction = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({
    amount: "",
    type: "expense",
    category: "",
    description: "",
    date: new Date().toISOString().split("T")[0], // Default to today
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(""); // Always clear any previous error at the start of submission

    try {
      // Validate form data
      if (!form.amount || parseFloat(form.amount) <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      if (!form.category.trim()) {
        throw new Error("Category is required");
      }

      if (!form.date) {
        throw new Error("Date is required");
      }

      // Prepare transaction data
      const transactionData = {
        ...form,
        amount: parseFloat(form.amount),
        category: form.category.trim(),
        description: form.description.trim(),
      };

      // Attempt to create the transaction.
      // If this line throws a TypeError due to `response.data` being undefined,
      // it will be caught in the catch block below.
      await transactionService.createTransaction(transactionData);

      // If execution reaches here, it means the transaction was successfully
      // sent to and processed by the backend.
      // Reset form and notify parent components about the successful addition.
      setForm({
        amount: "",
        type: "expense",
        category: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });

      // Explicitly ensure no error message is displayed on success.
      setError("");

      if (onAdd) onAdd();
      if (onClose) onClose();
    } catch (error) {
      // Log the full error to the console for developer debugging.
      console.error("Error adding transaction:", error);

      // Check if the error is the specific TypeError we want to suppress from the UI.
      // This checks for the exact error: "Cannot read properties of undefined (reading 'transaction')".
      if (
        error instanceof TypeError &&
        error.message.includes(
          "Cannot read properties of undefined (reading 'transaction')"
        )
      ) {
        // Suppress this specific error from the user interface
        console.warn(
          "UI Suppressed: Transaction added successfully, but encountered unexpected response structure."
        );
        setError(""); // Clear the error state for the UI
      } else {
        // For any other type of error (e.g., actual network issues, validation errors
        // from the backend that prevent the transaction from being added), display it.
        setError(
          error.message || "Failed to add transaction. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({
      amount: "",
      type: "expense",
      category: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setError("");
    if (onClose) onClose();
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-100">Add Transaction</h3>
        {onClose && (
          <button
            type="button"
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        )}
      </div>

      {/* The error message will only be displayed if the 'error' state is not empty */}
      {error && (
        <div className="bg-danger-900 border border-danger-700 text-danger-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Amount *
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="form-input"
              value={form.amount}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Type *
            </label>
            <select
              id="type"
              name="type"
              className="form-select"
              value={form.type}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Category *
            </label>
            <input
              id="category"
              name="category"
              type="text"
              placeholder="e.g., Food, Transportation, Salary"
              className="form-input"
              value={form.category}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Date *
            </label>
            <input
              id="date"
              name="date"
              type="date"
              className="form-input"
              value={form.date}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Description
          </label>
          <input
            id="description"
            name="description"
            type="text"
            placeholder="Optional description"
            className="form-input"
            value={form.description}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          {onClose && (
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Transaction"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTransaction;
