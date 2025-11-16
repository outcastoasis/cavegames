// frontend/src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useOutletContext, useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  CalendarDays,
  Users,
  Gamepad2,
  Calendar,
  MapPinHouse,
  Info,
  AlertTriangle,
} from "lucide-react";
import "../styles/pages/Home.css";
import "../styles/pages/Abende.css"; // Re-use Abende Card Styles

export default function Home() {
  const { user } = useAuth();
  const { setTitle } = useOutletContext();
  const navigate = useNavigate();

  const [nextEvening, setNextEvening] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [todayEvening, setTodayEvening] = useState(null);
  const [lastEvening, setLastEvening] = useState(null);
  const [notificationList, setNotificationList] = useState([]);

  useEffect(() => {
    setTitle("Cavegames");
    fetchNextEvening();
  }, []);

  const fetchNextEvening = async () => {
    let active = [];

    try {
      const res = await API.get("/evenings");
      active = res.data.filter((e) => e.status !== "gesperrt");

      const now = new Date();
      const todayStr = now.toDateString();

      let today = null;
      const future = [];
      const past = [];

      active.forEach((e) => {
        if (!e.date) return;
        const eDate = new Date(e.date);
        const eStr = eDate.toDateString();

        if (eStr === todayStr) {
          today = e;
        } else if (eDate > now) {
          future.push(e);
        } else {
          past.push(e);
        }
      });

      future.sort((a, b) => new Date(a.date) - new Date(b.date));
      past.sort((a, b) => new Date(b.date) - new Date(a.date));

      setTodayEvening(today);
      setNextEvening(future[0] || null);
      setLastEvening(past[0] || null);
    } catch (err) {
      console.error("Fehler beim Laden:", err);
    } finally {
      await fetchNotifications(active); // active existiert jetzt sicher
      setLoading(false);
    }
  };

  const handleJoin = async (eveningId) => {
    if (busy) return;
    setBusy(true);
    try {
      await API.post(`/evenings/${eveningId}/participants`);
      fetchNextEvening();
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async (eveningId) => {
    if (busy) return;
    setBusy(true);
    try {
      await API.delete(`/evenings/${eveningId}/participants/${user._id}`);
      fetchNextEvening();
    } finally {
      setBusy(false);
    }
  };

  const calculateDaysLeft = (dateStr) => {
    const now = new Date();
    const target = new Date(dateStr);

    // Uhrzeiten entfernen → reine Kalendertage vergleichen
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const fetchNotifications = async (activeEvenings) => {
    const notes = [];

    // 1) Spielleiter-Benachrichtigung
    activeEvenings.forEach((e) => {
      const isLeader = e.spielleiterRef?._id === user._id;

      if (isLeader && e.status === "offen" && !e.date && !e.pollId) {
        notes.push({
          type: "info",
          text: "Du wurdest als Spielleiter eingeteilt. Bitte erstelle eine Umfrage.",
          target: "/abende",
        });
      }
    });

    // 2) Umfrage-Benachrichtigung
    for (const e of activeEvenings) {
      if (e.status === "offen" && e.pollId && !e.date) {
        try {
          const pollId =
            typeof e.pollId === "string" ? e.pollId : e.pollId?._id;

          if (!pollId) continue;

          const pollRes = await API.get(`/polls/${pollId}`);
          const poll = pollRes.data;

          let hasVoted = false;

          if (Array.isArray(poll.options)) {
            for (const option of poll.options) {
              const optionVotes = Array.isArray(option.votes)
                ? option.votes
                : [];

              if (optionVotes.some((v) => v._id?.toString() === user._id)) {
                hasVoted = true;
                break;
              }
            }
          }

          if (!hasVoted) {
            notes.push({
              type: "warning",
              text: "Neue Termin-Umfrage verfügbar – du hast noch nicht abgestimmt.",
              target: "/umfragen",
            });
          }
        } catch (err) {
          console.error("Fehler beim Laden der Umfrage:", err);
        }
      }
    }

    setNotificationList(notes);
  };

  const renderEveningCard = (abend) => {
    const isFixiert = abend.status === "fixiert";
    const isTeilnehmer = abend.participantRefs?.some((p) => p._id === user._id);
    const hasOpenPoll = abend.status === "offen" && !abend.date && abend.pollId;

    return (
      <div
        key={abend._id}
        className={`card abend-card status-${abend.status}`}
        onClick={(e) => {
          if (e.target.closest(".abend-actions")) return;

          if (hasOpenPoll) {
            navigate("/umfragen");
            return;
          }

          navigate(`/abende/${abend._id}`);
        }}
      >
        <div className="abend-card-header">
          <div className="abend-date">
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
            {abend.status.toUpperCase()}
          </span>
        </div>

        <div className="abend-meta">
          <div className="meta-item">
            <MapPinHouse size={16} />
            {abend.spielleiterRef?.displayName || "—"}
          </div>
          <div className="meta-item">
            <Users size={16} />
            {abend.participantRefs?.length ?? 0} Teilnehmer
          </div>
          <div className="meta-item">
            <Gamepad2 size={16} />
            {abend.games?.length ?? 0} Spiele
          </div>
          <div className="meta-item">
            <Calendar size={16} />
            Jahr {abend.spieljahr}
          </div>
        </div>

        <div className="abend-actions">
          {isFixiert && (
            <div
              className="abend-toggle-wrapper"
              onClick={(e) => e.stopPropagation()}
            >
              <label className="toggle-label small">
                <input
                  type="checkbox"
                  checked={isTeilnehmer}
                  onChange={(e) =>
                    e.target.checked
                      ? handleJoin(abend._id)
                      : handleLeave(abend._id)
                  }
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  {isTeilnehmer ? "Dabei" : "Weg"}
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="abende-page">
      {loading && <p>Lade Daten...</p>}

      <div className="welcome-box">
        <div className="welcome-title">
          Willkommen zurück, {user.displayName}!
        </div>
      </div>

      {notificationList.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          {notificationList.map((n, i) => (
            <div
              key={i}
              className={`dashboard-alert ${n.type}`}
              onClick={() => navigate(n.target)}
            >
              {n.type === "info" && <Info size={20} />}
              {n.type === "warning" && <AlertTriangle size={20} />}
              {n.text}
            </div>
          ))}
        </div>
      )}

      {!loading && todayEvening && (
        <div className="card abend-highlight">
          <h3>Heute Abend!</h3>
          {renderEveningCard(todayEvening)}
        </div>
      )}

      {!loading && nextEvening && (
        <>
          <h3>
            Nächster Spieleabend in {calculateDaysLeft(nextEvening.date)} Tagen
          </h3>
          {renderEveningCard(nextEvening)}
        </>
      )}

      {!loading && lastEvening && (
        <div className="card abend-highlight">
          <h3>Letzter Spieleabend</h3>
          {renderEveningCard(lastEvening)}
        </div>
      )}

      {!loading && !todayEvening && !nextEvening && !lastEvening && (
        <p>Derzeit ist kein kommender Abend geplant.</p>
      )}
    </div>
  );
}
