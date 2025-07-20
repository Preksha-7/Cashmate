import React from "react";
import AddTransaction from "../components/transactions/AddTransaction";
import TransactionList from "../components/transactions/TransactionList";

const TransactionsPage = () => {
  return (
    <div className="p-4">
      <AddTransaction onAdd={() => window.location.reload()} />
      <TransactionList />
    </div>
  );
};

export default TransactionsPage;
