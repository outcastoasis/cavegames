import { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useOutletContext } from "react-router-dom";
import { CalendarDays, CheckCircle2, Lock } from "lucide-react";
import "../styles/pages/Polls.css";
import Toast from "../components/ui/Toast";

export default function Polls() {
  const { user } = useAuth();
  const { setTitle } = useOutletContext();
  const [polls, setPolls] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    setTitle("Umfragen");
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const res = await API.get("/polls");
      setPolls(res.data);
    } catch (err) {
      console.error("Fehler beim Laden der Umfragen:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (date) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const handleVote = async (pollId) => {
    if (selectedDates.length === 0) return;
    setSubmitting(true);
    try {
      await API.patch(`/polls/${pollId}/vote`, { optionDates: selectedDates });
      await fetchPolls();
      showToast("Deine Stimme wurde gespeichert.");
    } catch (err) {
      showToast(
        "Fehler beim Abstimmen: " + (err.response?.data?.error || err.message)
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalize = async (pollId, date) => {
    if (
      !confirm(
        "Termin wirklich fixieren? Danach ist keine Abstimmung mehr möglich."
      )
    )
      return;
    setFinalizing(true);
    try {
      await API.patch(`/polls/${pollId}/finalize`, { finalizedDate: date });
      await fetchPolls();
      showToast("Termin erfolgreich fixiert.");
    } catch (err) {
      showToast(
        "Fehler beim Finalisieren: " +
          (err.response?.data?.error || err.message)
      );
    } finally {
      setFinalizing(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2500);
  };

  if (loading) return <p className="text-center">Lade Umfragen...</p>;

  const activePoll = polls.find((p) => !p.finalizedOption);
  const pastPolls = polls.filter((p) => p.finalizedOption);

  return (
    <div className="polls-page">
      {/* === Aktive Umfrage === */}
      {activePoll ? (
        <div className="poll-card poll-active">
          <h3>Wann soll der nächste Abend stattfinden?</h3>

          <div className="poll-options">
            {activePoll.options.map((opt, idx) => {
              const iso = new Date(opt.date).toISOString();
              const isSelected = selectedDates.includes(iso);
              const totalVotes = activePoll.options.reduce(
                (sum, o) => sum + o.votes.length,
                0
              );
              const percentage = totalVotes
                ? Math.round((opt.votes.length / totalVotes) * 100)
                : 0;

              return (
                <div
                  key={idx}
                  className={`poll-option ${isSelected ? "selected" : ""}`}
                  onClick={() => handleToggle(iso)}
                >
                  <div className="option-date">
                    <CalendarDays size={16} />
                    {new Date(opt.date).toLocaleString("de-CH", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  <div className="option-progress">
                    <div
                      className="progress-bar"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  <div className="option-votes">
                    {opt.votes.length} Stimme{opt.votes.length !== 1 && "n"}
                  </div>

                  {/* Nur Spielleiter darf fixieren */}
                  {user?._id === activePoll.eveningId?.spielleiterId && (
                    <button
                      className="button accent finalize-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFinalize(activePoll._id, opt.date);
                      }}
                      disabled={finalizing}
                    >
                      <Lock size={14} />
                      Termin fixieren
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {user && (
            <button
              className="button primary vote-btn"
              onClick={() => handleVote(activePoll._id)}
              disabled={submitting || selectedDates.length === 0}
            >
              {submitting ? "Speichern..." : "Abstimmen"}
            </button>
          )}
        </div>
      ) : (
        <div className="no-poll">
          <p>Aktuell ist keine aktive Umfrage vorhanden.</p>
        </div>
      )}

      {/* === Vergangene / fixierte Umfragen === */}
      {pastPolls.length > 0 && (
        <div className="past-polls">
          <h3>Abgeschlossene Umfragen</h3>
          {pastPolls.map((poll) => (
            <div className="poll-card poll-finalized" key={poll._id}>
              <h4>
                Fixierter Termin:
                <br />
                <span className="finalized-date">
                  {new Date(poll.finalizedOption).toLocaleDateString("de-CH", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </span>
              </h4>

              <div className="poll-options">
                {poll.options.map((opt, idx) => {
                  const isFinal =
                    new Date(opt.date).toISOString() ===
                    new Date(poll.finalizedOption).toISOString();
                  return (
                    <div
                      key={idx}
                      className={`poll-option finalized ${
                        isFinal ? "chosen" : ""
                      }`}
                    >
                      <div className="option-date">
                        <CalendarDays size={16} />
                        {new Date(opt.date).toLocaleString("de-CH", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="option-votes">
                        {isFinal ? (
                          <>
                            Gewählt mit {opt.votes.length} Stimme
                            {opt.votes.length !== 1 && "n"}{" "}
                            <CheckCircle2 size={14} />
                          </>
                        ) : (
                          `${opt.votes.length} Stimmen`
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}
    </div>
  );
}
