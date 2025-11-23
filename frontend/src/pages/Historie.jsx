// frontend/src/pages/Historie.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useOutletContext } from "react-router-dom";
import API from "../services/api";
import "../styles/pages/Historie.css";
import { MapPin, Users, Trophy } from "lucide-react";

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

  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!selectedYear) return;
    loadYearStats(selectedYear);
  }, [selectedYear]);

  const loadYearStats = async (year) => {
    try {
      const [leaderRes, eveningRes] = await Promise.all([
        API.get(`/stats/leaderboard?year=${year}`),
        API.get(`/stats/evenings?year=${year}`),
      ]);

      const leader = leaderRes.data[0];

      setSummary({
        leaderName: leader?.name || "–",
        leaderPoints: leader?.totalPoints || 0,
        totalEvenings: eveningRes.data.totalEvenings,
        avgParticipants: eveningRes.data.avgParticipants,
        organizerNames: Object.keys(eveningRes.data.organizers || {}).map(
          (id) => {
            const eve = grouped[year]?.find((e) => e.organizerId === id);
            return eve?.spielleiterRef?.displayName || "Unbekannt";
          }
        ),
      });
    } catch (err) {
      console.error("Fehler beim Laden der Jahresstatistik:", err);
    }
  };

  return (
    <div className="historie-page">
      {/* Tabs für Jahresauswahl */}
      <div className="historie-year-selector">
        {years.length === 0 && !loading && (
          <p className="history-empty">Keine archivierten Abende.</p>
        )}
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
              {!summary ? (
                <p>Daten werden geladen...</p>
              ) : (
                <>
                  {/* HERO: Jahressieger */}
                  <div className="year-winner-hero">
                    <Trophy size={36} className="year-winner-icon" />
                    <div className="year-winner-text">
                      <span className="winner-label">Jahressieger</span>
                      <span className="winner-name">{summary.leaderName}</span>
                      <span className="winner-points">
                        {summary.leaderPoints} Punkte
                      </span>
                    </div>
                  </div>

                  {/* Kleinere restliche Werte */}
                  <div className="year-summary-grid">
                    <div className="summary-item">
                      <span className="label">Spieleabende</span>
                      <span className="value">{summary.totalEvenings}</span>
                    </div>

                    <div className="summary-item">
                      <span className="label">Ø Teilnehmer</span>
                      <span className="value">{summary.avgParticipants}</span>
                    </div>

                    <div className="summary-item">
                      <span className="label">Organisatoren</span>
                      <span className="value">
                        {summary.organizerNames?.join(", ") || "–"}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {evenings.map((e) => (
              <div key={e._id} className="history-card card">
                {/* Datum */}
                <div className="history-date">
                  <strong>
                    {new Date(e.date).toLocaleDateString("de-CH", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </div>

                {/* Infos */}
                <div className="history-info">
                  <div className="history-row">
                    <Users size={18} />
                    <span>{e.participantRefs?.length || 0} Teilnehmer</span>
                  </div>

                  <div className="history-row">
                    <MapPin size={18} />
                    <span>
                      Spielleiter: {e.spielleiterRef?.displayName || "?"}
                    </span>
                  </div>

                  <div className="history-row">
                    <Trophy size={18} color="var(--accent)" />
                    <span>
                      Tagessieger:{" "}
                      {e.winnerIds
                        ?.map((id) => {
                          const p = e.participantRefs?.find(
                            (x) => x._id === id
                          );
                          return p?.displayName || "?";
                        })
                        .join(", ") || "–"}
                    </span>
                  </div>
                </div>

                {/* Button */}
                <button
                  className="button secondary history-btn"
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
