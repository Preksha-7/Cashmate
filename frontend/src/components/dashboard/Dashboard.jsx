import React from "react";
import SummaryCards from "./SummaryCards";
import Charts from "./Charts";

const Dashboard = () => {
  return (
    <div className="p-4">
      <SummaryCards />
      <Charts />
    </div>
  );
};

export default Dashboard;
