import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useOutletContext } from "react-router-dom";
import {
  CalendarPlus,
  CalendarDays,
  CheckCircle2,
  Lock,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import Toast from "../components/ui/Toast";
import PollCreateModal from "../components/forms/PollCreateModal";
import "../styles/pages/AdminPolls.css";
import {
  formatSwissDate,
  formatSwissDateTime,
} from "../utils/swissDateTime";

export default function AdminPolls() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setTitle } = useOutletContext();
  const [polls, setPolls] = useState([]);
  const [eveningsWithoutPoll, setEveningsWithoutPoll] = useState([]);
  const [selectedPollEveningId, setSelectedPollEveningId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    setTitle("Umfragenverwaltung");
    fetchPolls();
  }, [setTitle]);

  const getSortedOptions = (poll) =>
    [...(poll.options || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  const getPollStartDate = (poll) => getSortedOptions(poll)[0]?.date || poll.createdAt;

  const activePolls = useMemo(
    () =>
      polls
        .filter((poll) => !poll.finalizedOption)
        .sort((a, b) => new Date(getPollStartDate(a)) - new Date(getPollStartDate(b))),
    [polls],
  );
  const finalizedPolls = useMemo(
    () =>
      polls
        .filter((poll) => poll.finalizedOption)
        .sort((a, b) => new Date(b.finalizedOption) - new Date(a.finalizedOption)),
    [polls],
  );

  const fetchPolls = async () => {
    setLoading(true);
    try {
      const [pollsRes, eveningsRes] = await Promise.all([
        API.get("/polls"),
        API.get("/evenings"),
      ]);
      const pollsData = pollsRes.data;
      const pollEveningIds = new Set(
        pollsData
          .map((poll) =>
            typeof poll.eveningId === "string"
              ? poll.eveningId
              : poll.eveningId?._id,
          )
          .filter(Boolean),
      );
      const missingPollEvenings = eveningsRes.data
        .filter(
          (evening) =>
            evening.status === "offen" &&
            !evening.date &&
            !evening.pollId &&
            !pollEveningIds.has(evening._id),
        )
        .sort((a, b) => Number(a.spieljahr || 0) - Number(b.spieljahr || 0));

      setPolls(pollsData);
      setEveningsWithoutPoll(missingPollEvenings);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.error || "Umfragen konnten nicht geladen werden",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePollCreated = async () => {
    setToast("Umfrage erstellt");
    await fetchPolls();
  };

  const voterNames = (option) =>
    (option.votes || [])
      .map((vote) => (typeof vote === "string" ? vote : vote?.displayName))
      .filter(Boolean)
      .join(", ");

  const formatDate = (dateValue) =>
    formatSwissDateTime(dateValue, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDateOnly = (dateValue) =>
    formatSwissDate(dateValue, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getPollTitle = (poll) => {
    const options = getSortedOptions(poll);
    const firstDate = options[0]?.date;
    const lastDate = options[options.length - 1]?.date;

    if (!firstDate) return `Terminumfrage ${poll.eveningId?.spieljahr || ""}`.trim();

    const dateLabel =
      firstDate === lastDate
        ? formatDateOnly(firstDate)
        : `${formatDateOnly(firstDate)} - ${formatDateOnly(lastDate)}`;

    return `Terminumfrage ${dateLabel}`;
  };

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
    const sortedOptions = getSortedOptions(poll);

    return (
      <article key={poll._id} className="card admin-poll-card">
        <div className="admin-poll-header">
          <div>
            <strong>{getPollTitle(poll)}</strong>
            <div className="admin-poll-meta">
              Jahr {evening?.spieljahr || "-"} | Status Abend:{" "}
              {evening?.status || "-"}
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
          {sortedOptions.map((option) => {
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

  const renderEveningWithoutPoll = (evening) => (
    <article
      key={evening._id}
      className="card admin-poll-card admin-poll-card--missing"
    >
      <div className="admin-poll-header">
        <div>
          <strong>Abend ohne Umfrage</strong>
          <div className="admin-poll-meta">
            Jahr {evening.spieljahr || "-"} | Status Abend: {evening.status}
          </div>
          <div className="admin-poll-meta">
            Spielleiter: {evening.spielleiterRef?.displayName || "-"}
          </div>
        </div>
        <div className="admin-poll-actions">
          <button
            className="button neutral small"
            onClick={() => navigate(`/abende/${evening._id}`)}
          >
            Abend
          </button>
          <button
            className="button primary small"
            onClick={() => setSelectedPollEveningId(evening._id)}
          >
            <CalendarPlus size={16} />
            Umfrage erstellen
          </button>
        </div>
      </div>
      <p className="admin-poll-missing-text">
        Für diesen Abend wurde noch keine Terminumfrage erstellt.
      </p>
    </article>
  );

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
            <h2>Abende ohne Umfrage</h2>
            {eveningsWithoutPoll.length ? (
              eveningsWithoutPoll.map(renderEveningWithoutPoll)
            ) : (
              <p>Keine Abende ohne Umfrage.</p>
            )}
          </section>

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

      {selectedPollEveningId && (
        <PollCreateModal
          eveningId={selectedPollEveningId}
          onClose={() => setSelectedPollEveningId(null)}
          onSuccess={handlePollCreated}
        />
      )}

      {error && <Toast message={error} onClose={() => setError("")} />}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
