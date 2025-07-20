import React, { useEffect, useState } from "react";
import API from "../../services/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#A29BFE", "#55EFC4"];

const Charts = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    API.get("/summary/categories").then((res) => setData(res.data));
  }, []);

  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="total_amount"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            label
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Charts;
