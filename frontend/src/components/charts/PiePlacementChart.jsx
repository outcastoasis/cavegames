// frontend/src/components/charts/PiePlacementChart.jsx

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

export default function PiePlacementChart({ data }) {
  const pieData = [
    { name: "1. Platz", value: data.firstPlaces },
    { name: "2. Platz", value: data.secondPlaces },
    { name: "3. Platz", value: data.thirdPlaces },
    { name: "Andere", value: data.otherPlaces },
  ];

  const COLORS = [
    "var(--accent)", // Gold / Gelb → 1. Platz
    "var(--secondary)", // Blau → 2. Platz
    "var(--primary-light)", // Lila → 3. Platz
    "var(--neutral-dark)", // Grau → Andere
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="45%"
          innerRadius={40}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {pieData.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>

        {/* LEGENDE */}
        <Legend verticalAlign="bottom" height={36} formatter={(name) => name} />

        <Tooltip formatter={(value) => `${value}x`} />
      </PieChart>
    </ResponsiveContainer>
  );
}
