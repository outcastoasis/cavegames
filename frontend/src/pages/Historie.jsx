// frontend/src/pages/Historie.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useOutletContext } from "react-router-dom";
import API from "../services/api";
import "../styles/pages/Historie.css";

export default function Historie() {
  const { setTitle } = useOutletContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    setTitle("Historie");
    fetchArchived();
  }, []);

  const fetchArchived = async () => {
    try {
      // ✅ Neue Route
      const res = await API.get("/evenings/archived");

      // Gruppierung nach Spieljahr
      const groupedByYear = {};
      res.data.forEach((e) => {
        const year = e.spieljahr;
        if (!groupedByYear[year]) groupedByYear[year] = [];
        groupedByYear[year].push(e);
      });

      setGrouped(groupedByYear);

      // Neueste Jahr automatisch aktiv setzen
      const sortedYears = Object.keys(groupedByYear)
        .map(Number)
        .sort((a, b) => b - a);

      setSelectedYear(sortedYears[0] || null);
    } catch (err) {
      console.error("Fehler beim Laden der Historie:", err);
    } finally {
      setLoading(false);
    }
  };

  const years = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  const evenings = grouped[selectedYear] || [];

  return (
    <div className="historie-page">
      {/* Tabs für Jahresauswahl */}
      <div className="historie-year-selector">
        {years.length === 0 && !loading && <p>Keine archivierten Abende.</p>}
        {years.map((y) => (
          <button
            key={y}
            className={`year-tab ${y === selectedYear ? "active" : ""}`}
            onClick={() => setSelectedYear(y)}
          >
            {y}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Lade Abende...</p>
      ) : (
        selectedYear && (
          <>
            {/* Jahres‑Zusammenfassung – bleibt vorerst statisch */}
            <div className="year-summary card">
              <h3>Spieljahr {selectedYear} – Zusammenfassung</h3>
              <p>
                <strong>Jahressieger:</strong> Lisa (128 Punkte)
              </p>
              <p>
                <strong>Spieleabende:</strong> {evenings.length}
              </p>
              <p>
                <strong>Meiste Siege:</strong> Max (3 Abende gewonnen)
              </p>
              <p>
                <strong>Organisatoren:</strong> Lisa, Tom, Anna
              </p>
            </div>

            {evenings.map((e) => (
              <div key={e._id} className="card abend-history-card">
                <div className="abend-history-header">
                  <strong>
                    {e.date
                      ? new Date(e.date).toLocaleDateString("de-CH", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "Kein Datum"}
                  </strong>
                </div>

                <p>Spielleiter: {e.spielleiterRef?.displayName || "?"}</p>
                <p>Teilnehmer: {e.participantRefs?.length || 0}</p>
                <p>Tagessieger: Lisa</p>

                <button
                  className="button secondary"
                  onClick={() => navigate(`/abende/${e._id}`)}
                >
                  Abend anzeigen
                </button>
              </div>
            ))}
          </>
        )
      )}
    </div>
  );
}
