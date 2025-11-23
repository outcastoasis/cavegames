// src/components/charts/ActivityHeatmap.jsx

import "../../styles/components/ActivityHeatmap.css";

export default function ActivityHeatmap({ years, byYear }) {
  if (!years?.length) return null;

  // Sortiere aufsteigend, damit Heatmap nach Jahr steigt
  const sortedYears = [...years].sort((a, b) => a - b);

  return (
    <div className="activity-heatmap">
      {sortedYears.map((year) => {
        const y = byYear[year];
        const total = y?.totalPossibleEvenings ?? 0;
        const attended = y?.eveningsAttended ?? 0;

        // Kacheln erzeugen: eine pro möglichem Abend
        const tiles = Array.from({ length: total }).map((_, i) => {
          const isAttended = i < attended;
          return (
            <div
              key={i}
              className={`heatmap-tile ${isAttended ? "active" : "inactive"}`}
            />
          );
        });

        return (
          <div key={year} className="heatmap-year-block">
            <div className="heatmap-year-label">{year}</div>
            <div className="heatmap-row">{tiles}</div>
            <div className="heatmap-info">
              {attended}/{total} Abende
            </div>
          </div>
        );
      })}
    </div>
  );
}
