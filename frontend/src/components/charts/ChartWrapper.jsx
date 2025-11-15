// src/components/charts/ChartWrapper.jsx
import "../../styles/components/ChartWrapper.css";

export default function ChartWrapper({ title, children }) {
  return (
    <div className="chart-card">
      {title && <h3 className="chart-title">{title}</h3>}
      <div className="chart-inner">{children}</div>
    </div>
  );
}
