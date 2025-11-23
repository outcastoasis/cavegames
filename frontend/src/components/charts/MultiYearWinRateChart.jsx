import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function MultiYearWinRateChart({ years, byYear }) {
  if (!years?.length) return null;

  const data = years.map((year) => ({
    year,
    winRate: byYear[year]?.winRate ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
        <Tooltip formatter={(v) => [`${v}%`, "Gewinnrate"]} />
        <Line
          type="monotone"
          dataKey="winRate"
          stroke="var(--secondary)"
          strokeWidth={3}
          dot={{ r: 4, strokeWidth: 2 }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
