// src/pages/AbendDetail.jsx
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
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
} from "lucide-react";
import "../styles/pages/AbendDetail.css";
import GameAddModal from "../components/forms/GameAddModal";

export default function AbendDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [abend, setAbend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGameModal, setShowGameModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editScores, setEditScores] = useState(null);
  const [eligibleUsers, setEligibleUsers] = useState([]);

  useEffect(() => {
    fetchAbend();
  }, [id]);

  const fetchAbend = async () => {
    try {
      const res = await API.get(`/evenings/${id}`);
      setAbend(res.data);
      await fetchEligibleUsers();
    } catch (err) {
      console.error("Fehler beim Laden des Abends:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await API.post(`/evenings/${id}/participants`);
      await fetchAbend();
    } catch (err) {
      alert(
        "Fehler beim Beitreten: " + (err.response?.data?.error || err.message)
      );
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await API.delete(`/evenings/${id}/participants/${user._id}`);
      await fetchAbend();
    } catch (err) {
      alert(
        "Fehler beim Verlassen: " + (err.response?.data?.error || err.message)
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteGame = async (gameEntryId) => {
    if (!confirm("Spiel wirklich löschen?")) return;
    try {
      await API.delete(`/evenings/${id}/games/${gameEntryId}`);
      await fetchAbend();
    } catch (err) {
      alert("Fehler beim Löschen des Spiels: " + err.message);
    }
  };

  const handleEditScores = (gameId) => {
    setEditScores(gameId === editScores ? null : gameId);
  };

  const handleScoreChange = (gameId, userId, value) => {
    setAbend((prev) => ({
      ...prev,
      games: prev.games.map((g) =>
        g._id === gameId
          ? {
              ...g,
              scores: g.scores.map((s) =>
                s.userId === userId ? { ...s, points: Number(value) } : s
              ),
            }
          : g
      ),
    }));
  };

  const handleSaveScores = async (gameId) => {
    const game = abend.games.find((g) => g._id === gameId);
    try {
      await API.patch(`/evenings/${id}/games/${gameId}`, {
        scores: game.scores.map((s) => ({
          userId: s.userId,
          points: s.points,
        })),
      });
      setEditScores(null);
      await fetchAbend();
      await API.patch(`/evenings/${id}/recalculate`);
    } catch (err) {
      alert("Fehler beim Speichern der Punkte: " + err.message);
    }
  };

  const handleFinishEvening = async () => {
    if (!confirm("Abend wirklich abschliessen? Punkte werden fixiert.")) return;
    try {
      await API.patch(`/evenings/${id}/status`, { status: "abgeschlossen" });
      await fetchAbend(); // neu laden, jetzt MIT gespeicherten Statistiken
    } catch (err) {
      alert("Fehler beim Abschliessen: " + err.message);
    }
  };

  const fetchEligibleUsers = async () => {
    try {
      const res = await API.get(`/evenings/${id}/eligible-users`);
      setEligibleUsers(res.data);
    } catch (err) {
      console.error("Fehler beim Laden der verfügbaren Benutzer:", err);
    }
  };

  const handleAddParticipant = async (userId) => {
    try {
      await API.post(`/evenings/${id}/participants`, { userId });
      await fetchAbend();
    } catch (err) {
      alert("Fehler beim Hinzufügen: " + err.message);
    }
  };

  const handleRemoveParticipant = async (userId) => {
    if (!confirm("Teilnehmer wirklich entfernen?")) return;
    try {
      await API.delete(`/evenings/${id}/participants/${userId}`);
      await fetchAbend();
    } catch (err) {
      alert("Fehler beim Entfernen: " + err.message);
    }
  };

  if (loading)
    return <p className="abenddetail-loading">Lade Abenddetails...</p>;
  if (!abend) return <p className="abenddetail-error">Abend nicht gefunden.</p>;

  const isAdmin = user?.role === "admin";
  const isSpielleiter = abend.spielleiterRef?._id === user._id;
  const isPrivileged = isAdmin || isSpielleiter;
  const isFixiert = abend.status === "fixiert";
  const isAbgeschlossen = abend.status === "abgeschlossen";
  const isTeilnehmer = abend.participantRefs?.some((p) => p._id === user._id);

  return (
    <div className="abenddetail-container">
      <button
        className="abenddetail-backbutton button neutral"
        onClick={() => navigate("/abende")}
      >
        <ArrowLeft size={18} /> Zurück
      </button>

      <div className="abenddetail-card card">
        <h2 className="abenddetail-title">
          Spieleabend{" "}
          {abend.date
            ? "am " +
              new Date(abend.date).toLocaleDateString("de-CH", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })
            : "– Umfrage läuft"}
        </h2>

        <p>
          <strong>Spielleiter:</strong> {abend.spielleiterRef?.displayName}
        </p>
        <p>
          <strong>Ort:</strong> bei {abend.spielleiterRef?.displayName}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span className={`abenddetail-status ${abend.status}`}>
            {abend.status}
          </span>
        </p>

        {isFixiert && (
          <div className="abenddetail-teilnahme-section">
            <h3 className="abenddetail-section-title">Teilnahmestatus</h3>
            <div className="toggle-wrapper">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={isTeilnehmer}
                  onChange={(e) =>
                    e.target.checked ? handleJoin() : handleLeave()
                  }
                  disabled={busy}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  {isTeilnehmer ? "Ich nehme teil" : "Ich bin weg"}
                </span>
              </label>
            </div>
          </div>
        )}

        {isAbgeschlossen && abend.playerPoints?.length > 0 && (
          <div className="abenddetail-winner alert">
            <Trophy size={16} />
            <span>
              Tagessieger:{" "}
              {abend.winnerIds
                ?.map((wId) => {
                  const winner = abend.participantRefs?.find(
                    (p) => p._id === wId
                  );
                  return winner?.displayName || "Unbekannt";
                })
                .join(", ")}{" "}
              (
              {abend.playerPoints?.find(
                (p) => p.userId === abend.winnerIds?.[0]
              )?.points || 0}{" "}
              Pkt)
            </span>
          </div>
        )}

        {isAbgeschlossen && abend.placements?.length > 0 && (
          <div className="abenddetail-section">
            <h3>
              <Trophy size={16} /> Platzierungen
            </h3>
            <ul className="abenddetail-list">
              {abend.placements.map((p) => {
                const user = abend.participantRefs?.find(
                  (u) => u._id === p.userId
                );
                const points =
                  abend.playerPoints?.find((pt) => pt.userId === p.userId)
                    ?.points || 0;
                return (
                  <li key={p.userId}>
                    {p.place}. Platz – {user?.displayName || "Unbekannt"} (
                    {points} Pkt)
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {isAbgeschlossen && (
          <div className="abenddetail-section">
            <h3>
              <Trophy size={16} /> Abendstatistik
            </h3>
            <ul className="abenddetail-list">
              <li>
                Höchste Einzelpunktzahl:{" "}
                {(() => {
                  const maxScore = abend.maxPoints || 0;
                  const player = abend.games
                    ?.flatMap((g) => g.scores)
                    ?.find((s) => s.points === maxScore);
                  const name =
                    abend.participantRefs?.find((p) => p._id === player?.userId)
                      ?.displayName || "Unbekannt";
                  return `${name} (${maxScore} Pkt)`;
                })()}
              </li>
              <li>
                Spieleanzahl: {abend.gamesPlayedCount || abend.games.length}
              </li>
              <li>
                Meistgespieltes Spiel:{" "}
                {(() => {
                  const mostPlayed =
                    abend.gameCount?.length > 0
                      ? [...abend.gameCount].sort(
                          (a, b) => b.count - a.count
                        )[0]
                      : null;
                  const game = abend.games.find(
                    (g) =>
                      g.gameId?._id === mostPlayed?.gameId ||
                      g.gameId === mostPlayed?.gameId
                  );
                  return game?.gameId?.name
                    ? `${game.gameId.name} (${mostPlayed.count}x)`
                    : "Keine Spiele";
                })()}
              </li>
            </ul>
          </div>
        )}

        <div className="abenddetail-section">
          <h3>
            <UsersIcon size={16} /> Teilnehmer
          </h3>

          {abend.participantRefs?.length ? (
            <ul className="abenddetail-list">
              {abend.participantRefs.map((p) => (
                <li key={p._id}>
                  {p.displayName}
                  {isPrivileged && isFixiert && abend.games.length === 0 && (
                    <button
                      className="abenddetail-remove-button"
                      onClick={() => handleRemoveParticipant(p._id)}
                      title="Teilnehmer entfernen"
                    >
                      <XCircle size={20} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>Noch keine Teilnehmer.</p>
          )}

          {isPrivileged && isFixiert && abend.games.length === 0 && (
            <div className="abenddetail-addparticipant">
              <label>
                Weitere Person hinzufügen:
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      handleAddParticipant(val);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">Bitte wählen...</option>
                  {eligibleUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="abenddetail-section">
          <h3>
            <CalendarClock size={16} /> Gespielte Spiele
          </h3>
          {abend.games.length === 0 ? (
            <p>Noch keine Spiele erfasst.</p>
          ) : (
            abend.games.map((game) => (
              <div key={game._id} className="abenddetail-game card">
                <div className="abenddetail-game-header">
                  <h4>{game.gameId?.name || "Unbekanntes Spiel"}</h4>
                  {((isPrivileged && isFixiert) ||
                    (isAdmin && isAbgeschlossen)) && (
                    <div className="abenddetail-game-actions">
                      <button
                        className="button"
                        onClick={() => handleEditScores(game._id)}
                      >
                        <Edit3 size={14} /> Punkte
                      </button>
                      <button
                        className="button danger"
                        onClick={() => handleDeleteGame(game._id)}
                      >
                        <Trash2 size={14} /> Löschen
                      </button>
                    </div>
                  )}
                </div>

                <ul className="abenddetail-score-list">
                  {game.scores.map((s) => (
                    <li key={s.userId} className="abenddetail-score-item">
                      <span>{s.userName}</span>
                      {editScores === game._id && isPrivileged ? (
                        <input
                          type="number"
                          className="input"
                          value={s.points}
                          onChange={(e) =>
                            handleScoreChange(
                              game._id,
                              s.userId,
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        <span>{s.points} Punkte</span>
                      )}
                    </li>
                  ))}
                </ul>

                {editScores === game._id && isPrivileged && (
                  <button
                    className="button primary"
                    onClick={() => handleSaveScores(game._id)}
                  >
                    Speichern
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {abend.groupPhotoUrl && (
          <div className="abenddetail-section">
            <h3>
              <ImageIcon size={16} /> Gruppenfoto
            </h3>
            <img
              src={abend.groupPhotoUrl}
              alt="Gruppenfoto"
              className="abenddetail-photo"
            />
          </div>
        )}

        {isPrivileged && (
          <div className="abenddetail-actions">
            {abend.status !== "abgeschlossen" && (
              <button
                className="button accent"
                onClick={() => setShowGameModal(true)}
              >
                <PlusCircle size={16} /> Spiel hinzufügen
              </button>
            )}

            {isPrivileged && abend.status === "fixiert" && (
              <button className="button primary" onClick={handleFinishEvening}>
                <Trophy size={16} /> Abend abschliessen
              </button>
            )}
          </div>
        )}
      </div>

      {showGameModal && (
        <GameAddModal
          eveningId={abend._id}
          onClose={() => setShowGameModal(false)}
          onSuccess={fetchAbend}
        />
      )}
    </div>
  );
}
