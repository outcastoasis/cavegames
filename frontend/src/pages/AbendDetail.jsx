// src/pages/AbendDetail.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  Trophy,
  PlusCircle,
  CalendarDays,
  Users as UsersIcon,
  Image as ImageIcon,
  XCircle,
  Trash2,
  MapPinHouse,
  Gamepad2,
  Info,
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
  const [scoreInputs, setScoreInputs] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const scoreInputRefs = useRef({});

  useEffect(() => {
    fetchAbend();
  }, [id]);

  const { setTitle } = useOutletContext();

  useEffect(() => {
    setTitle("Abenddetails");
  }, [setTitle]);

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
      await fetchAbend();
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
  const backTarget = abend.status === "gesperrt" ? "/historie" : "/abende";
  const isGesperrt = abend.status === "gesperrt";
  const canEditScores =
    !isGesperrt &&
    ((isAdmin && (isFixiert || isAbgeschlossen)) ||
      (isSpielleiter && isFixiert));

  const isToday =
    abend.date &&
    new Date(abend.date).toDateString() === new Date().toDateString();

  const canAddGame =
    !isGesperrt && ((isAdmin && isFixiert) || (isSpielleiter && isFixiert));

  const canDeleteGame =
    !isGesperrt &&
    ((isAdmin && (isFixiert || isAbgeschlossen)) ||
      (isSpielleiter && isFixiert));

  const formattedDate = abend.date
    ? new Date(abend.date).toLocaleDateString("de-CH", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      })
    : null;

  const getScoreInputValue = (gameId, userId, defaultValue) => {
    return scoreInputs[`${gameId}-${userId}`] ?? defaultValue;
  };

  const handleScoreFocus = (gameId, userId, currentValue) => {
    const key = `${gameId}-${userId}`;
    if (currentValue === 0) {
      setScoreInputs((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleScoreBlur = (gameId, userId) => {
    const key = `${gameId}-${userId}`;
    const currentValue = scoreInputs[key];
    if (currentValue === "") {
      setScoreInputs((prev) => ({ ...prev, [key]: 0 }));
      handleScoreChange(gameId, userId, 0);
    }
  };

  const handleScoreInputChange = (gameId, userId, value) => {
    const key = `${gameId}-${userId}`;
    setScoreInputs((prev) => ({ ...prev, [key]: value }));
    handleScoreChange(gameId, userId, value === "" ? 0 : value);
  };

  return (
    <div className="abenddetail-container">
      <button
        className="button neutral abenddetail-backbutton"
        onClick={() => navigate(backTarget)}
      >
        <ArrowLeft size={18} />
        <span>Zurück</span>
      </button>

      <div className="abenddetail-card card">
        <div className="abenddetail-info-cards">
          <div className="abenddetail-info-card">
            <CalendarDays size={18} />
            <span>{formattedDate || "Termin wird abgestimmt"}</span>
          </div>

          <div className="abenddetail-info-card">
            <UsersIcon size={18} />
            <span>Spielleiter: {abend.spielleiterRef?.displayName}</span>
          </div>

          <div className="abenddetail-info-card">
            <MapPinHouse size={18} />
            <span>bei {abend.spielleiterRef?.displayName}</span>
          </div>

          <div className="abenddetail-info-card">
            <Info size={18} />

            <span
              className={`abenddetail-status-badge abenddetail-status-badge--${abend.status}`}
            >
              {abend.status}
            </span>
          </div>
        </div>

        {/* Teilnahme-Toggle */}
        {isFixiert && !isToday && (
          <section className="abenddetail-section abenddetail-section--participation">
            <div className="abenddetail-section-header">
              <UsersIcon size={18} />
              <h2 className="abenddetail-section-title">Teilnahme</h2>
            </div>
            <div className="abenddetail-toggle-wrapper">
              <label className="abenddetail-toggle-label">
                <input
                  type="checkbox"
                  checked={isTeilnehmer}
                  onChange={(e) =>
                    e.target.checked ? handleJoin() : handleLeave()
                  }
                  disabled={busy}
                />
                <span className="abenddetail-toggle-slider" />
                <span className="abenddetail-toggle-text">
                  {isTeilnehmer ? "Ich nehme teil" : "Ich bin nicht dabei"}
                </span>
              </label>
            </div>
          </section>
        )}

        {/* Tagessieger */}
        {(isAbgeschlossen || isGesperrt) && abend.winnerIds?.length > 0 && (
          <section className="abenddetail-winner">
            <Trophy size={20} />
            <div className="abenddetail-winner-text">
              <span className="abenddetail-winner-label">Tagessieger</span>
              <span className="abenddetail-winner-value">
                {abend.winnerIds
                  .map((id) => {
                    const u = abend.participantRefs?.find((p) => p._id === id);
                    return u?.displayName || "Unbekannt";
                  })
                  .join(", ")}{" "}
                (
                {
                  abend.playerPoints?.find(
                    (p) => p.userId === abend.winnerIds[0]
                  )?.points
                }{" "}
                Punkte)
              </span>
            </div>
          </section>
        )}

        {/* Platzierungen */}
        {(isAbgeschlossen || isGesperrt) && abend.placements?.length > 0 && (
          <section className="abenddetail-section">
            <div className="abenddetail-section-header">
              <Trophy size={18} />
              <h2 className="abenddetail-section-title">Platzierungen</h2>
            </div>
            <ul className="abenddetail-rank-list">
              {abend.placements.map((p) => {
                const userRef = abend.participantRefs?.find(
                  (u) => u._id === p.userId
                );
                const pts =
                  abend.playerPoints?.find((x) => x.userId === p.userId)
                    ?.points || 0;

                return (
                  <li key={p.userId} className="abenddetail-rank-item">
                    <span className="abenddetail-rank-place">{p.place}.</span>
                    <span className="abenddetail-rank-name">
                      {userRef?.displayName || "?"}
                    </span>
                    <span className="abenddetail-rank-points">
                      {pts} Punkte
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Abendstatistik */}
        {(isAbgeschlossen || isGesperrt) && (
          <section className="abenddetail-section">
            <div className="abenddetail-section-header">
              <Gamepad2 size={18} />
              <h2 className="abenddetail-section-title">Abendstatistik</h2>
            </div>
            <div className="abenddetail-stats-grid">
              <div className="abenddetail-stat-card">
                <span className="abenddetail-stat-label">
                  Gesamtpunkte aller Spieler
                </span>
                <span className="abenddetail-stat-value">
                  {abend.totalPoints || 0}
                </span>
              </div>

              <div className="abenddetail-stat-card">
                <span className="abenddetail-stat-label">
                  Höchste Einzelpunktzahl
                </span>
                <span className="abenddetail-stat-value">
                  {(() => {
                    const top = abend.playerPoints?.find(
                      (p) => p.points === abend.maxPoints
                    );
                    const userRef = abend.participantRefs?.find(
                      (u) => u._id === top?.userId
                    );
                    return userRef?.displayName
                      ? `${userRef.displayName} (${abend.maxPoints} Punkte)`
                      : `${abend.maxPoints} Punkte`;
                  })()}
                </span>
              </div>

              <div className="abenddetail-stat-card">
                <span className="abenddetail-stat-label">Spieleanzahl</span>
                <span className="abenddetail-stat-value">
                  {abend.gamesPlayedCount}
                </span>
              </div>

              <div className="abenddetail-stat-card">
                <span className="abenddetail-stat-label">
                  Meistgespieltes Spiel
                </span>
                <span className="abenddetail-stat-value">
                  {(() => {
                    if (!abend.gameCount?.length) return "Keine Daten";
                    const sorted = [...abend.gameCount].sort(
                      (a, b) => b.count - a.count
                    )[0];
                    const gameEntry = abend.games.find(
                      (g) => g.gameId?._id === sorted.gameId
                    );
                    return gameEntry?.gameId?.name
                      ? `${gameEntry.gameId.name} (${sorted.count}x)`
                      : "Unbekannt";
                  })()}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Teilnehmer */}
        <section className="abenddetail-section">
          <div className="abenddetail-section-header">
            <UsersIcon size={18} />
            <h2 className="abenddetail-section-title">Teilnehmer</h2>
          </div>

          {abend.participantRefs?.length ? (
            <ul className="abenddetail-participant-list">
              {abend.participantRefs.map((p) => (
                <li
                  key={p._id}
                  className="abenddetail-participant-pill abenddetail-pill"
                >
                  <span className="abenddetail-participant-name">
                    {p.displayName}
                  </span>
                  {isPrivileged && isFixiert && abend.games.length === 0 && (
                    <button
                      className="abenddetail-participant-remove"
                      onClick={() => handleRemoveParticipant(p._id)}
                      title="Teilnehmer entfernen"
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="abenddetail-muted">Noch keine Teilnehmer.</p>
          )}

          {isPrivileged && isFixiert && abend.games.length === 0 && (
            <div className="abenddetail-addparticipant">
              <label className="abenddetail-addparticipant-label">
                Weitere Person hinzufügen
                <select
                  className="abenddetail-addparticipant-select"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      handleAddParticipant(val);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">Bitte wählen…</option>
                  {eligibleUsers.map((userItem) => (
                    <option key={userItem._id} value={userItem._id}>
                      {userItem.displayName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </section>

        {/* Gespielte Spiele */}
        <section className="abenddetail-section">
          <div className="abenddetail-section-header">
            <Gamepad2 size={18} />
            <h2 className="abenddetail-section-title">Gespielte Spiele</h2>
          </div>

          {abend.games.length === 0 ? (
            <p className="abenddetail-muted">Noch keine Spiele erfasst.</p>
          ) : (
            <div className="abenddetail-games-list">
              {abend.games.map((game) => (
                <article
                  key={game._id}
                  className="abenddetail-game-card abenddetail-subcard"
                >
                  <div className="abenddetail-game-header">
                    <h3 className="abenddetail-game-title">
                      {game.gameId?.name || "Unbekanntes Spiel"}
                    </h3>

                    {canDeleteGame && (
                      <div className="abenddetail-game-actions">
                        <button
                          className="abenddetail-button-round-delete"
                          onClick={() => handleDeleteGame(game._id)}
                          title="Spiel löschen"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  <ul className="abenddetail-score-list">
                    {game.scores.map((s) => (
                      <li key={s.userId} className="abenddetail-score-item">
                        <span className="abenddetail-score-name">
                          {s.userName}
                        </span>

                        {editScores === game._id && canEditScores ? (
                          <input
                            type="number"
                            className="input abenddetail-score-input"
                            value={getScoreInputValue(
                              game._id,
                              s.userId,
                              s.points
                            )}
                            onFocus={() =>
                              handleScoreFocus(game._id, s.userId, s.points)
                            }
                            onBlur={() => handleScoreBlur(game._id, s.userId)}
                            onChange={(e) =>
                              handleScoreInputChange(
                                game._id,
                                s.userId,
                                e.target.value
                              )
                            }
                            ref={(el) => {
                              if (el) {
                                scoreInputRefs.current[
                                  `${game._id}-${s.userId}`
                                ] = el;
                              }
                            }}
                            autoFocus={
                              focusedField === `${game._id}-${s.userId}`
                            }
                          />
                        ) : (
                          <span
                            className={
                              canEditScores
                                ? "abenddetail-score-value abenddetail-score-value--editable"
                                : "abenddetail-score-value"
                            }
                            onClick={() => {
                              if (canEditScores) {
                                setEditScores(game._id);
                                setFocusedField(`${game._id}-${s.userId}`);
                              }
                            }}
                            title={isPrivileged ? "Klicken zum Bearbeiten" : ""}
                          >
                            {s.points} Punkte
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {editScores === game._id && canEditScores && (
                    <div className="abenddetail-game-footer">
                      <button
                        className="button primary"
                        onClick={() => handleSaveScores(game._id)}
                      >
                        Speichern
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Gruppenfoto */}
        {abend.groupPhotoUrl && (
          <section className="abenddetail-section">
            <div className="abenddetail-section-header">
              <ImageIcon size={18} />
              <h2 className="abenddetail-section-title">Gruppenfoto</h2>
            </div>
            <img
              src={abend.groupPhotoUrl}
              alt="Gruppenfoto"
              className="abenddetail-photo"
            />
          </section>
        )}

        {/* Aktionen unten */}
        <footer className="abenddetail-footer-actions">
          {/* Spiel hinzufügen */}
          {canAddGame && (
            <button
              className="button accent"
              onClick={() => setShowGameModal(true)}
            >
              <PlusCircle size={18} />
              <span>Spiel hinzufügen</span>
            </button>
          )}

          {/* Abend abschliessen – nur Spielleiter ODER Admin, aber nur solange fixiert */}
          {(isSpielleiter || isAdmin) && isFixiert && (
            <button className="button primary" onClick={handleFinishEvening}>
              <Trophy size={18} />
              <span>Abend abschliessen</span>
            </button>
          )}
        </footer>
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
