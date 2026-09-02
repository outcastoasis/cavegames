import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function BarYearComparison({ years, byYear }) {
  if (!years?.length) return null;

  const data = years.map((year) => ({
    year,
    first: byYear[year]?.firstPlaces ?? 0,
    second: byYear[year]?.secondPlaces ?? 0,
    third: byYear[year]?.thirdPlaces ?? 0,
    other: byYear[year]?.otherPlaces ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />

        <Bar dataKey="first" stackId="a" fill="var(--color-warning)" name="1. Platz" />
        <Bar
          dataKey="second"
          stackId="a"
          fill="var(--color-text-muted)"
          name="2. Platz"
        />
        <Bar
          dataKey="third"
          stackId="a"
          fill="var(--color-primary)"
          name="3. Platz"
        />
        <Bar
          dataKey="other"
          stackId="a"
          fill="var(--color-border-strong)"
          name="Andere"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
