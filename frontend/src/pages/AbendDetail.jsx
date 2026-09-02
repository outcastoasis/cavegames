// src/pages/AbendDetail.jsx
import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/authState";
import {
  ArrowLeft,
  Trophy,
  PlusCircle,
  CalendarDays,
  Clock,
  MapPin,
  Users as UsersIcon,
  XCircle,
  Trash2,
  Pencil,
  Gamepad2,
  RefreshCw,
} from "lucide-react";
import "../styles/pages/AbendDetail.css";
import GameAddModal from "../components/forms/GameAddModal";
import defaultAvatar from "../assets/images/avatar.jpg";
import { AbendDetailSkeleton } from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import StatusBadge from "../components/ui/StatusBadge";
import ParticipationControl from "../components/evenings/ParticipationControl";
import EveningPhotoSection from "../components/EveningPhotoSection";
import {
  formatSwissDate,
  formatSwissTime,
  getSwissDateKey,
  swissDateTimeInputToIso,
  toSwissDateTimeInputValue,
} from "../utils/swissDateTime";

const toId = (value) => String(value?._id ?? value ?? "");

function GameImage({ imageUrl, name, onPreview }) {
  const hasImage = Boolean(imageUrl);
  const Component = hasImage ? "button" : "span";

  return (
    <Component
      className={`abenddetail-game-image ${
        hasImage ? "abenddetail-game-image--clickable" : ""
      }`}
      type={hasImage ? "button" : undefined}
      aria-label={hasImage ? `${name} Bild vergrössern` : undefined}
      aria-hidden={!hasImage}
      onClick={hasImage ? onPreview : undefined}
    >
      <Gamepad2 size={22} />
      {hasImage && (
        <img
          src={imageUrl}
          alt={name ? `${name} Bild` : ""}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </Component>
  );
}

export default function AbendDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [abend, setAbend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGameModal, setShowGameModal] = useState(false);
  const [previewGame, setPreviewGame] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editScores, setEditScores] = useState(null);
  const [originalScores, setOriginalScores] = useState(null);
  const [savingGameId, setSavingGameId] = useState(null);
  const [recalculatingStats, setRecalculatingStats] = useState(false);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [scoreInputs, setScoreInputs] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [showDateEditModal, setShowDateEditModal] = useState(false);
  const [dateEditValue, setDateEditValue] = useState("");
  const [dateEditError, setDateEditError] = useState("");
  const [savingDateEdit, setSavingDateEdit] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState(null);
  const [removingParticipant, setRemovingParticipant] = useState(false);
  const scoreInputRefs = useRef({});

  const { setTitle } = useOutletContext();

  useEffect(() => {
    setTitle("Abenddetails");
  }, [setTitle]);

  const fetchEligibleUsers = useCallback(async () => {
    try {
      const res = await API.get(`/evenings/${id}/eligible-users`);
      setEligibleUsers(res.data);
    } catch (err) {
      console.error("Fehler beim Laden der verfÃ¼gbaren Benutzer:", err);
    }
  }, [id]);

  const fetchAbend = useCallback(async () => {
    try {
      const res = await API.get(`/evenings/${id}`);
      setAbend(res.data);
      await fetchEligibleUsers();
    } catch (err) {
      console.error("Fehler beim Laden des Abends:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchEligibleUsers, id]);

  useEffect(() => {
    fetchAbend();
  }, [fetchAbend]);

  const handleJoin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await API.post(`/evenings/${id}/participants`);
      await fetchAbend();
    } catch (err) {
      alert(
        "Fehler beim Beitreten: " + (err.response?.data?.error || err.message),
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
        "Fehler beim Verlassen: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setBusy(false);
    }
  };

  const openDateEditModal = () => {
    setDateEditValue(toSwissDateTimeInputValue(abend.date));
    setDateEditError("");
    setShowDateEditModal(true);
  };

  const handleSaveDateEdit = async (event) => {
    event.preventDefault();
    if (!dateEditValue) {
      setDateEditError("Bitte Datum und Uhrzeit auswählen.");
      return;
    }

    const nextDate = swissDateTimeInputToIso(dateEditValue);
    if (!nextDate) {
      setDateEditError("Bitte einen gültigen Termin auswählen.");
      return;
    }

    setSavingDateEdit(true);
    setDateEditError("");
    try {
      await API.patch(`/evenings/${id}/status`, {
        status: "fixiert",
        date: nextDate,
      });
      setShowDateEditModal(false);
      await fetchAbend();
    } catch (err) {
      setDateEditError(
        err.response?.data?.error || "Termin konnte nicht gespeichert werden.",
      );
    } finally {
      setSavingDateEdit(false);
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

  const buildScoreInputs = (game) =>
    Object.fromEntries(
      game.scores.map((score) => [`${game._id}-${score.userId}`, score.points]),
    );

  const handleEditScores = (gameId, focusUserId = null) => {
    if (editScores && editScores !== gameId) {
      alert(
        "Bitte speichere oder brich die aktuelle Punktebearbeitung zuerst ab.",
      );
      return;
    }

    const game = abend.games.find((g) => g._id === gameId);
    if (!game || savingGameId) return;

    setEditScores(gameId);
    setOriginalScores({
      gameId,
      scores: game.scores.map((score) => ({ ...score })),
    });
    setScoreInputs(buildScoreInputs(game));
    setFocusedField(focusUserId ? `${gameId}-${focusUserId}` : null);
  };

  const handleCancelScores = () => {
    if (!originalScores) {
      setEditScores(null);
      setScoreInputs({});
      setFocusedField(null);
      return;
    }

    setAbend((prev) => ({
      ...prev,
      games: prev.games.map((game) =>
        game._id === originalScores.gameId
          ? { ...game, scores: originalScores.scores }
          : game,
      ),
    }));
    setEditScores(null);
    setOriginalScores(null);
    setScoreInputs({});
    setFocusedField(null);
  };

  const handleScoreChange = (gameId, userId, value) => {
    setAbend((prev) => ({
      ...prev,
      games: prev.games.map((g) =>
        g._id === gameId
          ? {
              ...g,
              scores: g.scores.map((s) =>
                s.userId === userId ? { ...s, points: Number(value) } : s,
              ),
            }
          : g,
      ),
    }));
  };

  const handleSaveScores = async (gameId) => {
    const game = abend.games.find((g) => g._id === gameId);
    if (!game || savingGameId) return;

    const hasInvalidScore = game.scores.some(
      (score) => !Number.isFinite(Number(score.points)) || score.points < 0,
    );
    if (hasInvalidScore) {
      alert("Bitte gib nur gÃ¼ltige Punkte ab 0 ein.");
      return;
    }

    setSavingGameId(gameId);
    try {
      await API.patch(`/evenings/${id}/games/${gameId}`, {
        scores: game.scores.map((s) => ({
          userId: s.userId,
          points: s.points,
        })),
      });
      setEditScores(null);
      setOriginalScores(null);
      setScoreInputs({});
      setFocusedField(null);
      await fetchAbend();
    } catch (err) {
      alert("Fehler beim Speichern der Punkte: " + err.message);
    } finally {
      setSavingGameId(null);
    }
  };

  const handleFinishEvening = async () => {
    const gamesCount = abend.games?.length || 0;
    const participantsCount = abend.participantRefs?.length || 0;
    const totalPoints = abend.games?.reduce(
      (sum, game) =>
        sum +
        game.scores.reduce(
          (scoreSum, score) => scoreSum + (Number(score.points) || 0),
          0,
        ),
      0,
    );
    const hasGamesWithoutScores = abend.games?.some((game) =>
      game.scores.every((score) => Number(score.points) === 0),
    );
    const reviewText = [
      "Abend wirklich abschliessen?",
      "",
      `${gamesCount} Spiele`,
      `${participantsCount} Teilnehmer`,
      `${totalPoints} Gesamtpunkte`,
      hasGamesWithoutScores
        ? "Hinweis: Mindestens ein Spiel hat nur 0 Punkte."
        : null,
      "",
      "Die Punkte werden fixiert.",
    ]
      .filter(Boolean)
      .join("\n");

    if (!confirm(reviewText)) return;
    try {
      await API.patch(`/evenings/${id}/status`, { status: "abgeschlossen" });
      await fetchAbend();
    } catch (err) {
      alert("Fehler beim Abschliessen: " + err.message);
    }
  };

  const handleRecalculateStats = async () => {
    if (!confirm("Statistik für diesen Abend neu berechnen?")) return;

    setRecalculatingStats(true);
    try {
      await API.patch(`/evenings/${id}/recalculate`);
      await fetchAbend();
    } catch (err) {
      alert(
        "Fehler beim Neuberechnen: " +
          (err.response?.data?.error || err.message),
      );
    } finally {
      setRecalculatingStats(false);
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

  const requestRemoveParticipant = (participant) => {
    const scoreEntries = (abend.games || []).reduce(
      (count, game) =>
        count +
        (game.scores || []).filter(
          (score) => toId(score.userId) === toId(participant._id),
        ).length,
      0,
    );
    const totalPoints = (abend.games || []).reduce(
      (total, game) =>
        total +
        (game.scores || [])
          .filter((score) => toId(score.userId) === toId(participant._id))
          .reduce((sum, score) => sum + (Number(score.points) || 0), 0),
      0,
    );

    setParticipantToRemove({ ...participant, scoreEntries, totalPoints });
  };

  const handleRemoveParticipant = async () => {
    if (!participantToRemove || removingParticipant) return;
    setRemovingParticipant(true);
    try {
      await API.delete(
        `/evenings/${id}/participants/${participantToRemove._id}`,
        { data: { confirmScoreDeletion: true } },
      );
      setParticipantToRemove(null);
      await fetchAbend();
    } catch (err) {
      alert(
        "Fehler beim Entfernen: " +
          (err.response?.data?.error || err.message),
      );
    } finally {
      setRemovingParticipant(false);
    }
  };

  if (loading) return <AbendDetailSkeleton />;
  if (!abend) return <p className="abenddetail-error">Abend nicht gefunden.</p>;

  const isAdmin = user?.role === "admin";
  const isSpielleiter =
    toId(abend.spielleiterRef?._id) === toId(user._id);
  const isPrivileged = isAdmin || isSpielleiter;
  const isFixiert = abend.status === "fixiert";
  const isAbgeschlossen = abend.status === "abgeschlossen";
  const isTeilnehmer = abend.participantRefs?.some(
    (participant) => toId(participant._id) === toId(user._id),
  );
  const hasRecordedGames = (abend.games?.length || 0) > 0;
  const backTarget = abend.status === "gesperrt" ? "/historie" : "/abende";
  const isGesperrt = abend.status === "gesperrt";
  const canEditDate = isPrivileged && isFixiert;
  const canEditScores =
    !isGesperrt &&
    ((isAdmin && (isFixiert || isAbgeschlossen)) ||
      (isSpielleiter && isFixiert));

  const isToday =
    abend.date &&
    getSwissDateKey(abend.date) === getSwissDateKey(new Date());

  const canAddGame =
    !isGesperrt && ((isAdmin && isFixiert) || (isSpielleiter && isFixiert));

  const canDeleteGame =
    !isGesperrt &&
    ((isAdmin && (isFixiert || isAbgeschlossen)) ||
      (isSpielleiter && isFixiert));
  const canRecalculateStats = isPrivileged && (isAbgeschlossen || isGesperrt);
  const canEditPhoto =
    isPrivileged &&
    (isFixiert || isAbgeschlossen || (isAdmin && isGesperrt));
  const canDownloadPhoto = isAdmin || isTeilnehmer;
  const canFinishEvening = (isSpielleiter || isAdmin) && isFixiert;
  const hasCompletionActions = canFinishEvening || canRecalculateStats;

  const formattedDate = abend.date
    ? formatSwissDate(abend.date, {
        weekday: "short",
        day: "2-digit",
        month: "short",
      })
    : null;
  const formattedTime = abend.date
    ? formatSwissTime(abend.date, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const formattedLocation =
    abend.location?.trim() ||
    (abend.spielleiterRef?.displayName
      ? `Bei ${abend.spielleiterRef.displayName}`
      : "Ort offen");

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
    <div className="page-shell page-shell--compact abenddetail-page">
      <Button
        className="abenddetail-backbutton"
        leadingIcon={<ArrowLeft size={18} />}
        onClick={() => navigate(backTarget)}
        size="sm"
        variant="ghost"
      >
        Zurück
      </Button>

      <div className="abenddetail-content">
        <Card
          as="section"
          className={`abenddetail-event-summary abenddetail-event-summary--${abend.status}`}
        >
          <div className="abenddetail-event-summary-main">
            <div className="abenddetail-event-date">
              <CalendarDays size={20} aria-hidden="true" />
              <span>{formattedDate || "Termin wird abgestimmt"}</span>
              {canEditDate && (
                <Button
                  aria-label="Termin bearbeiten"
                  className="abenddetail-edit-date-button"
                  iconOnly
                  onClick={openDateEditModal}
                  size="sm"
                  title="Termin bearbeiten"
                  variant="ghost"
                >
                  <Pencil size={17} />
                </Button>
              )}
            </div>
            <div className="abenddetail-event-summary-actions">
              <StatusBadge status={abend.status} />
            </div>
          </div>

          <div className="abenddetail-event-facts">
            {formattedTime && (
              <span className="abenddetail-event-fact">
                <Clock size={17} aria-hidden="true" />
                <span>{formattedTime}</span>
              </span>
            )}
            <span className="abenddetail-event-fact abenddetail-event-fact--location">
              <MapPin size={17} aria-hidden="true" />
              <span className="abenddetail-visually-hidden">Ort: </span>
              <span>{formattedLocation}</span>
            </span>
            <span className="abenddetail-event-fact">
              <UsersIcon size={17} aria-hidden="true" />
              <span className="abenddetail-visually-hidden">Teilnehmer: </span>
              <strong>{abend.participantRefs?.length ?? 0}</strong>
            </span>
            <span className="abenddetail-event-fact">
              <Gamepad2 size={17} aria-hidden="true" />
              <span className="abenddetail-visually-hidden">Spiele: </span>
              <strong>{abend.games?.length ?? 0}</strong>
            </span>
          </div>
        </Card>

        {isFixiert && !isToday && !hasRecordedGames && (
          <Card
            as="section"
            aria-label="Teilnahme"
            className="abenddetail-participation"
            padding="sm"
            variant="muted"
          >
            <ParticipationControl
              busy={busy}
              isParticipating={isTeilnehmer}
              onJoin={handleJoin}
              onLeave={handleLeave}
            />
          </Card>
        )}

        {/* Tagessieger */}
        {(isAbgeschlossen || isGesperrt) && abend.winnerIds?.length > 0 && (
          <Card
            as="section"
            className="abenddetail-winner"
            variant="accent"
          >
            <Trophy size={20} aria-hidden="true" />
            <div className="abenddetail-winner-text">
              <span className="abenddetail-winner-label">Tagessieger</span>
              <span className="abenddetail-winner-value">
                {abend.winnerIds
                  .map((id) => {
                    const u = abend.participantRefs?.find(
                      (participant) => toId(participant._id) === toId(id),
                    );
                    return u?.displayName || "Unbekannt";
                  })
                  .join(", ")}{" "}
                (
                {
                  abend.playerPoints?.find(
                    (entry) =>
                      toId(entry.userId) === toId(abend.winnerIds[0]),
                  )?.points
                }{" "}
                Punkte)
              </span>
            </div>
          </Card>
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
                  (userItem) => toId(userItem._id) === toId(p.userId),
                );
                const pts =
                  abend.playerPoints?.find(
                    (entry) => toId(entry.userId) === toId(p.userId),
                  )
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
              <Card
                className="abenddetail-stat-card"
                padding="sm"
                variant="muted"
              >
                <span className="abenddetail-stat-label">
                  Gesamtpunkte aller Spieler
                </span>
                <span className="abenddetail-stat-value">
                  {abend.totalPoints || 0}
                </span>
              </Card>

              <Card
                className="abenddetail-stat-card"
                padding="sm"
                variant="muted"
              >
                <span className="abenddetail-stat-label">Spieleanzahl</span>
                <span className="abenddetail-stat-value">
                  {abend.gamesPlayedCount}
                </span>
              </Card>

              <Card
                className="abenddetail-stat-card"
                padding="sm"
                variant="muted"
              >
                <span className="abenddetail-stat-label">
                  Meistgespieltes Spiel
                </span>
                <span className="abenddetail-stat-value">
                  {(() => {
                    if (!abend.gameCount?.length) return "Keine Daten";
                    const sorted = [...abend.gameCount].sort(
                      (a, b) => b.count - a.count,
                    )[0];
                    const gameEntry = abend.games.find(
                      (game) => toId(game.gameId?._id) === toId(sorted.gameId),
                    );
                    return gameEntry?.gameId?.name
                      ? `${gameEntry.gameId.name} (${sorted.count}x)`
                      : "Unbekannt";
                  })()}
                </span>
              </Card>
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
              {abend.participantRefs.map((participant) => {
                const isHost =
                  toId(participant._id) === toId(abend.spielleiterRef?._id);

                return (
                  <li
                    key={participant._id}
                    className={`abenddetail-participant-pill ${
                      isHost ? "abenddetail-participant-pill--host" : ""
                    }`}
                  >
                    <img
                      className="abenddetail-participant-avatar"
                      src={participant.profileImageUrl || defaultAvatar}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        event.currentTarget.src = defaultAvatar;
                      }}
                    />

                    <span className="abenddetail-participant-name">
                      {participant.displayName}
                    </span>

                    {isHost && (
                      <StatusBadge
                        className="abenddetail-participant-role"
                        label="Spielleiter"
                        showDot={false}
                        tone="primary"
                      />
                    )}

                    {isPrivileged && isFixiert && !isHost && (
                      <Button
                        aria-label={`${participant.displayName} entfernen`}
                        className="abenddetail-participant-remove"
                        disabled={removingParticipant || Boolean(editScores)}
                        iconOnly
                        onClick={() => requestRemoveParticipant(participant)}
                        size="sm"
                        title="Teilnehmer entfernen"
                        variant="danger-ghost"
                      >
                        <XCircle size={18} />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="abenddetail-muted">Noch keine Teilnehmer.</p>
          )}

          {isPrivileged && isFixiert && (
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
              {hasRecordedGames && (
                <p className="abenddetail-addparticipant-hint">
                  Da bereits Spiele erfasst wurden, wird neuen Spielern 0 Punkte zugewiesen.
                </p>
              )}
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
                <Card
                  as="article"
                  key={game._id}
                  className="abenddetail-game-card"
                >
                  <div className="abenddetail-game-header">
                    <div className="abenddetail-game-title-row">
                      <GameImage
                        imageUrl={game.gameId?.imageUrl}
                        name={game.gameId?.name}
                        onPreview={() =>
                          setPreviewGame({
                            name: game.gameId?.name,
                            imageUrl: game.gameId?.imageUrl,
                          })
                        }
                      />
                      <h3 className="abenddetail-game-title">
                        {game.gameId?.name || "Unbekanntes Spiel"}
                      </h3>
                    </div>

                    {(canEditScores || canDeleteGame) && (
                      <div className="abenddetail-game-actions">
                        {canEditScores && editScores !== game._id && (
                          <Button
                            aria-label="Punkte bearbeiten"
                            className="abenddetail-button-round-edit"
                            disabled={
                              Boolean(savingGameId) ||
                              (editScores && editScores !== game._id)
                            }
                            iconOnly
                            onClick={() => handleEditScores(game._id)}
                            size="sm"
                            title="Punkte bearbeiten"
                            variant="ghost"
                          >
                            <Pencil size={18} />
                          </Button>
                        )}

                        {canDeleteGame && (
                          <Button
                            aria-label="Spiel löschen"
                            className="abenddetail-button-round-delete"
                            disabled={savingGameId === game._id}
                            iconOnly
                            onClick={() => handleDeleteGame(game._id)}
                            size="sm"
                            title="Spiel löschen"
                            variant="danger-ghost"
                          >
                            <Trash2 size={18} />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <ul className="abenddetail-score-list">
                    {game.scores.map((s) => (
                      <li
                        key={s.userId}
                        className={`abenddetail-score-item ${
                          editScores === game._id && canEditScores
                            ? "abenddetail-score-item--editing"
                            : ""
                        }`}
                      >
                        <span className="abenddetail-score-name">
                          {s.userName}
                        </span>

                        {editScores === game._id && canEditScores ? (
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="abenddetail-score-input"
                            value={getScoreInputValue(
                              game._id,
                              s.userId,
                              s.points,
                            )}
                            onFocus={() =>
                              handleScoreFocus(game._id, s.userId, s.points)
                            }
                            onBlur={() => handleScoreBlur(game._id, s.userId)}
                            onChange={(e) =>
                              handleScoreInputChange(
                                game._id,
                                s.userId,
                                e.target.value,
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
                        ) : canEditScores ? (
                          <Button
                            className="abenddetail-score-value abenddetail-score-value--editable"
                            onClick={() => handleEditScores(game._id, s.userId)}
                            size="sm"
                            title="Punkte bearbeiten"
                            variant="ghost"
                          >
                            {s.points} Punkte
                          </Button>
                        ) : (
                          <span className="abenddetail-score-value">
                            {s.points} Punkte
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {editScores === game._id && canEditScores && (
                    <div className="abenddetail-game-footer">
                      <Button
                        disabled={savingGameId === game._id}
                        onClick={handleCancelScores}
                        size="sm"
                        variant="secondary"
                      >
                        Abbrechen
                      </Button>
                      <Button
                        disabled={savingGameId === game._id}
                        onClick={() => handleSaveScores(game._id)}
                        size="sm"
                      >
                        {savingGameId === game._id
                          ? "Speichere..."
                          : "Speichern"}
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>

        {canAddGame && (
          <div className="abenddetail-footer-actions abenddetail-footer-actions--games">
            <Button
              leadingIcon={<PlusCircle size={18} />}
              onClick={() => setShowGameModal(true)}
            >
              Spiel hinzufügen
            </Button>
          </div>
        )}

        <EveningPhotoSection
          evening={abend}
          canEdit={canEditPhoto}
          canDownload={canDownloadPhoto}
          onChanged={fetchAbend}
        />

        {hasCompletionActions && (
          <footer className="abenddetail-footer-actions abenddetail-footer-actions--completion">
            {/* Abend abschliessen – nur Spielleiter ODER Admin, aber nur solange fixiert */}
            {canFinishEvening && (
              <Button
                leadingIcon={<Trophy size={18} />}
                onClick={handleFinishEvening}
              >
                Abend abschliessen
              </Button>
            )}

            {canRecalculateStats && (
              <Button
                disabled={recalculatingStats}
                leadingIcon={<RefreshCw size={18} />}
                onClick={handleRecalculateStats}
                variant="secondary"
              >
                {recalculatingStats
                  ? "Berechne..."
                  : "Statistik neu berechnen"}
              </Button>
            )}
          </footer>
        )}
      </div>

      {showGameModal && (
        <GameAddModal
          eveningId={abend._id}
          onClose={() => setShowGameModal(false)}
          onSuccess={fetchAbend}
        />
      )}

      {showDateEditModal &&
        createPortal(
          <div className="abenddetail-modal-overlay">
            <div className="abenddetail-date-modal" role="dialog" aria-modal="true">
              <h2>Termin bearbeiten</h2>
              <form
                className="abenddetail-date-modal-form"
                onSubmit={handleSaveDateEdit}
              >
                <label>
                  Datum und Uhrzeit
                  <input
                    type="datetime-local"
                    className="abenddetail-date-input"
                    value={dateEditValue}
                    onChange={(event) => setDateEditValue(event.target.value)}
                    disabled={savingDateEdit}
                  />
                </label>
                {dateEditError && (
                  <p className="abenddetail-date-modal-error">
                    {dateEditError}
                  </p>
                )}
                <div className="abenddetail-date-modal-actions">
                  <Button
                    type="button"
                    onClick={() => setShowDateEditModal(false)}
                    disabled={savingDateEdit}
                    variant="secondary"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingDateEdit}
                  >
                    {savingDateEdit ? "Speichern..." : "Speichern"}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={Boolean(participantToRemove)}
        title={`${participantToRemove?.displayName || "Teilnehmer"} entfernen?`}
        confirmLabel="Endgültig entfernen"
        danger
        busy={removingParticipant}
        onCancel={() => setParticipantToRemove(null)}
        onConfirm={handleRemoveParticipant}
      >
        {hasRecordedGames ? (
          <>
            <p>
              Die Person wird aus diesem Abend entfernt. Dabei werden ihre
              Punktestände aus {participantToRemove?.scoreEntries || 0} Spielen
              gelöscht ({participantToRemove?.totalPoints || 0} Gesamtpunkte).
            </p>
            <p className="confirm-dialog-warning">
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
          </>
        ) : (
          <p>Die Person wird aus der Teilnehmerliste dieses Abends entfernt.</p>
        )}
      </ConfirmDialog>

      {previewGame &&
        createPortal(
          <div
            className="abenddetail-game-preview-overlay"
            onClick={() => setPreviewGame(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Escape" || event.key === "Enter") {
                setPreviewGame(null);
              }
            }}
          >
            <div
              className="abenddetail-game-preview"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={previewGame.imageUrl}
                alt={previewGame.name ? `${previewGame.name} Bild` : ""}
              />
              <strong>{previewGame.name}</strong>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
