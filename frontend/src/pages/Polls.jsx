// frontend/src/pages/Polls.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/pages/Polls.css";
import { CalendarClock } from "lucide-react";

export default function Polls() {
  const [evenings, setEvenings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/evenings")
      .then((res) => setEvenings(res.data))
      .catch((err) => console.error("Fehler beim Laden:", err));
  }, []);

  const offeneUmfragen = evenings.filter(
    (e) => e.status === "offen" && e.pollId
  );

  const fixierteAbende = evenings.filter((e) => e.status === "fixiert");

  return (
    <div className="polls-page">
      <h2>🗳️ Offene Umfragen</h2>

      {offeneUmfragen.length === 0 ? (
        <p className="info-text">Keine offenen Umfragen.</p>
      ) : (
        offeneUmfragen.map((abend) => (
          <div key={abend._id} className="poll-card">
            <h3>🗓️ Umfrage für Spieljahr {abend.spieljahr}</h3>
            <ul className="option-liste">
              {abend.pollId?.options?.map((opt, i) => (
                <li key={i}>
                  <CalendarClock size={14} />
                  {new Date(opt.date).toLocaleString("de-CH", {
                    weekday: "long",
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <span className="stimmen">
                    {opt.votes?.length || 0} Stimme
                    {opt.votes?.length === 1 ? "" : "n"}
                  </span>
                </li>
              ))}
            </ul>
            <button
              className="button primary"
              onClick={() => navigate(`/umfragen/${abend.pollId._id}`)}
            >
              Abstimmen
            </button>
          </div>
        ))
      )}

      <h2>📌 Fixierte Termine</h2>
      {fixierteAbende.length === 0 ? (
        <p className="info-text">Noch keine fixierten Termine.</p>
      ) : (
        fixierteAbende.map((abend) => (
          <div key={abend._id} className="poll-card fixed">
            <h3>Termin für {abend.spieljahr}</h3>
            <p>
              <CalendarClock size={14} />
              {new Date(abend.date).toLocaleString("de-CH", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
