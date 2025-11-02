// frontend/src/pages/AbendDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  Trophy,
  PlusCircle,
  CalendarClock,
  Users as UsersIcon,
  Image as ImageIcon,
} from "lucide-react";
import "../styles/pages/AbendDetail.css";
import PollCreateModal from "../components/forms/PollCreateModal";

export default function AbendDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [abend, setAbend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPollModal, setShowPollModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await API.get(`/evenings/${id}`);
        setAbend(res.data);
      } catch (err) {
        console.error("Fehler beim Laden des Abends:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <p className="info-text">Lade Abenddetails...</p>;
  if (!abend) return <p className="info-text">Abend nicht gefunden.</p>;

  const isAdmin = user?.role === "admin";
  const isSpielleiter =
    user?._id &&
    abend.spielleiterRef?._id &&
    user._id === abend.spielleiterRef._id;

  return (
    <div className="abend-detail-page">
      <button className="back-button" onClick={() => navigate("/abende")}>
        <ArrowLeft size={18} /> Zurück
      </button>

      <div className="abend-details card">
        <h2 className="abend-title">
          Spieleabend –{" "}
          {abend.date
            ? new Date(abend.date).toLocaleDateString("de-CH")
            : "Umfrage läuft..."}
        </h2>
        <p>
          <strong>Spielleiter:</strong> {abend.spielleiterRef?.displayName}
        </p>
        <p>
          <strong>Ort:</strong> bei {abend.spielleiterRef?.displayName}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span className={`badge status-${abend.status}`}>{abend.status}</span>
        </p>

        {abend.status === "abgeschlossen" && (
          <span className="tagessieger">
            <Trophy size={16} /> Tagessieger: ...
          </span>
        )}

        <div className="detail-section">
          <h3>
            <UsersIcon size={16} /> Teilnehmer
          </h3>
          <ul className="teilnehmer-liste">
            {abend.participantRefs?.map((p) => (
              <li key={p._id}>{p.displayName}</li>
            ))}
          </ul>
        </div>

        <div className="detail-section">
          <h3>
            <CalendarClock size={16} /> Gespielte Spiele
          </h3>
          {abend.games.length === 0 ? (
            <p className="info-text">Noch keine Spiele erfasst.</p>
          ) : (
            abend.games.map((game, idx) => (
              <div key={idx} className="spiel-card">
                <h4>{game.gameName}</h4>
                <p className="info">Max. Punkte: {game.maxPoints}</p>
                <ul className="punkte-liste">
                  {game.scores.map((s, i) => (
                    <li key={i}>
                      {s.userName} – {s.points} Punkte
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {abend.groupPhotoUrl && (
          <div className="detail-section">
            <h3>
              <ImageIcon size={16} /> Gruppenfoto
            </h3>
            <img
              src={abend.groupPhotoUrl}
              alt="Gruppenfoto"
              className="image-preview"
            />
          </div>
        )}

        {(isAdmin || isSpielleiter) && (
          <div className="abend-actions">
            <button className="button secondary">
              <PlusCircle size={16} /> Spiel hinzufügen
            </button>
            {isSpielleiter && abend.status === "offen" && !abend.pollId && (
              <button
                className="button primary"
                onClick={() => setShowPollModal(true)}
              >
                <CalendarClock size={16} /> Umfrage erstellen
              </button>
            )}
          </div>
        )}
        {showPollModal && (
          <PollCreateModal
            eveningId={abend._id}
            onClose={() => setShowPollModal(false)}
            onSuccess={() => window.location.reload()} // optional
          />
        )}
      </div>
    </div>
  );
}
