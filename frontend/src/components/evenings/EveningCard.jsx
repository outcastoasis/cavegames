import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Gamepad2,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import StatusBadge from "../ui/StatusBadge";
import {
  formatSwissDate,
  formatSwissTime,
} from "../../utils/swissDateTime";
import "../../styles/components/EveningCard.css";

const formatEveningDate = (date, dateFormat = "long") =>
  date
    ? formatSwissDate(date, {
        weekday: "short",
        day: "2-digit",
        month: dateFormat === "short" ? "short" : "long",
      })
    : "Datum offen";

const formatEveningTime = (date) =>
  date
    ? formatSwissTime(date, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

export default function EveningCard({
  actionLabel,
  className = "",
  currentUserId,
  dateFormat = "long",
  emphasis = false,
  evening,
  footer = null,
  onOpen,
  showPersonalWinBadge = false,
  showPhoto = false,
  showResult = false,
}) {
  const host = evening.spielleiterRef;
  const winners = (evening.winnerIds || [])
    .map((id) =>
      evening.participantRefs?.find(
        (participant) =>
          String(participant._id) === String(id?._id ?? id),
      ),
    )
    .filter(Boolean);
  const currentUserPoints = evening.playerPoints?.find(
    (entry) =>
      String(entry.userId?._id ?? entry.userId) === String(currentUserId),
  )?.points;
  const currentUserWon = winners.some(
    (winner) => String(winner._id) === String(currentUserId),
  );
  const time = formatEveningTime(evening.date);
  const interactive = Boolean(onOpen);
  const classes = [
    "evening-card",
    `evening-card--status-${evening.status || "unknown"}`,
    emphasis ? "evening-card--featured" : "",
    showPhoto && evening.groupPhotoUrl ? "evening-card--with-photo" : "",
    interactive ? "evening-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleKeyDown = (event) => {
    if (!interactive || event.target.closest(".evening-card__footer")) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <article
      className={classes}
      onClick={(event) => {
        if (!interactive || event.target.closest(".evening-card__footer")) {
          return;
        }
        onOpen();
      }}
      onKeyDown={handleKeyDown}
      role={interactive ? "link" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={
        interactive
          ? `${formatEveningDate(evening.date, dateFormat)} öffnen`
          : undefined
      }
    >
      {showPhoto && evening.groupPhotoUrl && (
        <img
          className="evening-card__photo"
          src={evening.groupPhotoUrl}
          srcSet={evening.groupPhotoSrcSet || undefined}
          sizes="(max-width: 600px) calc(100vw - 3rem), 850px"
          width={evening.groupPhotoWidth || undefined}
          height={evening.groupPhotoHeight || undefined}
          alt="Bild des Spieleabends"
          loading="lazy"
          decoding="async"
        />
      )}

      <div className="evening-card__header">
        <div className="evening-card__date">
          <CalendarDays size={19} aria-hidden="true" />
          <span>{formatEveningDate(evening.date, dateFormat)}</span>
        </div>

        {showPersonalWinBadge && currentUserWon ? (
          <span className="evening-card__win-badge">
            <Trophy size={17} aria-hidden="true" />
            Tagessieg
          </span>
        ) : (
          <StatusBadge status={evening.status} />
        )}
      </div>

      {!showResult && (
        <div className="evening-card__details">
          <PersonSummary
            imageUrl={host?.profileImageUrl}
            label="Spielleiter"
            value={host?.displayName || "Noch offen"}
          />
          <QuickFacts
            gameCount={evening.games?.length ?? 0}
            participantCount={evening.participantRefs?.length ?? 0}
            time={time}
          />
        </div>
      )}

      {showResult && (
        <QuickFacts
          className="evening-card__quick-facts--result"
          gameCount={evening.games?.length ?? 0}
          participantCount={evening.participantRefs?.length ?? 0}
          time={time}
        />
      )}

      {showResult && winners.length > 0 && (
        <div className="evening-card__result">
          <div className="evening-card__result-column">
            <span className="evening-card__result-label">Sieger</span>
            <div className="evening-card__winners">
              {winners.map((winner) => (
                <div className="evening-card__winner" key={winner._id}>
                  <span className="evening-card__winner-avatar" aria-hidden="true">
                    {winner.profileImageUrl ? (
                      <img src={winner.profileImageUrl} alt="" />
                    ) : (
                      <UserRound size={18} />
                    )}
                  </span>
                  <strong>
                    {winner.displayName}
                    {String(winner._id) === String(currentUserId) ? " (Du)" : ""}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {currentUserPoints != null && (
            <div className="evening-card__result-column evening-card__result-column--score">
              <span className="evening-card__result-label">Deine Punkte</span>
              <strong>{currentUserPoints}</strong>
            </div>
          )}
        </div>
      )}

      {actionLabel && interactive && (
        <div className="evening-card__link-hint" aria-hidden="true">
          <span>{actionLabel}</span>
          <ChevronRight size={19} />
        </div>
      )}

      {footer && (
        <div
          className="evening-card__footer"
          onClick={(event) => event.stopPropagation()}
        >
          {footer}
        </div>
      )}
    </article>
  );
}

function PersonSummary({
  imageUrl,
  label,
  value,
}) {
  return (
    <div className="evening-card__person">
      <span className="evening-card__avatar" aria-hidden="true">
        {imageUrl ? (
          <img src={imageUrl} alt="" />
        ) : (
          <UserRound size={20} />
        )}
      </span>
      <span className="evening-card__person-copy">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function QuickFacts({ className = "", gameCount, participantCount, time }) {
  return (
    <div className={`evening-card__quick-facts ${className}`.trim()}>
      {time && (
        <QuickFact icon={<Clock3 size={17} />} label="Uhrzeit" value={time} />
      )}
      <QuickFact
        icon={<Users size={17} />}
        label="Teilnehmer"
        value={participantCount}
      />
      <QuickFact
        icon={<Gamepad2 size={17} />}
        label="Spiele"
        value={gameCount}
      />
    </div>
  );
}

function QuickFact({ icon, label, value }) {
  return (
    <span className="evening-card__quick-fact">
      <span className="evening-card__quick-fact-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="evening-card__visually-hidden">{label}: </span>
      <strong>{value}</strong>
    </span>
  );
}
