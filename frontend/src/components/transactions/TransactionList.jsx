import React, { useEffect, useState } from "react";
import { transactionService } from "../../services/transactions";

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);

  const loadData = async () => {
    const data = await transactionService.getTransactions();
    // adjust based on API response shape:
    setTransactions(data.transactions || data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    await transactionService.deleteTransaction(id);
    loadData();
  };

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Transaction List</h3>
      <ul>
        {transactions.map((tx) => (
          <li
            key={tx.id}
            className="border-b py-2 flex justify-between items-center"
          >
            <span>
              {tx.date} - {tx.category}: ₹{tx.amount}
            </span>
            <button
              onClick={() => handleDelete(tx.id)}
              className="text-red-500 text-sm"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TransactionList;
