import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import {
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Shield,
  Trophy,
} from "lucide-react";
import { useAuth } from "../context/authState";
import { useTestMode } from "../context/testMode";
import API from "../services/api";
import ChartWrapper from "../components/charts/ChartWrapper";
import ChartPlaceholder from "../components/charts/ChartPlaceholder";
import LinePointsChart from "../components/charts/LinePointsChart";
import PiePlacementChart from "../components/charts/PiePlacementChart";
import MultiYearPointsChart from "../components/charts/MultiYearPointsChart";
import MultiYearWinRateChart from "../components/charts/MultiYearWinRateChart";
import BarYearComparison from "../components/charts/BarYearComparison";
import ActivityHeatmap from "../components/charts/ActivityHeatmap";
import defaultAvatar from "../assets/images/avatar.jpg";
import Toast from "../components/ui/Toast";
import { formatSwissDate } from "../utils/swissDateTime";
import "../styles/pages/Profile.css";

function KpiCard({ title, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function ChartTabs({ label, options, activeValue, onChange }) {
  return (
    <div className="profile-chart-tabs" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`button small ${
            activeValue === option.value ? "primary active" : "neutral"
          }`}
          aria-pressed={activeValue === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const formatProfileNumber = (value, maximumFractionDigits = 0) => {
  if (value == null || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";

  return new Intl.NumberFormat("de-CH", {
    maximumFractionDigits,
  }).format(number);
};

const formatProfilePercent = (value) => {
  const formattedValue = formatProfileNumber(value, 1);
  return formattedValue === "-" ? "-" : `${formattedValue}%`;
};

export default function Profile() {
  const { setTitle } = useOutletContext();
  const { user, setUser } = useAuth();
  const { testMode, setTestMode } = useTestMode();
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = id || user?._id;

  const [yearList, setYearList] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [yearStats, setYearStats] = useState(null);
  const [multiStats, setMultiStats] = useState(null);
  const [loadingYear, setLoadingYear] = useState(false);
  const [loadingMulti, setLoadingMulti] = useState(false);
  const [viewAllYears, setViewAllYears] = useState(false);
  const [showMoreYearStats, setShowMoreYearStats] = useState(false);
  const [activeYearChart, setActiveYearChart] = useState("placements");
  const [activeMultiChart, setActiveMultiChart] = useState("points");
  const [toast, setToast] = useState(null);
  const avatarInputRef = useRef(null);

  const loadYearStats = useCallback(
    async (year) => {
      if (!year || !userId) return;
      setLoadingYear(true);
      try {
        const res = await API.get(`/stats/user/${userId}?year=${year}`);
        setYearStats(res.data);
      } catch (err) {
        console.error("Fehler beim Laden der Jahresstatistik:", err);
      } finally {
        setLoadingYear(false);
      }
    },
    [userId],
  );

  const loadAvailableYears = useCallback(async () => {
    try {
      const res = await API.get("/years");
      const yrs = res.data.map((y) => y.year).sort((a, b) => b - a);
      setYearList(yrs);
      setSelectedYear(yrs[0] || null);
      await loadYearStats(yrs[0]);
    } catch (err) {
      console.error("Fehler beim Laden der Jahre:", err);
    }
  }, [loadYearStats]);

  const loadMultiYearStats = useCallback(async () => {
    if (!userId) return;
    setLoadingMulti(true);
    try {
      const res = await API.get(`/stats/user/${userId}/all`);
      setMultiStats(res.data);
    } catch (err) {
      console.error("Fehler Multi-Year:", err);
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

  const currentSummary = useMemo(() => {
    if (!yearStats) {
      return [
        { label: "Punkte", value: "-" },
        { label: "Teilnahmen", value: "-" },
        { label: "Gewinnrate", value: "-" },
      ];
    }

    return [
      { label: "Punkte", value: formatProfileNumber(yearStats.totalPoints) },
      {
        label: "Teilnahmen",
        value: formatProfileNumber(yearStats.eveningsAttended),
      },
      { label: "Gewinnrate", value: formatProfilePercent(yearStats.winRate) },
    ];
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

  const showToast = useCallback((message) => {
    setToast(message);
  }, []);

  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    showToast("Profilbild wird hochgeladen...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await API.patch(`/users/${userId}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.url) {
        setUser((prev) => ({
          ...prev,
          profileImageUrl: res.data.url,
        }));

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...user,
            profileImageUrl: res.data.url,
          }),
        );

        showToast("Profilbild erfolgreich aktualisiert!");
      }
    } catch (err) {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.error;

      if (status === 413) showToast(apiMsg || "Bild ist zu gross");
      else if (status === 415) showToast(apiMsg || "Bildformat nicht unterstuetzt");
      else showToast(apiMsg || "Fehler beim Hochladen des Profilbildes");
    } finally {
      event.target.value = "";
    }
  };

  const toggleViewAll = () => {
    const next = !viewAllYears;
    setViewAllYears(next);
    if (next && !multiStats) loadMultiYearStats();
  };

  return (
    <div className="profile-page">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <section className="profile-hero">
        <div className="profile-card-modern">
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
              className="avatar-click-area"
              onClick={() => avatarInputRef.current?.click()}
              aria-label="Profilbild ändern"
            >
              <img
                src={user?.profileImageUrl || defaultAvatar}
                alt="Profilbild"
                className="avatar-img"
              />
              <span className="avatar-edit-badge">
                <Camera size={16} />
              </span>
            </button>
          </div>

          <div className="profile-main-info">
            <div className="profile-identity-block">
              <h2 className="profile-name-center">{user?.displayName}</h2>

              <div className="profile-info-list">
                <div className="info-row">
                  <span className="info-label">Benutzername</span>
                  <span className="info-value">@{user?.username}</span>
                </div>
              </div>

              {user?.role === "admin" && (
                <div className="profile-identity-actions">
                  <div className="profile-role-pill">
                    <Shield size={15} />
                    Admin
                  </div>
                  <button
                    type="button"
                    className={`profile-testmode-button ${
                      testMode ? "active" : ""
                    }`}
                    onClick={() => setTestMode(!testMode)}
                    aria-pressed={testMode}
                    title={
                      testMode
                        ? "Testmodus ausschalten"
                        : "Testmodus einschalten"
                    }
                  >
                    <FlaskConical size={15} />
                    {testMode ? "Testmodus aktiv" : "Live-Modus"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="profile-summary-panel">
          <div className="profile-summary-heading">
            <Trophy size={18} />
            <span>{selectedYear || "Jahr"} im Blick</span>
          </div>
          <div className="profile-summary-grid">
            {currentSummary.map((item) => (
              <div key={item.label} className="profile-summary-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="profile-toolbar">
        <div className="view-switch" role="group" aria-label="Profilansicht">
          <button
            type="button"
            className={`button ${!viewAllYears ? "primary" : "neutral"}`}
            aria-pressed={!viewAllYears}
            onClick={() => {
              setViewAllYears(false);
              loadYearStats(selectedYear);
            }}
          >
            Jahresstatistik
          </button>

          <button
            type="button"
            className={`button ${viewAllYears ? "primary" : "neutral"}`}
            aria-pressed={viewAllYears}
            onClick={toggleViewAll}
          >
            Alle Jahre
          </button>
        </div>

      </section>

      {!viewAllYears && (
        <div className="profile-stats-view">
          <div className="year-controls">
            <button
              className="button neutral year-nav-btn year-nav-btn--previous"
              type="button"
              disabled={!previousYear}
              onClick={() => {
                setSelectedYear(previousYear);
                loadYearStats(previousYear);
              }}
              aria-label="Vorheriges Jahr anzeigen"
              title="Vorheriges Jahr"
            >
              <span className="year-nav-arrow" aria-hidden="true">
                ‹
              </span>
            </button>

            <select
              className="year-select"
              value={selectedYear || ""}
              onChange={(event) => {
                const year = Number(event.target.value);
                setSelectedYear(year);
                loadYearStats(year);
              }}
            >
              {yearList.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              className="button neutral year-nav-btn year-nav-btn--next"
              type="button"
              disabled={!nextYear}
              onClick={() => {
                setSelectedYear(nextYear);
                loadYearStats(nextYear);
              }}
              aria-label="Nächstes Jahr anzeigen"
              title="Nächstes Jahr"
            >
              <span className="year-nav-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          </div>

          {loadingYear && <p className="profile-loading">Lade Jahresstatistik...</p>}

          {yearStats && (
            <>
              <div className="kpi-grid">
                <KpiCard
                  title="Gesamtpunkte"
                  value={formatProfileNumber(yearStats.totalPoints)}
                />
                <KpiCard
                  title="Teilnahmen"
                  value={formatProfileNumber(yearStats.eveningsAttended)}
                />
                <KpiCard
                  title="Gewinnrate"
                  value={formatProfilePercent(yearStats.winRate)}
                />
                <KpiCard
                  title="Ø Platzierung"
                  value={formatProfileNumber(yearStats.averagePlacement, 1)}
                />
              </div>

              <button
                type="button"
                className="profile-more-stats-toggle"
                aria-expanded={showMoreYearStats}
                onClick={() => setShowMoreYearStats((current) => !current)}
              >
                <span>
                  {showMoreYearStats
                    ? "Weitere Statistiken ausblenden"
                    : "Weitere Statistiken anzeigen"}
                </span>
                <ChevronDown
                  size={18}
                  className={showMoreYearStats ? "expanded" : ""}
                />
              </button>

              {showMoreYearStats && (
                <div className="kpi-grid profile-secondary-kpis">
                  <KpiCard
                    title="Durchschnitt"
                    value={formatProfileNumber(yearStats.avgPoints, 1)}
                  />
                  <KpiCard
                    title="Teilnahmequote"
                    value={formatProfilePercent(yearStats.attendanceRate)}
                  />
                  <KpiCard title="Top-3 Quote" value={`${topThreeRate}%`} />
                  <KpiCard
                    title="Spielleiter"
                    value={`${formatProfileNumber(yearStats.spielleiterCount)}x`}
                  />
                  <KpiCard
                    title="Beste Punkte"
                    value={formatProfileNumber(yearStats.bestEveningPoints)}
                  />
                  <KpiCard
                    title="Schlechteste Punkte"
                    value={formatProfileNumber(yearStats.worstEveningPoints)}
                  />
                  <KpiCard
                    title="Peak-Performance"
                    value={formatProfileNumber(yearStats.peakPerformance, 1)}
                  />
                </div>
              )}

              <ChartTabs
                label="Diagramm auswählen"
                activeValue={activeYearChart}
                onChange={setActiveYearChart}
                options={[
                  { value: "placements", label: "Platzierungen" },
                  { value: "points", label: "Punkte" },
                ]}
              />

              <div
                className={`profile-chart-panel ${
                  activeYearChart === "placements" ? "active" : ""
                }`}
              >
                <ChartWrapper title="Platzierungsverteilung">
                  {yearStats.firstPlaces +
                    yearStats.secondPlaces +
                    yearStats.thirdPlaces >
                  0 ? (
                    <PiePlacementChart data={yearStats} />
                  ) : (
                    <ChartPlaceholder text="Keine Platzierungen vorhanden" />
                  )}
                </ChartWrapper>
              </div>

              <div
                className={`profile-chart-panel ${
                  activeYearChart === "points" ? "active" : ""
                }`}
              >
                <ChartWrapper title="Punktetrend">
                  {yearStats.scoreTrend?.length ? (
                    <LinePointsChart data={yearStats.scoreTrend} />
                  ) : (
                    <ChartPlaceholder text="Noch keine Daten" />
                  )}
                </ChartWrapper>
              </div>

              <section className="profile-evenings-section">
                <div className="profile-section-title-row">
                  <h2 className="section-title">Alle Abende</h2>
                  <span>{yearStats.scoreTrend?.length || 0} Einträge</span>
                </div>
                {yearStats.scoreTrend?.length ? (
                  <ul className="profile-evening-list">
                    {yearStats.scoreTrend.map((entry, index) => {
                      const eveningId = String(entry.eveningId || "");
                      const placement =
                        placementsByEvening.get(eveningId) ??
                        yearStats.placementTrend?.[index]?.place;
                      const formattedDate = formatSwissDate(entry.date, {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <li key={eveningId || index}>
                          <button
                            type="button"
                            className="profile-evening-entry"
                            onClick={() => navigate(`/abende/${entry.eveningId}`)}
                            aria-label={`Details zum Spieleabend vom ${formattedDate}`}
                          >
                            <span className="profile-evening-date">
                              <span className="profile-evening-icon">
                                <CalendarDays size={18} />
                              </span>
                              <span>
                                <span className="profile-evening-eyebrow">
                                  Spieleabend
                                </span>
                                <strong>{formattedDate}</strong>
                              </span>
                            </span>

                            <span className="profile-evening-metrics">
                              <span className="profile-evening-metric">
                                <span>Punkte</span>
                                <strong>
                                  {formatProfileNumber(entry.points, 1)}
                                </strong>
                              </span>
                              <span className="profile-evening-metric">
                                <span>Platz</span>
                                <strong>
                                  {placement == null
                                    ? "-"
                                    : formatProfileNumber(placement, 1)}
                                </strong>
                              </span>
                            </span>

                            <span className="profile-evening-link">
                              <span>Details</span>
                              <ChevronRight size={18} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="profile-evening-empty">
                    Für dieses Jahr sind noch keine Abende vorhanden.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {viewAllYears && (
        <div className="profile-stats-view">
          {loadingMulti && <p className="profile-loading">Lade Gesamtstatistik...</p>}

          {multiStats && (
            <>
              <div className="kpi-grid">
                <KpiCard
                  title="Gesamtpunkte"
                  value={formatProfileNumber(multiStats.global.totalPoints)}
                />
                <KpiCard
                  title="Gesamt-Ø Punkte"
                  value={formatProfileNumber(multiStats.global.avgPoints, 1)}
                />
                <KpiCard
                  title="Teilnahmequote"
                  value={formatProfilePercent(multiStats.global.attendanceRate)}
                />
                <KpiCard
                  title="Gewinnrate"
                  value={formatProfilePercent(multiStats.global.winRate)}
                />
                <KpiCard
                  title="Ø Platzierung"
                  value={formatProfileNumber(
                    multiStats.global.avgPlacement,
                    1,
                  )}
                />
              </div>

              <ChartTabs
                label="Gesamtdiagramm auswählen"
                activeValue={activeMultiChart}
                onChange={setActiveMultiChart}
                options={[
                  { value: "points", label: "Punkte" },
                  { value: "winRate", label: "Gewinnrate" },
                  { value: "placements", label: "Plätze" },
                  { value: "activity", label: "Aktivität" },
                ]}
              />

              <div
                className={`profile-chart-panel ${
                  activeMultiChart === "points" ? "active" : ""
                }`}
              >
                <div className="chart-card">
                  <h2 className="section-title">
                    Punkteverlauf über alle Jahre
                  </h2>
                  <MultiYearPointsChart
                    years={multiStats.years}
                    byYear={multiStats.byYear}
                  />
                </div>
              </div>

              <div
                className={`profile-chart-panel ${
                  activeMultiChart === "winRate" ? "active" : ""
                }`}
              >
                <div className="chart-card">
                  <h2 className="section-title">
                    Gewinnrate über alle Jahre
                  </h2>
                  <MultiYearWinRateChart
                    years={multiStats.years}
                    byYear={multiStats.byYear}
                  />
                </div>
              </div>

              <div
                className={`profile-chart-panel ${
                  activeMultiChart === "placements" ? "active" : ""
                }`}
              >
                <div className="chart-card">
                  <h2 className="section-title">Platzierungen pro Jahr</h2>
                  <BarYearComparison
                    years={multiStats.years}
                    byYear={multiStats.byYear}
                  />
                </div>
              </div>

              <div
                className={`profile-chart-panel ${
                  activeMultiChart === "activity" ? "active" : ""
                }`}
              >
                <div className="chart-card">
                  <h2 className="section-title">Aktivitäts-Heatmap</h2>
                  <ActivityHeatmap
                    years={multiStats.years}
                    byYear={multiStats.byYear}
                  />
                </div>
              </div>

              <h2 className="section-title">Jahr-für-Jahr Vergleich</h2>
              <div className="year-compare-grid">
                {multiStats.years.map((year) => {
                  const stats = multiStats.byYear[year];
                  return (
                    <div className="year-card" key={year}>
                      <h3>{year}</h3>
                      <div className="year-row">
                        <span>Punkte:</span>
                        <span className="value">
                          {formatProfileNumber(stats.totalPoints)}
                        </span>
                      </div>
                      <div className="year-row">
                        <span>Teilnahmen:</span>
                        <span className="value">
                          {stats.eveningsAttended}/
                          {stats.totalPossibleEvenings ?? "?"}
                        </span>
                      </div>
                      <div className="year-row">
                        <span>Gewinnrate:</span>
                        <span className="value">
                          {formatProfilePercent(stats.winRate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
