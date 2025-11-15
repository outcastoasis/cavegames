// src/components/charts/LinePointsChart.jsx
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function LinePointsChart({ data }) {
  if (!data?.length) return null;

  const formatted = data.map((e) => ({
    date: new Date(e.date).toLocaleDateString("de-CH", { month: "short" }),
    points: e.points,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={formatted}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis hide />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="points"
          stroke="var(--primary)"
          strokeWidth={3}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
