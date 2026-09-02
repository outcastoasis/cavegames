import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  CalendarDays,
  RefreshCw,
  Trophy,
  UserRoundCheck,
  Users,
} from "lucide-react";
import API from "../services/api";
import { useAuth } from "../context/authState";
import EveningCard from "../components/evenings/EveningCard";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PageLoader from "../components/ui/PageLoader";
import SegmentedControl from "../components/ui/SegmentedControl";
import { SkeletonBlock } from "../components/ui/Skeleton";
import "../styles/pages/Historie.css";

export default function Historie() {
  const { user } = useAuth();
  const { setTitle } = useOutletContext();
  const navigate = useNavigate();

  const [groupedEvenings, setGroupedEvenings] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedYear, setSelectedYear] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const fetchArchived = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    setLoadError("");

    try {
      const response = await API.get("/evenings/archived");
      const nextGroupedEvenings = response.data.reduce((grouped, evening) => {
        const year = Number(evening.spieljahr);
        if (!grouped[year]) grouped[year] = [];
        grouped[year].push(evening);
        return grouped;
      }, {});
      const sortedYears = Object.keys(nextGroupedEvenings)
        .map(Number)
        .sort((a, b) => b - a);

      setGroupedEvenings(nextGroupedEvenings);
      setSelectedYear((currentYear) =>
        sortedYears.includes(currentYear) ? currentYear : sortedYears[0] || null,
      );
    } catch (error) {
      console.error("Fehler beim Laden der Historie:", error);
      setLoadError("Die Historie konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTitle("Historie");
    fetchArchived();
  }, [fetchArchived, setTitle]);

  const years = useMemo(
    () =>
      Object.keys(groupedEvenings)
        .map(Number)
        .sort((a, b) => b - a),
    [groupedEvenings],
  );

  const evenings = useMemo(
    () => groupedEvenings[selectedYear] || [],
    [groupedEvenings, selectedYear],
  );

  const loadYearStats = useCallback(
    async (year) => {
      setSummary(null);
      setSummaryError("");
      setSummaryLoading(true);

      try {
        const [leaderResponse, eveningResponse] = await Promise.all([
          API.get(`/stats/leaderboard?year=${year}`),
          API.get(`/stats/evenings?year=${year}`),
        ]);
        const leader = leaderResponse.data[0];
        const gameLeaderCount = new Set(
          (groupedEvenings[year] || [])
            .map((evening) => evening.spielleiterRef?._id)
            .filter(Boolean)
            .map(String),
        ).size;

        setSummary({
          leaderName: leader?.name || "–",
          leaderPoints: leader?.totalPoints || 0,
          totalEvenings: eveningResponse.data.totalEvenings ?? 0,
          avgParticipants: eveningResponse.data.avgParticipants ?? 0,
          gameLeaderCount,
        });
      } catch (error) {
        console.error("Fehler beim Laden der Jahresstatistik:", error);
        setSummaryError("Die Jahresübersicht konnte nicht geladen werden.");
      } finally {
        setSummaryLoading(false);
      }
    },
    [groupedEvenings],
  );

  useEffect(() => {
    if (!selectedYear) {
      setSummary(null);
      return;
    }

    loadYearStats(selectedYear);
  }, [loadYearStats, selectedYear]);

  if (loading) {
    return (
      <div className="page-shell page-shell--compact historie-page">
        <PageLoader
          compact
          title="Historie wird geladen"
          message="Archivierte Spielabende werden vorbereitet."
        />
      </div>
    );
  }

  return (
    <div className="page-shell page-shell--compact historie-page">
      {loadError ? (
        <Card as="section" className="historie-empty-state" variant="muted">
          <span className="historie-empty-state__icon" aria-hidden="true">
            <RefreshCw size={23} />
          </span>
          <h2>Laden fehlgeschlagen</h2>
          <p>{loadError}</p>
          <Button
            leadingIcon={<RefreshCw size={18} />}
            onClick={() => fetchArchived({ showLoader: true })}
            size="sm"
            variant="secondary"
          >
            Erneut laden
          </Button>
        </Card>
      ) : years.length === 0 ? (
        <Card as="section" className="historie-empty-state" variant="muted">
          <span className="historie-empty-state__icon" aria-hidden="true">
            <CalendarDays size={23} />
          </span>
          <h2>Noch keine Historie</h2>
          <p>Archivierte Spielabende erscheinen später hier.</p>
        </Card>
      ) : (
        <>
          <SegmentedControl
            ariaLabel="Spieljahr auswählen"
            className="historie-year-selector"
            onChange={setSelectedYear}
            options={years.map((year) => ({
              label: String(year),
              value: year,
            }))}
            value={selectedYear}
          />

          <section
            className="historie-section"
            aria-labelledby="historie-summary-title"
          >
            <div className="historie-section-heading">
              <h2 id="historie-summary-title">Jahresübersicht</h2>
              <span>{selectedYear}</span>
            </div>

            <Card className="historie-summary" padding="md">
              {summaryLoading ? (
                <HistorySummarySkeleton />
              ) : summaryError ? (
                <div className="historie-summary-error">
                  <p>{summaryError}</p>
                  <Button
                    leadingIcon={<RefreshCw size={17} />}
                    onClick={() => loadYearStats(selectedYear)}
                    size="sm"
                    variant="secondary"
                  >
                    Erneut laden
                  </Button>
                </div>
              ) : (
                summary && (
                  <>
                    <div className="historie-winner">
                      <span className="historie-winner__icon" aria-hidden="true">
                        <Trophy size={25} />
                      </span>
                      <div className="historie-winner__copy">
                        <span>Jahressieger</span>
                        <strong>{summary.leaderName}</strong>
                      </div>
                      <span className="historie-winner__points">
                        {summary.leaderPoints} Punkte
                      </span>
                    </div>

                    <div className="historie-summary-grid">
                      <SummaryMetric
                        icon={<CalendarDays size={18} />}
                        label="Abende"
                        value={summary.totalEvenings}
                      />
                      <SummaryMetric
                        icon={<Users size={18} />}
                        label="Ø Teilnehmer"
                        value={summary.avgParticipants}
                      />
                      <SummaryMetric
                        icon={<UserRoundCheck size={18} />}
                        label="Spielleiter"
                        value={summary.gameLeaderCount}
                      />
                    </div>
                  </>
                )
              )}
            </Card>
          </section>

          <section
            className="historie-section"
            aria-labelledby="historie-evenings-title"
          >
            <div className="historie-section-heading">
              <h2 id="historie-evenings-title">Spielabende</h2>
              <span>{evenings.length}</span>
            </div>

            <div className="historie-evening-list">
              {evenings.map((evening) => (
                <EveningCard
                  actionLabel="Abend ansehen"
                  className="historie-evening-card"
                  currentUserId={user?._id}
                  evening={evening}
                  key={evening._id}
                  onOpen={() => navigate(`/abende/${evening._id}`)}
                  showPersonalWinBadge
                  showResult
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryMetric({ icon, label, value }) {
  return (
    <div className="historie-summary-metric">
      <span aria-hidden="true">{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function HistorySummarySkeleton() {
  return (
    <div className="historie-summary-skeleton" aria-label="Jahresübersicht wird geladen">
      <SkeletonBlock className="historie-summary-skeleton__winner" />
      <div className="historie-summary-skeleton__metrics">
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    </div>
  );
}
