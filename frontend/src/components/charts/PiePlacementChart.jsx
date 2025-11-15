// src/components/charts/PiePlacementChart.jsx
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export default function PiePlacementChart({ data }) {
  const pieData = [
    { name: "1. Platz", value: data.firstPlaces },
    { name: "2. Platz", value: data.secondPlaces },
    { name: "3. Platz", value: data.thirdPlaces },
    { name: "Andere", value: data.otherPlaces },
  ];

  const COLORS = [
    "var(--accent)",
    "var(--secondary)",
    "var(--primary-light)",
    "var(--neutral-dark)",
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {pieData.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
