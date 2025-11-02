// frontend/src/pages/Polls.jsx
import { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useOutletContext } from "react-router-dom";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import "../styles/pages/Polls.css";

export default function Polls() {
  const { user } = useAuth();
  const { setTitle } = useOutletContext();
  const [polls, setPolls] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [submitting, setSubmitting] = useState(false);

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
    }
  };

  const handleVote = async (pollId) => {
    setSubmitting(true);
    try {
      await API.patch(`/polls/${pollId}/vote`, {
        optionDates: selectedDates,
      });
      await fetchPolls();
    } catch (err) {
      alert("Fehler beim Abstimmen: " + err.response?.data?.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = (date) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const activePoll = polls.find((p) => !p.finalizedOption);
  const pastPolls = polls.filter((p) => p.finalizedOption);

  return (
    <div className="polls-page">
      {activePoll && (
        <div className="poll-card poll-active">
          <h3>Wann soll der nächste Abend stattfinden?</h3>
          <div className="poll-options">
            {activePoll.options.map((opt, idx) => {
              const iso = new Date(opt.date).toISOString();
              const isSelected = selectedDates.includes(iso);
              return (
                <div
                  key={idx}
                  className={`poll-option ${isSelected ? "selected" : ""}`}
                  onClick={() => handleToggle(iso)}
                >
                  <div className="option-date">
                    <CalendarDays size={16} />
                    {new Date(opt.date).toLocaleString("de-CH", {
                      weekday: "long",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="option-votes">
                    {opt.votes.length} Stimme{opt.votes.length !== 1 && "n"}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            className="button primary"
            onClick={() => handleVote(activePoll._id)}
            disabled={submitting || selectedDates.length === 0}
          >
            {submitting ? "Speichern..." : "Abstimmen"}
          </button>
        </div>
      )}

      {pastPolls.map((poll) => (
        <div className="poll-card poll-finalized" key={poll._id}>
          <h3>
            Termin für Abend am{" "}
            {new Date(poll.finalizedOption).toLocaleDateString("de-CH", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </h3>
          <div className="poll-options">
            {poll.options.map((opt, idx) => (
              <div
                key={idx}
                className={`poll-option finalized ${
                  new Date(opt.date).toISOString() ===
                  new Date(poll.finalizedOption).toISOString()
                    ? "chosen"
                    : ""
                }`}
              >
                <div className="option-date">
                  <CalendarDays size={16} />
                  {new Date(opt.date).toLocaleString("de-CH", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                </div>
                <div className="option-votes">
                  {opt.date === poll.finalizedOption ? (
                    <>
                      Gewählt mit {opt.votes.length} Stimme
                      {opt.votes.length !== 1 && "n"} <CheckCircle2 size={14} />
                    </>
                  ) : (
                    `${opt.votes.length} Stimmen`
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
