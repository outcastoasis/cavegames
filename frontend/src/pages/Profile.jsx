import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Award,
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Gauge,
  Medal,
  Percent,
  RefreshCw,
  Shield,
  Trophy,
  UserRoundCheck,
} from "lucide-react";
import { useAuth } from "../context/authState";
import { useTestMode } from "../context/testMode";
import API from "../services/api";
import ActivityHeatmap from "../components/charts/ActivityHeatmap";
import BarYearComparison from "../components/charts/BarYearComparison";
import ChartPlaceholder from "../components/charts/ChartPlaceholder";
import ChartWrapper from "../components/charts/ChartWrapper";
import LinePointsChart from "../components/charts/LinePointsChart";
import MultiYearPointsChart from "../components/charts/MultiYearPointsChart";
import MultiYearWinRateChart from "../components/charts/MultiYearWinRateChart";
import PiePlacementChart from "../components/charts/PiePlacementChart";
import defaultAvatar from "../assets/images/avatar.jpg";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import SegmentedControl from "../components/ui/SegmentedControl";
import { SkeletonBlock } from "../components/ui/Skeleton";
import Switch from "../components/ui/Switch";
import Toast from "../components/ui/Toast";
import { formatSwissDate } from "../utils/swissDateTime";
import { YEAR_STATUSES, getYearStatus } from "../utils/yearLifecycle";
import "../styles/pages/Profile.css";

const YEAR_CHART_OPTIONS = [
  { value: "placements", label: "Plätze" },
  { value: "points", label: "Punkte" },
  { value: "activity", label: "Aktivität" },
];

const MULTI_CHART_OPTIONS = [
  { value: "points", label: "Punkte" },
  { value: "winRate", label: "Siege" },
  { value: "placements", label: "Plätze" },
  { value: "activity", label: "Aktivität" },
];

function MetricCard({ icon, label, value, wide = false }) {
  return (
    <Card
      className={`profile-metric${wide ? " profile-metric--wide" : ""}`}
      padding="sm"
    >
      <span className="profile-metric__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="profile-metric__label">{label}</span>
      <strong className="profile-metric__value">{value}</strong>
    </Card>
  );
}

function SectionHeading({ count, eyebrow, title }) {
  return (
    <div className="profile-section-heading">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {count != null && <strong>{count}</strong>}
    </div>
  );
}

function LoadError({ message, onRetry }) {
  return (
    <Card as="section" className="profile-state" variant="muted">
      <RefreshCw size={22} aria-hidden="true" />
      <p>{message}</p>
      <Button
        leadingIcon={<RefreshCw size={17} />}
        onClick={onRetry}
        size="sm"
        variant="secondary"
      >
        Erneut laden
      </Button>
    </Card>
  );
}

const formatProfileNumber = (value, maximumFractionDigits = 0) => {
  if (value == null || value === "") return "–";
  const number = Number(value);
  if (!Number.isFinite(number)) return "–";

  return new Intl.NumberFormat("de-CH", {
    maximumFractionDigits,
  }).format(number);
};

const formatProfilePercent = (value) => {
  const formattedValue = formatProfileNumber(value, 1);
  return formattedValue === "–" ? "–" : `${formattedValue}%`;
};

export default function Profile() {
  const { setTitle } = useOutletContext();
  const { user, setUser } = useAuth();
  const { testMode, setTestMode } = useTestMode();
  const navigate = useNavigate();
  const userId = user?._id;

  const [yearList, setYearList] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [yearStats, setYearStats] = useState(null);
  const [multiStats, setMultiStats] = useState(null);
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingYear, setLoadingYear] = useState(false);
  const [loadingMulti, setLoadingMulti] = useState(false);
  const [yearListError, setYearListError] = useState("");
  const [yearError, setYearError] = useState("");
  const [multiError, setMultiError] = useState("");
  const [viewAllYears, setViewAllYears] = useState(false);
  const [showMoreYearStats, setShowMoreYearStats] = useState(false);
  const [activeYearChart, setActiveYearChart] = useState("placements");
  const [activeMultiChart, setActiveMultiChart] = useState("points");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const avatarInputRef = useRef(null);

  const loadYearStats = useCallback(
    async (year) => {
      if (!year || !userId) return;
      setLoadingYear(true);
      setYearError("");
      setYearStats(null);

      try {
        const response = await API.get(`/stats/user/${userId}?year=${year}`);
        setYearStats(response.data);
      } catch (error) {
        console.error("Fehler beim Laden der Jahresstatistik:", error);
        setYearError(
          error?.response?.status === 404
            ? "Für dieses Jahr ist noch keine Statistik vorhanden."
            : "Die Jahresstatistik konnte nicht geladen werden.",
        );
      } finally {
        setLoadingYear(false);
      }
    },
    [userId],
  );

  const loadAvailableYears = useCallback(async () => {
    if (!userId) return;
    setLoadingYears(true);
    setYearListError("");

    try {
      const response = await API.get("/years");
      const statisticalYears = response.data.filter(
        (item) => getYearStatus(item) !== YEAR_STATUSES.PLANNED,
      );
      const years = statisticalYears
        .map((item) => item.year)
        .sort((a, b) => b - a);
      const activeYear = statisticalYears.find(
        (item) => getYearStatus(item) === YEAR_STATUSES.ACTIVE,
      );
      const initialYear = activeYear?.year || years[0] || null;

      setYearList(years);
      setSelectedYear(initialYear);
      if (initialYear) await loadYearStats(initialYear);
    } catch (error) {
      console.error("Fehler beim Laden der Jahre:", error);
      setYearListError("Die Spieljahre konnten nicht geladen werden.");
    } finally {
      setLoadingYears(false);
    }
  }, [loadYearStats, userId]);

  const loadMultiYearStats = useCallback(async () => {
    if (!userId) return;
    setLoadingMulti(true);
    setMultiError("");

    try {
      const response = await API.get(`/stats/user/${userId}/all`);
      setMultiStats(response.data);
    } catch (error) {
      console.error("Fehler beim Laden der Gesamtstatistik:", error);
      setMultiError(
        error?.response?.status === 404
          ? "Es ist noch keine Gesamtstatistik vorhanden."
          : "Die Gesamtstatistik konnte nicht geladen werden.",
      );
    } finally {
      setLoadingMulti(false);
    }
  }, [userId]);

  useEffect(() => {
    setTitle("Profil");
    loadAvailableYears();
  }, [loadAvailableYears, setTitle]);

  const selectedYearIndex = yearList.indexOf(selectedYear);
  const previousYear =
    selectedYearIndex >= 0 ? yearList[selectedYearIndex + 1] : null;
  const nextYear = selectedYearIndex > 0 ? yearList[selectedYearIndex - 1] : null;

  const topThreeRate = useMemo(() => {
    if (!yearStats?.eveningsAttended) return 0;
    return Math.round(
      ((yearStats.firstPlaces + yearStats.secondPlaces + yearStats.thirdPlaces) /
        yearStats.eveningsAttended) *
        100,
    );
  }, [yearStats]);

  const placementsByEvening = useMemo(
    () =>
      new Map(
        (yearStats?.placementTrend || []).map((entry) => [
          String(entry.eveningId),
          entry.place,
        ]),
      ),
    [yearStats],
  );

  const showToast = useCallback((message) => setToast(message), []);

  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];
    if (!file || avatarUploading) return;

    setAvatarUploading(true);
    showToast("Profilbild wird hochgeladen …");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await API.patch(`/users/${userId}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.url) {
        setUser((currentUser) => ({
          ...currentUser,
          profileImageUrl: response.data.url,
        }));
        showToast("Profilbild aktualisiert");
      }
    } catch (error) {
      const status = error?.response?.status;
      const apiMessage = error?.response?.data?.error;

      if (status === 413) showToast(apiMessage || "Bild ist zu gross");
      else if (status === 415)
        showToast(apiMessage || "Bildformat wird nicht unterstützt");
      else showToast(apiMessage || "Profilbild konnte nicht hochgeladen werden");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handleViewChange = (view) => {
    const showAllYears = view === "all";
    setViewAllYears(showAllYears);
    if (showAllYears && !multiStats && !loadingMulti) loadMultiYearStats();
  };

  const handleYearChange = (year) => {
    if (!year || year === selectedYear) return;
    setSelectedYear(year);
    setShowMoreYearStats(false);
    loadYearStats(year);
  };

  return (
    <div className="page-shell profile-page">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="profile-header-grid">
        <Card as="section" className="profile-identity" padding="md">
          <div className="profile-avatar-section">
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              hidden
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              className="profile-avatar-button"
              onClick={() => avatarInputRef.current?.click()}
              aria-label="Profilbild ändern"
              disabled={avatarUploading}
            >
              <img
                src={user?.profileImageUrl || defaultAvatar}
                alt=""
                className="profile-avatar-image"
              />
              <span className="profile-avatar-edit" aria-hidden="true">
                <Camera size={16} />
              </span>
            </button>
          </div>

          <div className="profile-identity__copy">
            <span className="profile-identity__eyebrow">Dein Profil</span>
            <h1>{user?.displayName || "Spieler"}</h1>
            <p>@{user?.username || "–"}</p>
            {user?.role === "admin" && (
              <span className="profile-role-badge">
                <Shield size={14} aria-hidden="true" />
                Admin
              </span>
            )}
          </div>
        </Card>

        {user?.role === "admin" && (
          <Card
            as="section"
            className="profile-mode-card"
            padding="md"
            variant={testMode ? "accent" : "muted"}
          >
            <span className="profile-mode-card__icon" aria-hidden="true">
              <FlaskConical size={20} />
            </span>
            <Switch
              checked={testMode}
              description="Testdaten getrennt von Live-Daten verwenden."
              label={testMode ? "Testmodus aktiv" : "Live-Modus aktiv"}
              onChange={setTestMode}
            />
          </Card>
        )}
      </div>

      <SegmentedControl
        ariaLabel="Statistikzeitraum auswählen"
        className="profile-view-control"
        onChange={handleViewChange}
        options={[
          { label: "Jahresstatistik", value: "year" },
          { label: "Alle Jahre", value: "all" },
        ]}
        value={viewAllYears ? "all" : "year"}
      />

      {!viewAllYears && (
        <section className="profile-view" aria-labelledby="profile-year-title">
          <div className="profile-year-heading">
            <SectionHeading eyebrow="Spieljahr" title={selectedYear || "Statistik"} />

            {yearList.length > 0 && (
              <div className="profile-year-controls">
                <Button
                  aria-label="Vorheriges Jahr anzeigen"
                  disabled={!previousYear || loadingYear}
                  iconOnly
                  onClick={() => handleYearChange(previousYear)}
                  size="sm"
                  variant="secondary"
                >
                  <ChevronLeft size={19} />
                </Button>

                <select
                  aria-label="Spieljahr"
                  className="profile-year-select"
                  value={selectedYear || ""}
                  onChange={(event) => handleYearChange(Number(event.target.value))}
                  disabled={loadingYear}
                >
                  {yearList.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                <Button
                  aria-label="Nächstes Jahr anzeigen"
                  disabled={!nextYear || loadingYear}
                  iconOnly
                  onClick={() => handleYearChange(nextYear)}
                  size="sm"
                  variant="secondary"
                >
                  <ChevronRight size={19} />
                </Button>
              </div>
            )}
          </div>

          {loadingYears || loadingYear ? (
            <ProfileStatsSkeleton />
          ) : yearListError ? (
            <LoadError message={yearListError} onRetry={loadAvailableYears} />
          ) : yearError ? (
            <LoadError
              message={yearError}
              onRetry={() => loadYearStats(selectedYear)}
            />
          ) : !selectedYear ? (
            <Card className="profile-state" variant="muted">
              <CalendarDays size={22} aria-hidden="true" />
              <p>Noch keine Spieljahre vorhanden.</p>
            </Card>
          ) : (
            yearStats && (
              <>
                <div className="profile-metric-grid profile-metric-grid--primary">
                  <MetricCard icon={<Trophy size={19} />} label="Punkte" value={formatProfileNumber(yearStats.totalPoints)} />
                  <MetricCard icon={<CalendarCheck2 size={19} />} label="Teilnahmen" value={formatProfileNumber(yearStats.eveningsAttended)} />
                  <MetricCard icon={<Percent size={19} />} label="Gewinnrate" value={formatProfilePercent(yearStats.winRate)} />
                  <MetricCard icon={<Medal size={19} />} label="Ø Platz" value={formatProfileNumber(yearStats.averagePlacement, 1)} />
                </div>

                <Button
                  className="profile-more-button"
                  fullWidth
                  onClick={() => setShowMoreYearStats((expanded) => !expanded)}
                  trailingIcon={<ChevronDown className={showMoreYearStats ? "is-expanded" : ""} size={18} />}
                  variant="ghost"
                  aria-expanded={showMoreYearStats}
                >
                  {showMoreYearStats ? "Weniger Kennzahlen" : "Mehr Kennzahlen"}
                </Button>

                {showMoreYearStats && (
                  <div className="profile-metric-grid profile-metric-grid--secondary">
                    <MetricCard icon={<Gauge size={19} />} label="Ø Punkte" value={formatProfileNumber(yearStats.avgPoints, 1)} />
                    <MetricCard icon={<UserRoundCheck size={19} />} label="Teilnahmequote" value={formatProfilePercent(yearStats.attendanceRate)} />
                    <MetricCard icon={<Award size={19} />} label="Top 3" value={`${topThreeRate}%`} />
                    <MetricCard icon={<Shield size={19} />} label="Spielleiter" value={`${formatProfileNumber(yearStats.spielleiterCount)}×`} />
                    <MetricCard icon={<BarChart3 size={19} />} label="Bester Abend" value={formatProfileNumber(yearStats.bestEveningPoints)} />
                    <MetricCard icon={<BarChart3 size={19} />} label="Tiefster Abend" value={formatProfileNumber(yearStats.worstEveningPoints)} />
                    <MetricCard icon={<Trophy size={19} />} label="Top-3-Schnitt" value={formatProfileNumber(yearStats.peakPerformance, 1)} />
                  </div>
                )}

                <section className="profile-section">
                  <SectionHeading eyebrow="Auswertung" title="Dein Jahr" />
                  <SegmentedControl
                    ariaLabel="Jahresdiagramm auswählen"
                    className="profile-chart-control profile-chart-control--scroll"
                    onChange={setActiveYearChart}
                    options={YEAR_CHART_OPTIONS}
                    value={activeYearChart}
                  />

                  {activeYearChart === "placements" && (
                    <ChartWrapper title="Platzierungen">
                      {yearStats.firstPlaces + yearStats.secondPlaces + yearStats.thirdPlaces + yearStats.otherPlaces > 0 ? (
                        <PiePlacementChart data={yearStats} />
                      ) : (
                        <ChartPlaceholder text="Keine Platzierungen vorhanden" />
                      )}
                    </ChartWrapper>
                  )}

                  {activeYearChart === "points" && (
                    <ChartWrapper title="Punkteverlauf">
                      {yearStats.scoreTrend?.length ? (
                        <LinePointsChart data={yearStats.scoreTrend} />
                      ) : (
                        <ChartPlaceholder text="Noch keine Punkte vorhanden" />
                      )}
                    </ChartWrapper>
                  )}

                  {activeYearChart === "activity" && (
                    <ChartWrapper title={`Teilnahmen ${selectedYear}`}>
                      <ActivityHeatmap
                        years={[selectedYear]}
                        showYearLabel={false}
                        byYear={{
                          [selectedYear]: {
                            totalPossibleEvenings: yearStats.totalPossibleEvenings,
                            eveningsAttended: yearStats.eveningsAttended,
                          },
                        }}
                      />
                    </ChartWrapper>
                  )}
                </section>

                <section className="profile-section">
                  <SectionHeading count={yearStats.scoreTrend?.length || 0} eyebrow="Verlauf" title="Spielabende" />
                  {yearStats.scoreTrend?.length ? (
                    <ul className="profile-evening-list">
                      {yearStats.scoreTrend.map((entry, index) => {
                        const eveningId = String(entry.eveningId || "");
                        const placement = placementsByEvening.get(eveningId) ?? yearStats.placementTrend?.[index]?.place;
                        const formattedDate = formatSwissDate(entry.date, {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        });

                        return (
                          <Card as="li" key={eveningId || index} padding="none">
                            <button
                              type="button"
                              className="profile-evening-entry"
                              onClick={() => navigate(`/abende/${entry.eveningId}`)}
                              aria-label={`Spieleabend vom ${formattedDate} öffnen`}
                            >
                              <span className="profile-evening-date">
                                <CalendarDays size={18} aria-hidden="true" />
                                <strong>{formattedDate}</strong>
                              </span>
                              <span className="profile-evening-metrics">
                                <span><small>Punkte</small><strong>{formatProfileNumber(entry.points, 1)}</strong></span>
                                <span><small>Platz</small><strong>{placement == null ? "–" : formatProfileNumber(placement, 1)}</strong></span>
                              </span>
                              <span className="profile-evening-action" aria-hidden="true">
                                <span>Details</span><ChevronRight size={18} />
                              </span>
                            </button>
                          </Card>
                        );
                      })}
                    </ul>
                  ) : (
                    <Card className="profile-state" variant="muted">
                      <CalendarDays size={22} aria-hidden="true" />
                      <p>Für dieses Jahr sind noch keine Abende vorhanden.</p>
                    </Card>
                  )}
                </section>
              </>
            )
          )}
        </section>
      )}

      {viewAllYears && (
        <section className="profile-view">
          <SectionHeading eyebrow="Gesamtstatistik" title="Alle Jahre" />
          {loadingMulti ? (
            <ProfileStatsSkeleton />
          ) : multiError ? (
            <LoadError message={multiError} onRetry={loadMultiYearStats} />
          ) : (
            multiStats && (
              <>
                <div className="profile-metric-grid profile-metric-grid--global">
                  <MetricCard icon={<Trophy size={19} />} label="Punkte" value={formatProfileNumber(multiStats.global.totalPoints)} />
                  <MetricCard icon={<Gauge size={19} />} label="Ø Punkte" value={formatProfileNumber(multiStats.global.avgPoints, 1)} />
                  <MetricCard icon={<UserRoundCheck size={19} />} label="Teilnahmequote" value={formatProfilePercent(multiStats.global.attendanceRate)} />
                  <MetricCard icon={<Percent size={19} />} label="Gewinnrate" value={formatProfilePercent(multiStats.global.winRate)} />
                  <MetricCard icon={<Medal size={19} />} label="Ø Platz" value={formatProfileNumber(multiStats.global.avgPlacement, 1)} wide />
                </div>

                <section className="profile-section">
                  <SectionHeading eyebrow="Entwicklung" title="Jahresvergleich" />
                  <SegmentedControl
                    ariaLabel="Gesamtdiagramm auswählen"
                    className="profile-chart-control profile-chart-control--scroll"
                    onChange={setActiveMultiChart}
                    options={MULTI_CHART_OPTIONS}
                    value={activeMultiChart}
                  />

                  {activeMultiChart === "points" && (
                    <ChartWrapper title="Punkte pro Jahr"><MultiYearPointsChart years={multiStats.years} byYear={multiStats.byYear} /></ChartWrapper>
                  )}
                  {activeMultiChart === "winRate" && (
                    <ChartWrapper title="Gewinnrate pro Jahr"><MultiYearWinRateChart years={multiStats.years} byYear={multiStats.byYear} /></ChartWrapper>
                  )}
                  {activeMultiChart === "placements" && (
                    <ChartWrapper title="Platzierungen pro Jahr"><BarYearComparison years={multiStats.years} byYear={multiStats.byYear} /></ChartWrapper>
                  )}
                  {activeMultiChart === "activity" && (
                    <ChartWrapper title="Teilnahmen pro Jahr"><ActivityHeatmap years={multiStats.years} byYear={multiStats.byYear} /></ChartWrapper>
                  )}
                </section>

                <section className="profile-section">
                  <SectionHeading count={multiStats.years.length} eyebrow="Übersicht" title="Jahr für Jahr" />
                  <div className="profile-year-grid">
                    {multiStats.years.map((year) => {
                      const stats = multiStats.byYear[year];
                      return (
                        <Card as="article" className="profile-year-card" key={year} padding="md">
                          <h3>{year}</h3>
                          <dl>
                            <div><dt>Punkte</dt><dd>{formatProfileNumber(stats.totalPoints)}</dd></div>
                            <div><dt>Teilnahmen</dt><dd>{stats.eveningsAttended}/{stats.totalPossibleEvenings ?? "–"}</dd></div>
                            <div><dt>Gewinnrate</dt><dd>{formatProfilePercent(stats.winRate)}</dd></div>
                          </dl>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              </>
            )
          )}
        </section>
      )}
    </div>
  );
}

function ProfileStatsSkeleton() {
  return (
    <div className="profile-skeleton" aria-label="Profilstatistik wird geladen">
      <div className="profile-skeleton__metrics">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} />
        ))}
      </div>
      <SkeletonBlock className="profile-skeleton__chart" />
    </div>
  );
}
