import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useOutletContext } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Lock,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import Toast from "../components/ui/Toast";
import "../styles/pages/AdminPolls.css";

export default function AdminPolls() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setTitle } = useOutletContext();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    setTitle("Umfragenverwaltung");
    fetchPolls();
  }, [setTitle]);

  const activePolls = useMemo(
    () => polls.filter((poll) => !poll.finalizedOption),
    [polls],
  );
  const finalizedPolls = useMemo(
    () => polls.filter((poll) => poll.finalizedOption),
    [polls],
  );

  const fetchPolls = async () => {
    setLoading(true);
    try {
      const res = await API.get("/polls");
      setPolls(res.data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.error || "Umfragen konnten nicht geladen werden",
      );
    } finally {
      setLoading(false);
    }
  };

  const voterNames = (option) =>
    (option.votes || [])
      .map((vote) => (typeof vote === "string" ? vote : vote?.displayName))
      .filter(Boolean)
      .join(", ");

  const formatDate = (dateValue) =>
    new Date(dateValue).toLocaleString("de-CH", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleFinalize = async (pollId, date) => {
    if (!window.confirm("Diesen Termin wirklich fixieren?")) return;
    try {
      await API.patch(`/polls/${pollId}/finalize`, { finalizedDate: date });
      setToast("Termin fixiert");
      await fetchPolls();
    } catch (err) {
      setError(
        err.response?.data?.error || "Umfrage konnte nicht finalisiert werden",
      );
    }
  };

  const handleReopen = async (pollId) => {
    if (!window.confirm("Umfrage wirklich neu öffnen?")) return;
    try {
      await API.patch(`/polls/${pollId}/reopen`);
      setToast("Umfrage neu geöffnet");
      await fetchPolls();
    } catch (err) {
      setError(
        err.response?.data?.error || "Umfrage konnte nicht geöffnet werden",
      );
    }
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm("Umfrage wirklich löschen?")) return;
    try {
      await API.delete(`/polls/${pollId}`);
      setToast("Umfrage gelöscht");
      await fetchPolls();
    } catch (err) {
      setError(
        err.response?.data?.error || "Umfrage konnte nicht gelöscht werden",
      );
    }
  };

  const renderPoll = (poll) => {
    const evening = poll.eveningId;
    return (
      <article key={poll._id} className="card admin-poll-card">
        <div className="admin-poll-header">
          <div>
            <strong>Jahr {evening?.spieljahr || "-"}</strong>
            <div className="admin-poll-meta">
              Status Abend: {evening?.status || "-"}
            </div>
            {poll.finalizedOption && (
              <div className="admin-poll-meta">
                Fixiert: {formatDate(poll.finalizedOption)}
              </div>
            )}
          </div>
          <div className="admin-poll-actions">
            {evening?._id && (
              <button
                className="button neutral small"
                onClick={() => navigate(`/abende/${evening._id}`)}
              >
                Abend
              </button>
            )}
            {poll.finalizedOption ? (
              <button
                className="button neutral small"
                onClick={() => handleReopen(poll._id)}
              >
                <RotateCcw size={16} />
                Neu öffnen
              </button>
            ) : null}
            <button
              className="button danger small"
              onClick={() => handleDelete(poll._id)}
            >
              <Trash2 size={16} />
              Löschen
            </button>
          </div>
        </div>

        <div className="admin-poll-options">
          {poll.options.map((option) => {
            const isFinal =
              poll.finalizedOption &&
              new Date(option.date).toISOString() ===
                new Date(poll.finalizedOption).toISOString();
            return (
              <div
                key={`${poll._id}-${option.date}`}
                className={`admin-poll-option ${isFinal ? "final" : ""}`}
              >
                <div>
                  <div className="admin-poll-option-date">
                    <CalendarDays size={16} />
                    {formatDate(option.date)}
                    {isFinal && <CheckCircle2 size={16} />}
                  </div>
                  <div className="admin-poll-votes">
                    {(option.votes || []).length} Stimmen
                    {voterNames(option) ? `: ${voterNames(option)}` : ""}
                  </div>
                </div>
                {!poll.finalizedOption && (
                  <button
                    className="button primary small"
                    onClick={() => handleFinalize(poll._id, option.date)}
                  >
                    <Lock size={16} />
                    Fixieren
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </article>
    );
  };

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-polls-page">
      {loading ? (
        <p>Lade Umfragen...</p>
      ) : (
        <>
          <section className="admin-polls-section">
            <h2>Aktive Umfragen</h2>
            {activePolls.length ? (
              activePolls.map(renderPoll)
            ) : (
              <p>Keine aktiven Umfragen.</p>
            )}
          </section>

          <section className="admin-polls-section">
            <h2>Abgeschlossene Umfragen</h2>
            {finalizedPolls.length ? (
              finalizedPolls.map(renderPoll)
            ) : (
              <p>Keine abgeschlossenen Umfragen.</p>
            )}
          </section>
        </>
      )}

      {error && <Toast message={error} onClose={() => setError("")} />}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
