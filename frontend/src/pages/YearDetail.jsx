// src/pages/YearDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import {
  CalendarDays,
  MapPinHouse,
  Users,
  Gamepad2,
  ArrowLeft,
  Trash2,
  Info,
} from "lucide-react";
import "../styles/pages/YearDetail.css";

export default function YearDetail() {
  const { user } = useAuth();
  const { year } = useParams();
  const navigate = useNavigate();
  const { setTitle } = useOutletContext();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(`Jahr ${year}`);
    setLoading(true);
    fetchYearData();
  }, [year]);

  const fetchYearData = async () => {
    try {
      const res = await API.get(`/years/${year}`);
      setData(res.data);
      setError("");
    } catch (err) {
      console.error("Fehler beim Laden der Jahresdaten:", err);
      setError("Fehler beim Laden der Jahresdaten");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvening = async (eveningId) => {
    const ok = window.confirm(
      "Willst du diesen Abend wirklich löschen? Umfrage und Statistiken fuer dieses Jahr werden entsprechend aktualisiert."
    );
    if (!ok) return;

    setDeletingId(eveningId);
    setError("");

    try {
      await API.delete(`/evenings/${eveningId}`);
      await fetchYearData();
    } catch (err) {
      setError(err?.response?.data?.error || "Fehler beim Löschen des Abends");
    } finally {
      setDeletingId(null);
    }
  };

  if (!user || user.role !== "admin") return <p>Kein Zugriff</p>;
  if (loading) return <p>Lade Daten...</p>;
  if (!data) return <p>Keine Daten gefunden.</p>;

  const { year: yearObj, evenings } = data;

  return (
    <div className="year-detail-page">
      <div className="year-detail-top">
        <div className="year-detail-top-left">
          <h2 className="year-detail-title">Jahr {yearObj.year}</h2>

          {yearObj.closed ? (
            <span className="year-detail-pill year-detail-pill-closed">
              <Info size={14} />
              Abgeschlossen am{" "}
              {new Date(yearObj.closedAt).toLocaleDateString("de-CH")}
            </span>
          ) : (
            <span className="year-detail-pill year-detail-pill-open">
              <Info size={14} />
              Noch offen
            </span>
          )}
        </div>

        <button
          className="button neutral year-detail-back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} /> Zurück
        </button>
      </div>

      {error && <div className="alert error year-detail-alert">{error}</div>}

      {evenings.length === 0 ? (
        <p className="year-detail-empty">Keine Abende in diesem Jahr.</p>
      ) : (
        <div className="year-detail-list">
          {evenings.map((abend) => (
            <div
              key={abend._id}
              className={`card year-detail-card status-${abend.status}`}
              onClick={(e) => {
                if (e.target.closest(".year-detail-actions")) return;
                navigate(`/abende/${abend._id}`);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate(`/abende/${abend._id}`);
              }}
            >
              <div className="year-detail-card-header">
                <div className="year-detail-date">
                  <CalendarDays size={16} />
                  {abend.date
                    ? new Date(abend.date).toLocaleDateString("de-CH", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })
                    : "Datum offen"}
                </div>

                <span className={`badge-abende status-${abend.status}`}>
                  {String(abend.status || "").toUpperCase()}
                </span>
              </div>

              <div className="year-detail-meta">
                <div className="year-detail-meta-item">
                  <MapPinHouse size={16} />
                  {abend.spielleiterRef?.displayName || "—"}
                </div>

                <div className="year-detail-meta-item">
                  <Users size={16} />
                  {abend.participantRefs?.length ?? 0} Teilnehmer
                </div>

                <div className="year-detail-meta-item">
                  <Gamepad2 size={16} />
                  {abend.games?.length ?? 0} Spiele
                </div>
              </div>

              <div
                className="year-detail-actions"
                onClick={(e) => e.stopPropagation()}
              >
                {!yearObj.closed && (
                  <button
                    className="button danger small"
                    onClick={() => handleDeleteEvening(abend._id)}
                    disabled={deletingId === abend._id}
                    title="Abend löschen"
                  >
                    <Trash2 size={16} />
                    {deletingId === abend._id ? "Lösche..." : "Löschen"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
