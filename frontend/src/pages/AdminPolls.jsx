import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useOutletContext } from "react-router-dom";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Trash2,
  Users,
  Vote,
} from "lucide-react";
import PollCreateModal from "../components/forms/PollCreateModal";
import AvatarStack from "../components/ui/AvatarStack";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { SkeletonBlock } from "../components/ui/Skeleton";
import StatusBadge from "../components/ui/StatusBadge";
import Toast from "../components/ui/Toast";
import { useAuth } from "../context/authState";
import API from "../services/api";
import {
  formatSwissDate,
  formatSwissTime,
} from "../utils/swissDateTime";
import "../styles/pages/AdminPolls.css";

const sortOptionsByDate = (first, second) =>
  new Date(first.date) - new Date(second.date);

const formatOptionDate = (dateValue) =>
  formatSwissDate(dateValue, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

const formatFullDate = (dateValue) =>
  formatSwissDate(dateValue, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatRangeDate = (dateValue) =>
  formatSwissDate(dateValue, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getVoteLabel = (count) =>
  `${count} ${count === 1 ? "Stimme" : "Stimmen"}`;

const getEveningId = (poll) =>
  typeof poll.eveningId === "string" ? poll.eveningId : poll.eveningId?._id;

const getSortedOptions = (poll) =>
  [...(poll.options || [])].sort(sortOptionsByDate);

const getPollStartDate = (poll) =>
  getSortedOptions(poll)[0]?.date || poll.createdAt;

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

const getPollRange = (poll) => {
  const options = getSortedOptions(poll);
  const firstDate = options[0]?.date;
  const lastDate = options[options.length - 1]?.date;

  if (!firstDate) return `Spieljahr ${poll.eveningId?.spieljahr || "–"}`;
  if (firstDate === lastDate) return formatRangeDate(firstDate);
  return `${formatRangeDate(firstDate)} – ${formatRangeDate(lastDate)}`;
};

export default function AdminPolls() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setTitle } = useOutletContext();
  const [polls, setPolls] = useState([]);
  const [eveningsWithoutPoll, setEveningsWithoutPoll] = useState([]);
  const [selectedPollEveningId, setSelectedPollEveningId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const fetchPolls = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    setLoadError("");

    try {
      const [pollsResponse, eveningsResponse] = await Promise.all([
        API.get("/polls"),
        API.get("/evenings"),
      ]);
      const loadedPolls = pollsResponse.data;
      const pollEveningIds = new Set(
        loadedPolls.map(getEveningId).filter(Boolean).map(String),
      );
      const missingPollEvenings = eveningsResponse.data
        .filter(
          (evening) =>
            evening.status === "offen" &&
            !evening.date &&
            !evening.pollId &&
            !pollEveningIds.has(String(evening._id)),
        )
        .sort((first, second) =>
          String(first.spieljahr || "").localeCompare(
            String(second.spieljahr || ""),
            "de-CH",
          ),
        );

      setPolls(loadedPolls);
      setEveningsWithoutPoll(missingPollEvenings);
    } catch (error) {
      console.error("Fehler beim Laden der Umfragen:", error);
      setLoadError(
        error.response?.data?.error || "Umfragen konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTitle("Umfragenverwaltung");
    fetchPolls();
  }, [fetchPolls, setTitle]);

  const activePolls = useMemo(
    () =>
      polls
        .filter((poll) => !poll.finalizedOption)
        .sort(
          (first, second) =>
            new Date(getPollStartDate(first)) -
            new Date(getPollStartDate(second)),
        ),
    [polls],
  );

  const finalizedPolls = useMemo(
    () =>
      polls
        .filter((poll) => poll.finalizedOption)
        .sort(
          (first, second) =>
            new Date(second.finalizedOption) -
            new Date(first.finalizedOption),
        ),
    [polls],
  );

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handlePollCreated = async () => {
    await fetchPolls();
    setToastMessage("Umfrage erstellt");
  };

  const handleConfirmedAction = async () => {
    if (!confirmAction || actionBusy) return;
    const { type, poll, option } = confirmAction;

    setActionBusy(true);
    try {
      if (type === "finalize") {
        await API.patch(`/polls/${poll._id}/finalize`, {
          finalizedDate: option.date,
        });
        setToastMessage("Termin fixiert");
      } else if (type === "reopen") {
        await API.patch(`/polls/${poll._id}/reopen`);
        setToastMessage("Umfrage neu geöffnet");
      } else {
        await API.delete(`/polls/${poll._id}`);
        setToastMessage("Umfrage gelöscht");
      }

      setConfirmAction(null);
      await fetchPolls();
    } catch (error) {
      const fallbackMessages = {
        finalize: "Termin konnte nicht fixiert werden.",
        reopen: "Umfrage konnte nicht geöffnet werden.",
        delete: "Umfrage konnte nicht gelöscht werden.",
      };
      setToastMessage(
        error.response?.data?.error || fallbackMessages[type],
      );
    } finally {
      setActionBusy(false);
    }
  };

  const confirmation = getConfirmationContent(confirmAction);

  return (
    <div className="page-shell admin-polls-page">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}

      {loading ? (
        <AdminPollsSkeleton />
      ) : loadError ? (
        <Card className="admin-polls-state" variant="muted">
          <RefreshCw size={23} aria-hidden="true" />
          <h2>Laden fehlgeschlagen</h2>
          <p>{loadError}</p>
          <Button
            leadingIcon={<RefreshCw size={17} />}
            onClick={() => fetchPolls({ showLoader: true })}
            size="sm"
            variant="secondary"
          >
            Erneut laden
          </Button>
        </Card>
      ) : (
        <>
          <PollSection
            count={eveningsWithoutPoll.length}
            emptyIcon={<CalendarPlus size={22} />}
            emptyText="Alle offenen Abende haben eine Umfrage."
            id="admin-polls-missing"
            title="Ohne Umfrage"
          >
            {eveningsWithoutPoll.map((evening) => (
              <MissingPollCard
                evening={evening}
                key={evening._id}
                onCreate={() => setSelectedPollEveningId(evening._id)}
                onOpen={() => navigate(`/abende/${evening._id}`)}
              />
            ))}
          </PollSection>

          <PollSection
            count={activePolls.length}
            emptyIcon={<Vote size={22} />}
            emptyText="Keine offenen Umfragen."
            id="admin-polls-active"
            title="Aktive Umfragen"
          >
            {activePolls.map((poll) => (
              <PollAdminCard
                key={poll._id}
                onDelete={() =>
                  setConfirmAction({ type: "delete", poll })
                }
                onFinalize={(option) =>
                  setConfirmAction({ type: "finalize", poll, option })
                }
                onOpen={() => navigate(`/abende/${getEveningId(poll)}`)}
                poll={poll}
              />
            ))}
          </PollSection>

          <PollSection
            count={finalizedPolls.length}
            emptyIcon={<CheckCircle2 size={22} />}
            emptyText="Noch keine abgeschlossenen Umfragen."
            id="admin-polls-finalized"
            title="Abgeschlossen"
          >
            {finalizedPolls.map((poll) => (
              <PollAdminCard
                key={poll._id}
                onDelete={() =>
                  setConfirmAction({ type: "delete", poll })
                }
                onOpen={() => navigate(`/abende/${getEveningId(poll)}`)}
                onReopen={() =>
                  setConfirmAction({ type: "reopen", poll })
                }
                poll={poll}
              />
            ))}
          </PollSection>
        </>
      )}

      {selectedPollEveningId && (
        <PollCreateModal
          eveningId={selectedPollEveningId}
          onClose={() => setSelectedPollEveningId(null)}
          onSuccess={handlePollCreated}
        />
      )}

      <ConfirmDialog
        busy={actionBusy}
        busyLabel={confirmation.busyLabel}
        confirmLabel={confirmation.confirmLabel}
        danger={confirmation.danger}
        icon={confirmation.icon}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmedAction}
        open={Boolean(confirmAction)}
        title={confirmation.title}
      >
        <p>{confirmation.description}</p>
      </ConfirmDialog>
    </div>
  );
}

function PollSection({ children, count, emptyIcon, emptyText, id, title }) {
  return (
    <section className="admin-polls-section" aria-labelledby={id}>
      <div className="admin-polls-section__heading">
        <h2 id={id}>{title}</h2>
        <span>{count}</span>
      </div>
      {count > 0 ? (
        <div className="admin-polls-list">{children}</div>
      ) : (
        <Card className="admin-polls-empty" padding="sm" variant="muted">
          <span aria-hidden="true">{emptyIcon}</span>
          <p>{emptyText}</p>
        </Card>
      )}
    </section>
  );
}

function MissingPollCard({ evening, onCreate, onOpen }) {
  const host = evening.spielleiterRef;
  const location = evening.location || host?.displayName || "Ort noch offen";

  return (
    <Card
      as="article"
      className="admin-poll-card admin-poll-card--missing"
      padding="md"
    >
      <div className="admin-poll-card__header">
        <div className="admin-poll-card__title">
          <span>Spielabend</span>
          <h3>Spieljahr {evening.spieljahr || "–"}</h3>
          <p aria-label={`Ort: ${location}`}>
            <span className="admin-poll-card__host" aria-hidden="true">
              {host?.displayName?.trim().charAt(0).toUpperCase() || "?"}
              {host?.profileImageUrl && (
                <img
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  src={host.profileImageUrl}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
            </span>
            {location}
          </p>
        </div>
        <div className="admin-poll-card__status">
          <StatusBadge label="Ohne Umfrage" tone="warning" />
          {evening.isTestData && <StatusBadge label="Test" tone="warning" />}
        </div>
      </div>

      <div className="admin-poll-card__actions">
        <Button
          aria-label="Spielabend öffnen"
          iconOnly
          onClick={onOpen}
          size="sm"
          title="Spielabend öffnen"
          variant="secondary"
        >
          <ExternalLink size={18} />
        </Button>
        <Button
          leadingIcon={<CalendarPlus size={18} />}
          onClick={onCreate}
          size="sm"
        >
          Umfrage
        </Button>
      </div>
    </Card>
  );
}

function PollAdminCard({ onDelete, onFinalize, onOpen, onReopen, poll }) {
  const finalized = Boolean(poll.finalizedOption);
  const evening = poll.eveningId;
  const eveningId = getEveningId(poll);
  const sortedOptions = getSortedOptions(poll);

  return (
    <Card
      as="article"
      className={`admin-poll-card admin-poll-card--${
        finalized ? "finalized" : "active"
      }`}
      padding="md"
    >
      <div className="admin-poll-card__header">
        <div className="admin-poll-card__title">
          <span>{finalized ? "Fixierter Termin" : "Terminumfrage"}</span>
          <h3>
            {finalized
              ? formatFullDate(poll.finalizedOption)
              : getPollRange(poll)}
          </h3>
          <p>
            {finalized && (
              <>
                <Clock3 size={16} aria-hidden="true" />
                {formatSwissTime(poll.finalizedOption)}
                <span aria-hidden="true">·</span>
              </>
            )}
            Spieljahr {evening?.spieljahr || "–"}
          </p>
        </div>
        <div className="admin-poll-card__status">
          <StatusBadge
            label={finalized ? "Fixiert" : "Offen"}
            tone={finalized ? "success" : "warning"}
          />
          {poll.isTestData && <StatusBadge label="Test" tone="warning" />}
        </div>
      </div>

      <div className="admin-poll-options">
        {sortedOptions.map((option) => {
          const isFinal =
            finalized &&
            new Date(option.date).toISOString() ===
              new Date(poll.finalizedOption).toISOString();
          const voters = getVoters(option);

          return (
            <div
              className={`admin-poll-option${
                isFinal ? " admin-poll-option--chosen" : ""
              }`}
              key={`${poll._id}-${option.date}`}
            >
              <span className="admin-poll-option__date">
                <CalendarDays size={17} aria-hidden="true" />
                <time dateTime={new Date(option.date).toISOString()}>
                  {formatOptionDate(option.date)}
                </time>
              </span>
              <span className="admin-poll-option__time">
                <Clock3 size={17} aria-hidden="true" />
                {formatSwissTime(option.date)}
              </span>

              {!finalized && (
                <Button
                  aria-label={`${formatFullDate(option.date)} um ${formatSwissTime(
                    option.date,
                  )} fixieren`}
                  className="admin-poll-option__finalize"
                  iconOnly
                  onClick={() => onFinalize(option)}
                  size="sm"
                  title="Termin fixieren"
                  variant="secondary"
                >
                  <LockKeyhole size={18} />
                </Button>
              )}

              {isFinal && (
                <CheckCircle2
                  aria-label="Fixierter Termin"
                  className="admin-poll-option__chosen-icon"
                  size={20}
                />
              )}

              <div className="admin-poll-option__votes">
                <span>
                  <Users size={16} aria-hidden="true" />
                  {getVoteLabel(voters.length)}
                </span>
                <AvatarStack max={5} showNames users={voters} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="admin-poll-card__actions">
        {eveningId && (
          <Button
            aria-label="Spielabend öffnen"
            iconOnly
            onClick={onOpen}
            size="sm"
            title="Spielabend öffnen"
            variant="secondary"
          >
            <ExternalLink size={18} />
          </Button>
        )}
        {finalized && (
          <Button
            aria-label="Umfrage neu öffnen"
            iconOnly
            onClick={onReopen}
            size="sm"
            title="Umfrage neu öffnen"
            variant="secondary"
          >
            <RotateCcw size={18} />
          </Button>
        )}
        <Button
          aria-label="Umfrage löschen"
          iconOnly
          onClick={onDelete}
          size="sm"
          title="Umfrage löschen"
          variant="danger-ghost"
        >
          <Trash2 size={18} />
        </Button>
      </div>
    </Card>
  );
}

function getConfirmationContent(action) {
  if (action?.type === "finalize") {
    return {
      busyLabel: "Wird fixiert …",
      confirmLabel: "Termin fixieren",
      danger: false,
      description: `${formatFullDate(action.option.date)}, ${formatSwissTime(
        action.option.date,
      )} wird als Termin übernommen.`,
      icon: <LockKeyhole size={24} />,
      title: "Termin fixieren?",
    };
  }

  if (action?.type === "reopen") {
    return {
      busyLabel: "Wird geöffnet …",
      confirmLabel: "Neu öffnen",
      danger: false,
      description:
        "Der fixierte Termin wird aufgehoben und die Abstimmung wieder geöffnet.",
      icon: <RotateCcw size={24} />,
      title: "Umfrage neu öffnen?",
    };
  }

  return {
    busyLabel: "Wird gelöscht …",
    confirmLabel: "Löschen",
    danger: true,
    description:
      "Die Umfrage und alle abgegebenen Stimmen werden dauerhaft gelöscht.",
    icon: <Trash2 size={24} />,
    title: "Umfrage löschen?",
  };
}

function AdminPollsSkeleton() {
  return (
    <div className="admin-polls-skeleton" aria-label="Umfragen werden geladen">
      {Array.from({ length: 3 }).map((_, index) => (
        <section key={index}>
          <SkeletonBlock className="admin-polls-skeleton__heading" />
          <Card className="admin-polls-skeleton__card" padding="md">
            <SkeletonBlock className="admin-polls-skeleton__title" />
            <SkeletonBlock className="admin-polls-skeleton__meta" />
            <SkeletonBlock className="admin-polls-skeleton__option" />
            <SkeletonBlock className="admin-polls-skeleton__option" />
          </Card>
        </section>
      ))}
    </div>
  );
}
