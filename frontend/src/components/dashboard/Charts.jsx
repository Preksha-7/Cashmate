import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Bar,
  Legend,
} from "recharts";

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFD93D",
  "#A29BFE",
  "#55EFC4",
  "#6B8E23",
  "#BA55D3",
]; // More colors for variety

const Charts = ({ data, type }) => {
  // Now accepts data and type as props
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available for this chart.
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Render different charts based on type prop
  if (type === "category") {
    // Pie Chart for categories
    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="totalAmount" // Assuming 'totalAmount' is the value for categories
              nameKey="category" // Assuming 'category' is the name
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ category, percent }) =>
                `${category} (${(percent * 100).toFixed(0)}%)`
              } // Use 'category' for label
            >
              {data.map(
                (
                  entry,
                  index // Changed to map 'entry'
                ) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                )
              )}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  } else if (type === "monthly") {
    // Bar Chart for monthly trends
    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="month"
              tickFormatter={(month) => month.substring(0, 3)}
            />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="income" fill="#82ca9d" name="Income" />
            <Bar dataKey="expenses" fill="#ff7f50" name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-64 flex items-center justify-center text-gray-500">
      Invalid chart type provided.
    </div>
  );
};

export default Charts;
