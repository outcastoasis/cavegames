import Card from "../ui/Card";
import "../../styles/components/ChartWrapper.css";

export default function ChartWrapper({ title, children }) {
  return (
    <Card as="section" className="chart-card" padding="md">
      {title && <h3 className="chart-title">{title}</h3>}
      <div className="chart-inner">{children}</div>
    </Card>
  );
}
