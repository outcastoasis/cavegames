// frontend/src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useOutletContext, useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  Gamepad2,
  Info,
  MapPinHouse,
  Trophy,
  Users,
} from "lucide-react";
import "../styles/pages/Home.css";
import "../styles/pages/Abende.css"; // Re-use Abende badge/toggle styles
import { EveningListSkeleton } from "../components/ui/Skeleton";

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
    lastPoints: null,
    myEvenings: 0,
  });
  const [sayingSeed] = useState(() => Math.random());

  useEffect(() => {
    setTitle("Cavegames");
    fetchNextEvening();
  }, []);

  const buildDashboardStats = (evenings) => {
    const myEvenings = evenings.filter((e) =>
      e.participantRefs?.some((p) => p._id === user._id),
    );
    const hostedEvenings = evenings.filter(
      (e) => e.spielleiterRef?._id === user._id,
    ).length;
    const lastPlayedEvening = myEvenings
      .filter((e) => e.status === "abgeschlossen" && e.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const lastPoints =
      lastPlayedEvening?.playerPoints?.find((p) => p.userId === user._id)
        ?.points ?? null;

    return {
      hostedEvenings,
      lastPoints,
      myEvenings: myEvenings.length,
    };
  };

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
      setDashboardStats(buildDashboardStats(active));
    } catch (err) {
      console.error("Fehler beim Laden:", err);
    } finally {
      await fetchNotifications(active);
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

    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const fetchNotifications = async (activeEvenings) => {
    const notes = [];

    activeEvenings.forEach((e) => {
      const isLeader = e.spielleiterRef?._id === user._id;

      if (isLeader && e.status === "offen" && !e.date && !e.pollId) {
        notes.push({
          type: "info",
          text: "Du wurdest als Spielleiter eingeteilt. \nBitte erstelle eine Umfrage.",
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

              if (optionVotes.some((v) => v._id?.toString() === user._id)) {
                hasVoted = true;
                break;
              }
            }
          }

          if (!hasVoted) {
            notes.push({
              type: "warning",
              text: "Neue Termin-Umfrage. \nBitte abstimmen!",
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

  const formatEveningDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("de-CH", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        })
      : "Datum offen";

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

  const renderEveningCard = (abend, variant = "default") => {
    const isFixiert = abend.status === "fixiert";
    const isTeilnehmer = abend.participantRefs?.some((p) => p._id === user._id);
    const hasOpenPoll = abend.status === "offen" && !abend.date && abend.pollId;
    const winnerNames = (abend.winnerIds || [])
      .map((id) => abend.participantRefs?.find((p) => p._id === id)?.displayName)
      .filter(Boolean);

    return (
      <div
        key={abend._id}
        className={`home-evening-card home-evening-card--${variant} home-evening-card-status-${abend.status}`}
        onClick={(event) => {
          if (event.target.closest(".home-evening-actions")) return;

          if (hasOpenPoll) {
            navigate("/umfragen");
            return;
          }

          navigate(`/abende/${abend._id}`);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter") navigate(`/abende/${abend._id}`);
        }}
      >
        <div className="home-evening-header">
          <div className="home-evening-date">
            <CalendarDays size={18} />
            <span>{formatEveningDate(abend.date)}</span>
          </div>

          <span className={`badge-abende status-${abend.status}`}>
            {abend.status.toUpperCase()}
          </span>
        </div>

        <div className="home-evening-meta">
          <div className="home-evening-host">
            <MapPinHouse size={16} />
            {abend.spielleiterRef?.displayName || "-"}
          </div>
          <div className="home-evening-facts">
            <span>
              <Users size={14} />
              {abend.participantRefs?.length ?? 0}
            </span>
            <span>
              <Gamepad2 size={14} />
              {abend.games?.length ?? 0}
            </span>
            <span>
              <Calendar size={14} />
              {abend.spieljahr}
            </span>
          </div>
        </div>

        {variant === "last" && winnerNames.length > 0 && (
          <div className="home-evening-result">
            <Trophy size={16} />
            <span>Tagessieger: {winnerNames.join(", ")}</span>
          </div>
        )}

        {isFixiert && (
          <div
            className="home-evening-actions"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="home-participation">
              <span className="home-participation-label">Teilnahme</span>
              <label className="toggle-label small">
                <input
                  type="checkbox"
                  checked={isTeilnehmer}
                  onChange={(event) =>
                    event.target.checked
                      ? handleJoin(abend._id)
                      : handleLeave(abend._id)
                  }
                />
                <span className="toggle-slider" />
                <span className="toggle-text">
                  {isTeilnehmer ? "Dabei" : "Nicht dabei"}
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="abende-page home-page">
      <div className="welcome-box home-welcome">
        <div className="welcome-title">
          Willkommen zurück, {user.displayName}!
        </div>
      </div>

      {loading && <EveningListSkeleton count={2} />}

      {!loading && notificationList.length > 0 && (
        <div className="home-alerts">
          {notificationList.map((n, i) => (
            <div
              key={i}
              className={`dashboard-alert ${n.type}`}
              onClick={() => navigate(n.target)}
            >
              {n.type === "info" && <Info size={20} />}
              {n.type === "warning" && <AlertTriangle size={20} />}

              <span style={{ flex: 1 }}>{n.text}</span>

              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {!loading && todayEvening && (
        <section className="home-section home-section--primary">
          <div className="home-section-heading">
            <h3>Heute Abend</h3>
          </div>
          {renderEveningCard(todayEvening, "primary")}
        </section>
      )}

      {!loading && !todayEvening && nextEvening && (
        <section className="home-section home-section--primary">
          <div className="home-section-heading">
            <h3>Nächster Spieleabend</h3>
            <span>in {calculateDaysLeft(nextEvening.date)} Tagen</span>
          </div>
          {renderEveningCard(nextEvening, "primary")}
        </section>
      )}

      {!loading && lastEvening && (
        <section className="home-section">
          <div className="home-section-heading">
            <h3>Letzter Spieleabend</h3>
          </div>
          {renderEveningCard(lastEvening, "last")}
        </section>
      )}

      {!loading && (
        <section className="home-section">
          <div className="home-section-heading">
            <h3>Deine Übersicht</h3>
          </div>
          <div className="home-stats-grid">
            <div className="home-stat-card">
              <span>Deine Teilnahmen</span>
              <strong>{dashboardStats.myEvenings}</strong>
            </div>
            <div className="home-stat-card">
              <span>Als Spielleiter</span>
              <strong>{dashboardStats.hostedEvenings}</strong>
            </div>
            <div className="home-stat-card">
              <span>Letzte Punkte</span>
              <strong>{dashboardStats.lastPoints ?? "-"}</strong>
            </div>
          </div>
        </section>
      )}

      {!loading && (
        <section className="home-funfact" aria-label="Cavegames Spruch">
          <span className="home-funfact-label">Cavegames meint</span>
          <p>{getHomeSaying()}</p>
        </section>
      )}

      {!loading && !todayEvening && !nextEvening && !lastEvening && (
        <p>Derzeit ist kein kommender Abend geplant.</p>
      )}
    </div>
  );
}
