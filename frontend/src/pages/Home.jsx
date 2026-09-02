// frontend/src/pages/Home.jsx
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/authState";
import { useOutletContext, useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Megaphone,
  UserRound,
  UserRoundCheck,
  Vote,
  XCircle,
  Trophy,
} from "lucide-react";
import "../styles/pages/Home.css";
import { EveningListSkeleton } from "../components/ui/Skeleton";
import ActionNotice from "../components/ui/ActionNotice";
import SegmentedControl from "../components/ui/SegmentedControl";
import StatusBadge from "../components/ui/StatusBadge";
import {
  formatSwissDate,
  formatSwissTime,
  getSwissCalendarDayDiff,
  getSwissDateKey,
} from "../utils/swissDateTime";

const homeSayings = {
  today: [
    "Heute zählt nur eins: Regeln kennen. Oder sehr überzeugend so tun.",
    "Heute wird gespielt. Snacks sind Strategie, keine Nebensache.",
    "Heute ist Revanche-Zeit. Freundschaften halten das aus. Meistens.",
    "Heute entscheidet sich, wer Glück hatte und wer es Taktik nennt.",
    "Wer die Regeln erklärt, hat automatisch ein bisschen Macht.",
  ],
  countdown: [
    "Noch genug Zeit, um die Regeln falsch zu erinnern.",
    "Die Vorfreude steigt. Die Ausreden vermutlich auch.",
    "Noch ein paar Tage Training im Kopfkino.",
    "Bald wird wieder taktiert, geblufft und freundlich diskutiert.",
    "Noch Zeit, um Lieblingsspiele subtil ins Gespräch zu bringen.",
    "Die Ruhe vor dem Würfelwurf.",
  ],
  recap: [
    "Der letzte Abend ist vorbei, aber die Diskussionen leben weiter.",
    "Statistiken sind objektiv. Ausser sie sprechen gegen einen.",
    "Nach dem Spiel ist vor der Revanche.",
    "Ein Abend endet erst, wenn alle erklärt haben, warum sie eigentlich gewonnen hätten.",
    "Ruhm vergeht. Punkte bleiben in der Statistik.",
  ],
  empty: [
    "Kein Abend geplant. Das Regelheft ruht. Noch.",
    "Der Kalender ist leer, aber die Spielesammlung wartet.",
    "Noch kein Termin. Perfekter Moment, um ein neues Lieblingsspiel vorzuschlagen.",
    "Keine Planung offen. Verdächtig friedlich.",
  ],
  facts: [
    "Catan erschien 1995 und wurde schnell zu einem modernen Brettspielklassiker.",
    "UNO wurde 1971 von Merle Robbins erfunden.",
    "Carcassonne gewann 2001 das Spiel des Jahres.",
    "Scrabble wurde 1931 von Alfred Mosher Butts entwickelt.",
    "Scrabble hiess zuerst nicht Scrabble, sondern Criss-Crosswords.",
    "Die Scrabble-Buchstabenwerte basieren auf Buchstabenhäufigkeiten.",
    "Monopoly wurde 1935 von Parker Brothers breit vermarktet.",
    "Frühe Monopoly-Figuren waren unter anderem Schuh, Zylinder und Bügeleisen.",
    "Catan wurde von Klaus Teuber entworfen, der ursprünglich Zahntechniker war.",
    "Catan gewann 1995 das Spiel des Jahres.",
    "Catan setzte stark auf Tauschen und Verhandeln als Spielgefühl.",
    "Catan verwendet Hexfelder, weil sie Inseln flexibler wirken lassen als Quadrate.",
    "Carcassonne wurde von Klaus-Jürgen Wrede entworfen.",
    "Carcassonne erschien im Jahr 2000 und ist ein Legespiel.",
    "Bei Carcassonne entstehen Städte, Strassen und Wiesen erst während der Partie.",
    "Azul wurde von Michael Kiesling entworfen und erschien 2017.",
    "Azul ist von portugiesischen Keramikfliesen, den Azulejos, inspiriert.",
    "Azul gewann 2018 das Spiel des Jahres.",
    "Dixit erschien 2008 und setzt stark auf Fantasie und Assoziationen.",
    "Dixit gewann 2010 das Spiel des Jahres.",
    "Bei Dixit ist ein Hinweis oft dann gut, wenn er weder zu klar noch zu kryptisch ist.",
    "Pandemic erschien 2008 und machte kooperative Spiele einem breiteren Publikum bekannt.",
    "Bei Pandemic gewinnen oder verlieren alle gemeinsam.",
    "Pandemic wurde von Matt Leacock entworfen.",
    "Ticket to Ride erschien 2004 und dreht sich um Zugstrecken und Zielkarten.",
    "Ticket to Ride wurde von Alan R. Moon entworfen.",
    "Schach hat einen alten Vorläufer namens Chaturanga aus Indien.",
    "Chaturanga ist etwa seit dem 7. Jahrhundert bekannt.",
    "Spielkarten wurden wahrscheinlich in China erfunden.",
    "Spielkarten existierten in China sicher schon zur Zeit der Yuan-Dynastie.",
    "Ein guter Bluff braucht Selbstvertrauen. Ein sehr guter Bluff braucht ein Pokerface.",
    "Hausregeln entstehen oft genau dann, wenn jemand gerade verloren hat.",
    "Würfel sind kleine Zufallsgeneratoren mit sehr grosser Meinung.",
  ],
};

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
  const [dashboardStats, setDashboardStats] = useState({
    hostedEvenings: 0,
    myEvenings: 0,
  });
  const [sayingSeed] = useState(() => Math.random());

  const buildDashboardStats = useCallback((evenings) => {
    const myEvenings = evenings.filter((e) =>
      e.participantRefs?.some((p) => p._id === user._id),
    );
    const hostedEvenings = evenings.filter(
      (e) => e.spielleiterRef?._id === user._id,
    ).length;
    return {
      hostedEvenings,
      myEvenings: myEvenings.length,
    };
  }, [user._id]);

  const fetchNotifications = useCallback(async (activeEvenings) => {
    const notes = [];

    activeEvenings.forEach((e) => {
      const isLeader =
        String(e.spielleiterRef?._id) === String(user._id);

      if (isLeader && e.status === "offen" && !e.date && !e.pollId) {
        notes.push({
          type: "leader",
          title: "Du bist Spielleiter!",
          description: "Bitte erstelle eine Termin-Umfrage.",
          target: "/abende",
        });
      }
    });

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

              if (
                optionVotes.some(
                  (v) => String(v?._id ?? v) === String(user._id),
                )
              ) {
                hasVoted = true;
                break;
              }
            }
          }

          if (!hasVoted) {
            notes.push({
              type: "poll",
              title: "Offene Umfrage",
              description: "Stimme f\u00fcr den n\u00e4chsten Termin ab.",
              target: "/umfragen",
            });
          }
        } catch (err) {
          console.error("Fehler beim Laden der Umfrage:", err);
        }
      }
    }

    setNotificationList(notes);
  }, [user._id]);

  const fetchNextEvening = useCallback(async () => {
    let active = [];

    try {
      const res = await API.get("/evenings");
      const allEvenings = res.data;
      active = allEvenings.filter((e) => e.status !== "gesperrt");

      const now = new Date();
      const todayStr = getSwissDateKey(now);

      let today = null;
      const future = [];
      const past = [];

      active.forEach((e) => {
        if (!e.date) return;
        const eDate = new Date(e.date);
        const eStr = getSwissDateKey(e.date);

        if (eStr === todayStr) {
          today = e;
        } else if (eDate > now) {
          future.push(e);
        }
      });

      allEvenings.forEach((e) => {
        if (
          e.date &&
          new Date(e.date) < now &&
          ["abgeschlossen", "gesperrt"].includes(e.status)
        ) {
          past.push(e);
        }
      });

      future.sort((a, b) => new Date(a.date) - new Date(b.date));
      past.sort((a, b) => new Date(b.date) - new Date(a.date));

      setTodayEvening(today);
      setNextEvening(future[0] || null);
      setLastEvening(past[0] || null);
      setDashboardStats(buildDashboardStats(allEvenings));
    } catch (err) {
      console.error("Fehler beim Laden:", err);
    } finally {
      await fetchNotifications(active);
      setLoading(false);
    }
  }, [buildDashboardStats, fetchNotifications]);

  useEffect(() => {
    setTitle("Cavegames");
    fetchNextEvening();
  }, [fetchNextEvening, setTitle]);

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
    return getSwissCalendarDayDiff(dateStr);
  };

  const formatEveningDate = (date) =>
    date
      ? formatSwissDate(date, {
          weekday: "short",
          day: "2-digit",
          month: "long",
        })
      : "Datum offen";

  const formatEveningTime = (date) =>
    date
      ? formatSwissTime(date, {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const getHomeSaying = () => {
    let pool = homeSayings.facts;

    if (todayEvening) {
      pool = [...homeSayings.today, ...homeSayings.facts];
    } else if (nextEvening) {
      pool = [...homeSayings.countdown, ...homeSayings.facts];
    } else if (lastEvening) {
      pool = [...homeSayings.recap, ...homeSayings.facts];
    } else {
      pool = [...homeSayings.empty, ...homeSayings.facts];
    }

    return pool[Math.floor(sayingSeed * pool.length)];
  };

  const getCountdownLabel = (date) => {
    const days = calculateDaysLeft(date);

    if (days === 1) return "morgen";
    return `in ${days} Tagen`;
  };

  const renderEveningCard = (abend, variant = "default") => {
    const isFixiert = abend.status === "fixiert";
    const isTeilnehmer = abend.participantRefs?.some((p) => p._id === user._id);
    const hasOpenPoll = abend.status === "offen" && !abend.date && abend.pollId;
    const hasRecordedGames = (abend.games?.length || 0) > 0;
    const winnerPlayers = (abend.winnerIds || [])
      .map((id) =>
        abend.participantRefs?.find((p) => String(p._id) === String(id)),
      )
      .filter(Boolean);
    const userPoints = abend.playerPoints?.find(
      (entry) => String(entry.userId) === String(user._id),
    )?.points;
    const isCurrentUserWinner = winnerPlayers.some(
      (winner) => String(winner._id) === String(user._id),
    );
    const host = abend.spielleiterRef;
    const openEvening = () =>
      navigate(hasOpenPoll ? "/umfragen" : `/abende/${abend._id}`);

    return (
      <article
        key={abend._id}
        className={`home-evening-card home-evening-card--${variant} home-evening-card-status-${abend.status} ${
          variant === "last" && abend.groupPhotoUrl
            ? "home-evening-card--with-photo"
            : ""
        }`}
        onClick={(event) => {
          if (event.target.closest(".home-evening-actions")) return;
          openEvening();
        }}
        role="link"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target.closest(".home-evening-actions")) return;

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openEvening();
          }
        }}
        aria-label={`${formatEveningDate(abend.date)} öffnen`}
      >
        {variant === "last" && abend.groupPhotoUrl && (
          <img
            className="home-evening-photo"
            src={abend.groupPhotoUrl}
            srcSet={abend.groupPhotoSrcSet || undefined}
            sizes="(max-width: 600px) calc(100vw - 3rem), 850px"
            width={abend.groupPhotoWidth || undefined}
            height={abend.groupPhotoHeight || undefined}
            alt="Bild des letzten Spieleabends"
            loading="lazy"
            decoding="async"
          />
        )}

        <div className="home-evening-header">
          <div className="home-evening-date">
            <CalendarDays size={19} aria-hidden="true" />
            <span>{formatEveningDate(abend.date)}</span>
            {formatEveningTime(abend.date) && (
              <>
                <span className="home-date-separator" aria-hidden="true">
                  •
                </span>
                <span>{formatEveningTime(abend.date)}</span>
              </>
            )}
          </div>

          {variant === "last" && isCurrentUserWinner ? (
            <span className="home-result-title">
              <Trophy size={17} aria-hidden="true" />
              Tagessieg
            </span>
          ) : (
            <StatusBadge status={abend.status} />
          )}
        </div>

        {variant !== "last" && (
          <div className="home-evening-people">
            <div className="home-person-summary">
              <span className="home-avatar" aria-hidden="true">
                {host?.profileImageUrl ? (
                  <img src={host.profileImageUrl} alt="" />
                ) : (
                  <UserRound size={20} />
                )}
              </span>
              <span>
                <small>Spielleiter</small>
                <strong>{host?.displayName || "Noch offen"}</strong>
              </span>
            </div>
            <div className="home-person-summary">
              <span className="home-avatar home-avatar--neutral" aria-hidden="true">
                <UserRound size={20} />
              </span>
              <span>
                <small>Teilnehmer</small>
                <strong>{abend.participantRefs?.length ?? 0} zugesagt</strong>
              </span>
            </div>
          </div>
        )}

        {variant === "last" && winnerPlayers.length > 0 && (
          <div className="home-result-block">
            <div className="home-result-summary">
              <div className="home-result-column">
                <span className="home-result-label">Sieger</span>
                <div className="home-winner-list">
                  {winnerPlayers.map((winner) => (
                    <div className="home-winner" key={winner._id}>
                      <span className="home-winner-avatar" aria-hidden="true">
                        {winner.profileImageUrl ? (
                          <img src={winner.profileImageUrl} alt="" />
                        ) : (
                          <UserRound size={18} />
                        )}
                      </span>
                      <strong>
                        {winner.displayName}
                        {String(winner._id) === String(user._id) ? " (Du)" : ""}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
              {userPoints != null && (
                <div className="home-result-column home-result-column--score">
                  <span className="home-result-label">Deine Punkte</span>
                  <strong>{userPoints}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {variant === "last" && (
          <div className="home-card-link-hint" aria-hidden="true">
            <span>Abend ansehen</span>
            <ChevronRight size={19} />
          </div>
        )}

        {isFixiert && !hasRecordedGames && (
          <div
            className="home-evening-actions"
            onClick={(event) => event.stopPropagation()}
          >
            <SegmentedControl
              ariaLabel="Teilnahme auswählen"
              value={isTeilnehmer ? "yes" : "no"}
              onChange={(nextValue) =>
                nextValue === "yes"
                  ? handleJoin(abend._id)
                  : handleLeave(abend._id)
              }
              disabled={busy}
              options={[
                {
                  value: "yes",
                  label: "Dabei",
                  tone: "success",
                  icon: <CheckCircle2 size={18} />,
                },
                {
                  value: "no",
                  label: "Nicht dabei",
                  icon: <XCircle size={18} />,
                },
              ]}
            />
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="page-shell home-page">
      <section className="home-welcome" aria-labelledby="home-greeting">
        <span className="home-welcome-avatar" aria-hidden="true">
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="" />
          ) : (
            <UserRound size={25} />
          )}
        </span>
        <div className="home-welcome-copy">
          <h1 id="home-greeting">Hallo, {user.displayName?.split(" ")[0]}!</h1>
          <p>Spielabende, Hinweise und Highlights auf einen Blick.</p>
        </div>
      </section>

      {loading && <EveningListSkeleton count={2} />}

      {!loading && notificationList.length > 0 && (
        <section className="home-alerts" aria-label="Offene Aufgaben">
          {notificationList.map((n, i) => (
            <ActionNotice
              key={i}
              tone={n.type === "leader" ? "warning" : "primary"}
              icon={
                n.type === "leader" ? (
                  <Megaphone size={21} />
                ) : (
                  <Vote size={21} />
                )
              }
              title={n.title}
              onClick={() => navigate(n.target)}
            >
              {n.description}
            </ActionNotice>
          ))}
        </section>
      )}

      {!loading && todayEvening && (
        <section className="home-section home-section--primary">
          <div className="home-section-heading">
            <h2>Heute Abend</h2>
          </div>
          {renderEveningCard(todayEvening, "primary")}
        </section>
      )}

      {!loading && !todayEvening && nextEvening && (
        <section className="home-section home-section--primary">
          <div className="home-section-heading">
            <h2>Nächster Abend</h2>
            <span>{getCountdownLabel(nextEvening.date)}</span>
          </div>
          {renderEveningCard(nextEvening, "primary")}
        </section>
      )}

      {!loading && lastEvening && (
        <section className="home-section">
          <div className="home-section-heading">
            <h2>Zuletzt gespielt</h2>
          </div>
          {renderEveningCard(lastEvening, "last")}
        </section>
      )}

      {!loading && (
        <section className="home-section">
          <div className="home-section-heading">
            <h2>Deine Highlights</h2>
          </div>
          <div className="home-stats-grid">
            <div className="home-stat-card">
              <span className="home-stat-icon home-stat-icon--games" aria-hidden="true">
                <UserRoundCheck size={20} />
              </span>
              <strong>{dashboardStats.myEvenings}</strong>
              <span>Deine Teilnahmen</span>
            </div>
            <div className="home-stat-card">
              <span className="home-stat-icon home-stat-icon--host" aria-hidden="true">
                <Megaphone size={20} />
              </span>
              <strong>{dashboardStats.hostedEvenings}</strong>
              <span>Mal Spielleiter</span>
            </div>
          </div>
        </section>
      )}

      {!loading && (
        <section className="home-funfact" aria-label="Cavegames Spruch">
          <span className="home-funfact-icon" aria-hidden="true">
            <Lightbulb size={22} />
          </span>
          <div>
            <h2>Wusstest du schon?</h2>
            <p>{getHomeSaying()}</p>
          </div>
        </section>
      )}

      {!loading && !todayEvening && !nextEvening && !lastEvening && (
        <p className="home-empty-state">Derzeit ist kein kommender Abend geplant.</p>
      )}

    </div>
  );
}
