import React, { useState } from "react";
import { transactionService } from "../../services/transactions";

const AddTransaction = ({ onAdd }) => {
  const [form, setForm] = useState({
    amount: "",
    type: "expense",
    category: "",
    description: "",
    date: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await transactionService.createTransaction(form);
    onAdd();
    setForm({
      amount: "",
      type: "expense",
      category: "",
      description: "",
      date: "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-4">
      <div className="grid grid-cols-2 gap-2">
        <input
          name="amount"
          type="number"
          placeholder="Amount"
          className="input"
          value={form.amount}
          onChange={handleChange}
          required
        />
        <select
          name="type"
          className="input"
          value={form.type}
          onChange={handleChange}
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input
          name="category"
          type="text"
          placeholder="Category"
          className="input"
          value={form.category}
          onChange={handleChange}
          required
        />
        <input
          name="date"
          type="date"
          className="input"
          value={form.date}
          onChange={handleChange}
          required
        />
        <input
          name="description"
          type="text"
          placeholder="Description"
          className="input col-span-2"
          value={form.description}
          onChange={handleChange}
        />
      </div>
      <button type="submit" className="btn mt-3 bg-blue-500 text-white">
        Add Transaction
      </button>
    </form>
  );
};

export default AddTransaction;
