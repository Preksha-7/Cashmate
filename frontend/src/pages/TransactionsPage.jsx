import React from "react";
import AddTransaction from "../components/transactions/AddTransaction";
import TransactionList from "../components/transactions/TransactionList";

const TransactionsPage = () => {
  return (
    // Removed the 'p-4' from this div. The main content padding is handled by the <main> tag in App.jsx.
    // This div now serves purely as a container for the components.
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Transactions</h1>
      {/* AddTransaction component will now fully control its own padding and styling */}
      <div className="mb-8">
        <AddTransaction onAdd={() => window.location.reload()} />
      </div>
      {/* TransactionList component will now fully control its own padding and styling */}
      <TransactionList />
    </div>
  );
};

export default TransactionsPage;
