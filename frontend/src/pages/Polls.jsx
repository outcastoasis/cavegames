import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  RefreshCw,
  Users,
  Vote,
} from "lucide-react";
import API from "../services/api";
import { useAuth } from "../context/authState";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import PageLoader from "../components/ui/PageLoader";
import StatusBadge from "../components/ui/StatusBadge";
import Toast from "../components/ui/Toast";
import {
  formatSwissDate,
  formatSwissTime,
} from "../utils/swissDateTime";
import "../styles/pages/Polls.css";

const sortByDateAsc = (a, b) => new Date(a.date) - new Date(b.date);

const formatPollDate = (dateValue) =>
  formatSwissDate(dateValue, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatPollTime = (dateValue) =>
  formatSwissTime(dateValue, {
    hour: "2-digit",
    minute: "2-digit",
  });

const getVoteLabel = (count) =>
  `${count} ${count === 1 ? "Stimme" : "Stimmen"}`;

const toId = (value) => String(value?._id ?? value ?? "");

const areSelectionsEqual = (firstSelection, secondSelection) =>
  [...firstSelection].sort().join("|") ===
  [...secondSelection].sort().join("|");

export default function Polls() {
  const { user } = useAuth();
  const { setTitle } = useOutletContext();
  const [polls, setPolls] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [savedDates, setSavedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [pendingFinalize, setPendingFinalize] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const fetchPolls = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    setLoadError("");

    try {
      const res = await API.get("/polls");
      const loadedPolls = res.data;
      const loadedActivePoll = loadedPolls.find(
        (poll) => !poll.finalizedOption,
      );
      const savedSelection = (loadedActivePoll?.options || [])
        .filter((option) =>
          option.votes?.some((voter) => toId(voter) === toId(user?._id)),
        )
        .map((option) => new Date(option.date).toISOString());

      setPolls(loadedPolls);
      setSelectedDates(savedSelection);
      setSavedDates(savedSelection);
    } catch (err) {
      console.error("Fehler beim Laden der Umfragen:", err);
      setLoadError("Umfragen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    setTitle("Umfragen");
    fetchPolls();
  }, [fetchPolls, setTitle]);

  const handleToggle = (date) => {
    setSelectedDates((previousDates) =>
      previousDates.includes(date)
        ? previousDates.filter((entry) => entry !== date)
        : [...previousDates, date],
    );
  };

  const handleVote = async (pollId) => {
    if (areSelectionsEqual(selectedDates, savedDates)) return;

    setSubmitting(true);
    try {
      await API.patch(`/polls/${pollId}/vote`, {
        optionDates: selectedDates,
      });
      await fetchPolls();
      setToastMessage("Deine Stimme wurde gespeichert.");
    } catch (err) {
      setToastMessage(
        `Fehler beim Abstimmen: ${err.response?.data?.error || err.message}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    if (!pendingFinalize) return;

    setFinalizing(true);
    try {
      await API.patch(`/polls/${pendingFinalize.pollId}/finalize`, {
        finalizedDate: pendingFinalize.date,
      });
      await fetchPolls();
      setToastMessage("Termin erfolgreich fixiert.");
    } catch (err) {
      setToastMessage(
        `Fehler beim Fixieren: ${err.response?.data?.error || err.message}`,
      );
    } finally {
      setFinalizing(false);
      setPendingFinalize(null);
    }
  };

  const getVoters = (option) => {
    const uniqueVoters = new Map();

    (option?.votes || []).forEach((voter) => {
      const normalizedVoter =
        typeof voter === "string"
          ? { _id: voter, displayName: voter }
          : voter;
      if (!normalizedVoter?.displayName) return;

      const key = normalizedVoter._id || normalizedVoter.displayName;
      uniqueVoters.set(String(key), normalizedVoter);
    });

    return Array.from(uniqueVoters.values());
  };

  if (loading) {
    return (
      <div className="page-shell page-shell--compact polls-page">
        <PageLoader
          compact
          title="Umfragen werden geladen"
          message="Terminvorschläge werden vorbereitet."
        />
      </div>
    );
  }

  const activePoll = polls.find((poll) => !poll.finalizedOption);
  const pastPolls = polls
    .filter((poll) => poll.finalizedOption)
    .sort(
      (a, b) =>
        new Date(b.finalizedOption) - new Date(a.finalizedOption),
    );

  const gameLeaderId =
    activePoll?.eveningId?.spielleiterId?._id ??
    activePoll?.eveningId?.spielleiterId;
  const canFinalize =
    Boolean(user?._id && gameLeaderId) &&
    String(user._id) === String(gameLeaderId);
  const selectionChanged = !areSelectionsEqual(selectedDates, savedDates);

  return (
    <div className="page-shell page-shell--compact polls-page">
      {loadError ? (
        <Card as="section" className="polls-empty-state" variant="muted">
          <span className="polls-empty-state__icon" aria-hidden="true">
            <RefreshCw size={23} />
          </span>
          <h2>Laden fehlgeschlagen</h2>
          <p>{loadError}</p>
          <Button
            leadingIcon={<RefreshCw size={18} />}
            onClick={() => fetchPolls({ showLoader: true })}
            size="sm"
            variant="secondary"
          >
            Erneut laden
          </Button>
        </Card>
      ) : (
        <>
          <section className="polls-section" aria-labelledby="active-poll-title">
            <div className="polls-section-heading">
              <h2 id="active-poll-title">Offene Umfrage</h2>
            </div>

            {activePoll ? (
              <Card
                className="polls-card polls-card--active"
                padding="md"
              >
                <div className="polls-card__header">
                  <div className="polls-card__title-group">
                    <span className="polls-card__icon" aria-hidden="true">
                      <Vote size={22} />
                    </span>
                    <div>
                      <h3>Nächster Spieleabend</h3>
                      <p>Wähle passende Termine.</p>
                    </div>
                  </div>
                  <StatusBadge label="Offen" tone="warning" />
                </div>

                <div className="polls-options">
                  {[...(activePoll.options || [])]
                    .sort(sortByDateAsc)
                    .map((option, index) => {
                      const isoDate = new Date(option.date).toISOString();
                      const isSelected = selectedDates.includes(isoDate);
                      const votesCount = option.votes?.length || 0;
                      const voters = getVoters(option);
                      const maxVotesInPoll = Math.max(
                        0,
                        ...(activePoll.options?.map(
                          (entry) => entry.votes?.length || 0,
                        ) || []),
                      );
                      const percentage = maxVotesInPoll
                        ? Math.round((votesCount / maxVotesInPoll) * 100)
                        : 0;

                      return (
                        <div
                          className={`poll-option${
                            isSelected ? " poll-option--selected" : ""
                          }`}
                          key={`${isoDate}-${index}`}
                        >
                          <label className="poll-option__choice">
                            <input
                              checked={isSelected}
                              className="poll-option__input"
                              disabled={submitting || finalizing}
                              onChange={() => handleToggle(isoDate)}
                              type="checkbox"
                            />
                            <span
                              className="poll-option__selection"
                              aria-hidden="true"
                            >
                              {isSelected && <Check size={16} />}
                            </span>
                            <span className="poll-option__body">
                              <span className="poll-option__schedule">
                                <span className="poll-option__date">
                                  <CalendarDays size={17} aria-hidden="true" />
                                  <time dateTime={isoDate}>
                                    {formatPollDate(option.date)}
                                  </time>
                                </span>
                                <span className="poll-option__time">
                                  <Clock3 size={17} aria-hidden="true" />
                                  {formatPollTime(option.date)}
                                </span>
                              </span>

                              <span
                                aria-label={getVoteLabel(votesCount)}
                                aria-valuemax="100"
                                aria-valuemin="0"
                                aria-valuenow={percentage}
                                className="poll-option__progress"
                                role="progressbar"
                              >
                                <span style={{ width: `${percentage}%` }} />
                              </span>

                              <span className="poll-option__meta">
                                <span className="poll-option__vote-count">
                                  <Users size={16} aria-hidden="true" />
                                  {getVoteLabel(votesCount)}
                                </span>
                                <VoterSummary voters={voters} />
                              </span>
                            </span>
                          </label>

                          {canFinalize && (
                            <Button
                              className="poll-option__finalize"
                              disabled={finalizing}
                              leadingIcon={<LockKeyhole size={17} />}
                              onClick={() =>
                                setPendingFinalize({
                                  pollId: activePoll._id,
                                  date: option.date,
                                })
                              }
                              size="sm"
                              variant="secondary"
                            >
                              Fixieren
                            </Button>
                          )}
                        </div>
                      );
                    })}
                </div>

                {user && (
                  <Button
                    className="polls-vote-button"
                    disabled={submitting || !selectionChanged}
                    fullWidth
                    leadingIcon={<Vote size={18} />}
                    onClick={() => handleVote(activePoll._id)}
                  >
                    {submitting ? "Wird gespeichert..." : "Auswahl speichern"}
                  </Button>
                )}
              </Card>
            ) : (
              <Card className="polls-empty-state" variant="muted">
                <span className="polls-empty-state__icon" aria-hidden="true">
                  <Vote size={23} />
                </span>
                <h3>Keine offene Umfrage</h3>
                <p>Aktuell gibt es nichts abzustimmen.</p>
              </Card>
            )}
          </section>

          {pastPolls.length > 0 && (
            <section
              className="polls-section polls-section--history"
              aria-labelledby="past-polls-title"
            >
              <div className="polls-section-heading">
                <h2 id="past-polls-title">Abgeschlossen</h2>
                <span>{pastPolls.length}</span>
              </div>

              <div className="polls-history">
                {pastPolls.map((poll) => (
                  <Card
                    as="article"
                    className="polls-card polls-card--finalized"
                    key={poll._id}
                    padding="md"
                  >
                    <div className="polls-finalized-summary">
                      <div className="polls-finalized-topline">
                        <span>Fixierter Termin</span>
                        <StatusBadge label="Fixiert" tone="success" />
                      </div>
                      <div className="polls-finalized-schedule">
                        <h3>
                          <CalendarDays size={19} aria-hidden="true" />
                          {formatPollDate(poll.finalizedOption)}
                        </h3>
                        <span className="polls-finalized-time">
                          <Clock3 size={16} aria-hidden="true" />
                          {formatPollTime(poll.finalizedOption)}
                        </span>
                      </div>
                    </div>

                    <div className="polls-options polls-options--readonly">
                      {[...(poll.options || [])]
                        .sort(sortByDateAsc)
                        .map((option, index) => {
                          const isoDate = new Date(option.date).toISOString();
                          const isFinal =
                            isoDate ===
                            new Date(poll.finalizedOption).toISOString();
                          const votesCount = option.votes?.length || 0;
                          const voters = getVoters(option);

                          return (
                            <div
                              className={`poll-option poll-option--readonly${
                                isFinal ? " poll-option--chosen" : ""
                              }`}
                              key={`${isoDate}-${index}`}
                            >
                              <div className="poll-option__readonly-body">
                                <div className="poll-option__schedule">
                                  <span className="poll-option__date">
                                    <CalendarDays size={17} aria-hidden="true" />
                                    <time dateTime={isoDate}>
                                      {formatPollDate(option.date)}
                                    </time>
                                  </span>
                                  <span className="poll-option__schedule-end">
                                    <span className="poll-option__time">
                                      <Clock3 size={17} aria-hidden="true" />
                                      {formatPollTime(option.date)}
                                    </span>
                                  </span>
                                </div>
                                <div className="poll-option__meta">
                                  <span className="poll-option__vote-count">
                                    <Users size={16} aria-hidden="true" />
                                    {getVoteLabel(votesCount)}
                                  </span>
                                  <VoterSummary voters={voters} />
                                </div>
                              </div>
                              {isFinal && (
                                <span className="poll-option__chosen-label">
                                  <CheckCircle2 size={17} aria-hidden="true" />
                                  Gewählt
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        busy={finalizing}
        busyLabel="Wird fixiert..."
        confirmLabel="Termin fixieren"
        icon={<LockKeyhole size={24} />}
        onCancel={() => setPendingFinalize(null)}
        onConfirm={handleFinalize}
        open={Boolean(pendingFinalize)}
        title="Termin fixieren?"
      >
        <p>
          {pendingFinalize
            ? `${formatPollDate(pendingFinalize.date)}, ${formatPollTime(
                pendingFinalize.date,
              )} wird als Termin übernommen.`
            : "Der ausgewählte Termin wird übernommen."}
        </p>
        <p>Danach ist keine weitere Abstimmung möglich.</p>
      </ConfirmDialog>

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}
    </div>
  );
}

function VoterSummary({ voters }) {
  if (!voters.length) return null;

  const visibleVoters = voters.slice(0, 5);
  const remainingCount = voters.length - visibleVoters.length;
  const voterNames = voters.map((voter) => voter.displayName).join(", ");

  return (
    <span
      aria-label={`Abgestimmt: ${voterNames}`}
      className="poll-option__voter-summary"
    >
      <span className="poll-option__avatars" aria-hidden="true">
        {visibleVoters.map((voter) => (
          <span
            className="poll-option__avatar"
            key={voter._id || voter.displayName}
            title={voter.displayName}
          >
            {voter.profileImageUrl ? (
              <img src={voter.profileImageUrl} alt="" loading="lazy" />
            ) : (
              voter.displayName.trim().charAt(0).toUpperCase()
            )}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="poll-option__avatar poll-option__avatar--more">
            +{remainingCount}
          </span>
        )}
      </span>
      <span className="poll-option__voter-names" aria-hidden="true">
        {voterNames}
      </span>
    </span>
  );
}
