import React, { useEffect, useState } from "react";
import API from "../../services/api";

const SummaryCards = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const res = await API.get("/summary");
      setSummary(res.data);
    };
    fetchSummary();
  }, []);

  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-green-100 p-4 rounded shadow">
        <h3 className="text-green-800">Income</h3>
        <p className="text-xl font-bold">₹{summary.total_income}</p>
      </div>
      <div className="bg-red-100 p-4 rounded shadow">
        <h3 className="text-red-800">Expenses</h3>
        <p className="text-xl font-bold">₹{summary.total_expenses}</p>
      </div>
      <div className="bg-blue-100 p-4 rounded shadow">
        <h3 className="text-blue-800">Balance</h3>
        <p className="text-xl font-bold">₹{summary.net_balance}</p>
      </div>
    </div>
  );
};

export default SummaryCards;
