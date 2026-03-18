import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const sampleHistory = [
  { date: "2026-03-10", wake_time: 450, steps: 1200 },
  { date: "2026-03-11", wake_time: 460, steps: 1000 },
  { date: "2026-03-12", wake_time: 430, steps: 1300 },
  { date: "2026-03-13", wake_time: 440, steps: 1250 }
];

export default function History() {
  return (
    <div className="mb-6 p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">History</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={sampleHistory}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="wake_time" stroke="#8884d8" />
          <Line type="monotone" dataKey="steps" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}