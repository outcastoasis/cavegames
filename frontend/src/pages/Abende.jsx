// src/pages/Abende.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useOutletContext } from "react-router-dom";
import API from "../services/api";
import {
  CalendarDays,
  Users,
  Gamepad2,
  Calendar,
  MapPinHouse,
  XCircle,
} from "lucide-react";
import "../styles/pages/Abende.css";
import EveningCreateModal from "../components/forms/EveningCreateModal";
import PollCreateModal from "../components/forms/PollCreateModal";

export default function Abende() {
  const { user } = useAuth();
  const { setTitle } = useOutletContext();
  const navigate = useNavigate();

  const [evenings, setEvenings] = useState({
    todayEvening: null,
    nextEvening: null,
    future: [],
    past: [],
    openWithoutPoll: [],
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPollEveningId, setSelectedPollEveningId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle("Abende");
    fetchEvenings();
  }, []);

  const fetchEvenings = async () => {
    try {
      const res = await API.get("/evenings");
      const active = res.data.filter((e) => e.status !== "gesperrt");

      const todayStr = new Date().toDateString();
      const now = new Date();

      const past = [];
      const future = [];
      let todayEvening = null;
      let nextEvening = null;
      let openWithoutPoll = [];
      let withOpenPoll = [];

      active.forEach((e) => {
        if (!e.date) return;
        const eDate = new Date(e.date);
        const eStr = eDate.toDateString();

        if (eStr === todayStr) {
          todayEvening = e;
        } else if (eDate > now) {
          future.push(e);
        } else {
          past.push(e);
        }
      });

      // 🔧 Diese Schleife muss *außerhalb* der oberen forEach stehen:
      active.forEach((e) => {
        if (e.status === "offen" && !e.date && !e.pollId) {
          openWithoutPoll.push(e);
        }

        // NEU: Abende mit offener Umfrage
        if (e.status === "offen" && !e.date && e.pollId) {
          withOpenPoll.push(e);
        }
      });

      future.sort((a, b) => new Date(a.date) - new Date(b.date));
      past.sort((a, b) => new Date(b.date) - new Date(a.date));

      if (!todayEvening && future.length > 0) {
        nextEvening = future.shift();
      }

      setEvenings({
        todayEvening,
        nextEvening,
        future,
        past,
        openWithoutPoll,
        withOpenPoll,
      });
    } catch (err) {
      console.error("Fehler beim Laden der Abende:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (eveningId) => {
    if (busy) return;
    setBusy(true);
    try {
      await API.post(`/evenings/${eveningId}/participants`);
      await fetchEvenings();
    } catch (err) {
      alert(
        "Fehler beim Beitreten: " + (err.response?.data?.error || err.message)
      );
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async (eveningId) => {
    if (busy) return;
    setBusy(true);
    try {
      await API.delete(`/evenings/${eveningId}/participants/${user._id}`);
      await fetchEvenings();
    } catch (err) {
      alert(
        "Fehler beim Verlassen: " + (err.response?.data?.error || err.message)
      );
    } finally {
      setBusy(false);
    }
  };

  const calculateDaysLeft = (dateStr) => {
    const now = new Date();
    const target = new Date(dateStr);
    const diffTime = target - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderEveningCard = (abend) => {
    const isFixiert = abend.status === "fixiert";
    const isOffen = abend.status === "offen";
    const isToday =
      abend.date &&
      new Date(abend.date).toDateString() === new Date().toDateString();
    const isSpielleiter = user?._id === abend.spielleiterRef?._id;
    const isTeilnehmer = abend.participantRefs?.some((p) => p._id === user._id);
    const hasPoll = !!abend.pollId;
    const hasOpenPoll = abend.status === "offen" && !abend.date && abend.pollId;

    return (
      <div key={abend._id}>
        <div
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
            {isFixiert && !isToday && (
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
                    disabled={busy}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-text">
                    {isTeilnehmer ? "Dabei" : "Weg"}
                  </span>
                </label>
              </div>
            )}

            {isSpielleiter && isOffen && !hasPoll && (
              <button
                className="button secondary small"
                onClick={() => setSelectedPollEveningId(abend._id)}
              >
                <Calendar size={14} /> Umfrage erstellen
              </button>
            )}
          </div>
        </div>

        {selectedPollEveningId === abend._id && (
          <PollCreateModal
            eveningId={abend._id}
            onClose={() => setSelectedPollEveningId(null)}
            onSuccess={() => {
              setSelectedPollEveningId(null);
              navigate("/umfragen");
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="abende-page">
      {user?.role === "admin" && (
        <div className="abende-header">
          <button className="button primary" onClick={() => setShowModal(true)}>
            + Neuer Abend
          </button>
        </div>
      )}

      {loading ? (
        <p>Lade Abende...</p>
      ) : (
        <div className="abend-list">
          {evenings.openWithoutPoll.length > 0 && (
            <div>
              <h3>Abende ohne Umfrage</h3>
              {evenings.openWithoutPoll.map(renderEveningCard)}
            </div>
          )}

          {evenings.withOpenPoll?.length > 0 && (
            <div>
              <h3>Abende mit offener Umfrage</h3>
              {evenings.withOpenPoll.map(renderEveningCard)}
            </div>
          )}
          {evenings.todayEvening && (
            <div className="card abend-highlight">
              <h3>Heute Abend!</h3>
              {renderEveningCard(evenings.todayEvening)}
            </div>
          )}

          {evenings.nextEvening && (
            <div className="card abend-highlight">
              <h3>
                Nächster Spieleabend in{" "}
                {calculateDaysLeft(evenings.nextEvening.date)} Tagen
              </h3>
              {renderEveningCard(evenings.nextEvening)}
            </div>
          )}

          {evenings.future.length > 0 && (
            <div>
              <h3>Bevorstehend</h3>
              {evenings.future.map(renderEveningCard)}
            </div>
          )}

          {evenings.past.length > 0 && (
            <div>
              <h3>Vergangene Abende</h3>
              {evenings.past.map(renderEveningCard)}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <EveningCreateModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchEvenings}
        />
      )}
    </div>
  );
}
