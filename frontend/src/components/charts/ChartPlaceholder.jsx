// src/components/charts/ChartPlaceholder.jsx
import "../../styles/components/ChartPlaceholder.css";

export default function ChartPlaceholder({ text = "Keine Daten" }) {
  return (
    <div className="chart-placeholder">
      <p>{text}</p>
    </div>
  );
}
