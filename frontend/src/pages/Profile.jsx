import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
  Shield,
  Trophy,
} from "lucide-react";
import { useAuth } from "../context/authState";
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

export default function Profile() {
  const { setTitle } = useOutletContext();
  const { user, setUser } = useAuth();
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
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
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
      { label: "Punkte", value: yearStats.totalPoints },
      { label: "Teilnahmen", value: yearStats.eveningsAttended },
      { label: "Gewinnrate", value: `${yearStats.winRate}%` },
    ];
  }, [yearStats]);

  const showToast = useCallback((message) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    setToast(message);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 2500);
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

  const handleRefreshStats = () => {
    if (viewAllYears) {
      loadMultiYearStats();
      return;
    }

    loadYearStats(selectedYear);
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
            <div>
              <h2 className="profile-name-center">{user?.displayName}</h2>
              <div className="profile-role-pill">
                <Shield size={15} />
                {user?.role === "admin" ? "Admin" : "Spieler"}
              </div>
            </div>

            <div className="profile-info-list">
              <div className="info-row">
                <span className="info-label">Benutzername</span>
                <span className="info-value">@{user?.username}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Aktuelles Jahr</span>
                <span className="info-value">{selectedYear || "-"}</span>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <button
              type="button"
              className="button neutral"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Camera size={17} />
              Bild ändern
            </button>
            <button
              className="button danger logout-btn"
              onClick={() => {
                localStorage.removeItem("token");
                navigate("/login");
              }}
            >
              <LogOut size={17} />
              Logout
            </button>
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
            className={`button ${!viewAllYears ? "primary" : "neutral"}`}
            onClick={() => {
              setViewAllYears(false);
              loadYearStats(selectedYear);
            }}
          >
            Jahresstatistik
          </button>

          <button
            className={`button ${viewAllYears ? "primary" : "neutral"}`}
            onClick={toggleViewAll}
          >
            Alle Jahre
          </button>
        </div>

        <button
          className="button neutral profile-refresh-btn"
          type="button"
          onClick={handleRefreshStats}
          disabled={loadingYear || loadingMulti || (!viewAllYears && !selectedYear)}
        >
          <RefreshCw size={17} />
          Aktualisieren
        </button>
      </section>

      {!viewAllYears && (
        <div className="profile-stats-view">
          <div className="year-controls">
            <button
              className="button neutral year-nav-btn"
              disabled={!previousYear}
              onClick={() => {
                setSelectedYear(previousYear);
                loadYearStats(previousYear);
              }}
            >
              <ChevronLeft size={17} />
              Vorjahr
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
              className="button neutral year-nav-btn"
              disabled={!nextYear}
              onClick={() => {
                setSelectedYear(nextYear);
                loadYearStats(nextYear);
              }}
            >
              Nächstes Jahr
              <ChevronRight size={17} />
            </button>
          </div>

          {loadingYear && <p className="profile-loading">Lade Jahresstatistik...</p>}

          {yearStats && (
            <>
              <div className="kpi-grid">
                <KpiCard title="Gesamtpunkte" value={yearStats.totalPoints} />
                <KpiCard title="Durchschnitt" value={yearStats.avgPoints.toFixed(1)} />
                <KpiCard title="Teilnahmen" value={yearStats.eveningsAttended} />
                <KpiCard
                  title="Teilnahmequote"
                  value={`${yearStats.attendanceRate}%`}
                />
                <KpiCard title="Gewinnrate" value={`${yearStats.winRate}%`} />
                <KpiCard title="Top-3 Quote" value={`${topThreeRate}%`} />
                <KpiCard title="Spielleiter" value={`${yearStats.spielleiterCount}x`} />
                <KpiCard title="Ø Platzierung" value={yearStats.averagePlacement || "-"} />
                <KpiCard title="Beste Punkte" value={yearStats.bestEveningPoints} />
                <KpiCard title="Schlechteste Punkte" value={yearStats.worstEveningPoints} />
                <KpiCard title="Peak-Performance" value={yearStats.peakPerformance} />
              </div>

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

              <ChartWrapper title="Punktetrend">
                {yearStats.scoreTrend?.length ? (
                  <LinePointsChart data={yearStats.scoreTrend} />
                ) : (
                  <ChartPlaceholder text="Noch keine Daten" />
                )}
              </ChartWrapper>

              <section className="profile-evenings-section">
                <div className="profile-section-title-row">
                  <h2 className="section-title">Alle Abende</h2>
                  <span>{yearStats.scoreTrend?.length || 0} Einträge</span>
                </div>
                <div className="profile-table-wrap">
                  <table className="profile-table">
                    <thead>
                      <tr>
                        <th>Datum</th>
                        <th>Punkte</th>
                        <th>Platz</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearStats.scoreTrend.map((entry, index) => (
                        <tr key={entry.eveningId || index}>
                          <td data-label="Datum">
                            <CalendarDays size={15} />
                            {formatSwissDate(entry.date)}
                          </td>
                          <td data-label="Punkte">{entry.points}</td>
                          <td data-label="Platz">
                            {yearStats.placementTrend?.[index]?.place || "-"}
                          </td>
                          <td>
                            <button
                              className="table-btn"
                              onClick={() => navigate(`/abende/${entry.eveningId}`)}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                  value={multiStats.global.totalPoints}
                />
                <KpiCard title="Gesamt-Ø Punkte" value={multiStats.global.avgPoints} />
                <KpiCard
                  title="Teilnahmequote"
                  value={`${multiStats.global.attendanceRate}%`}
                />
                <KpiCard title="Gewinnrate" value={`${multiStats.global.winRate}%`} />
                <KpiCard
                  title="Ø Platzierung"
                  value={multiStats.global.avgPlacement || "-"}
                />
              </div>

              <div className="chart-card">
                <h2 className="section-title">Punkteverlauf über alle Jahre</h2>
                <MultiYearPointsChart
                  years={multiStats.years}
                  byYear={multiStats.byYear}
                />
              </div>

              <div className="chart-card">
                <h2 className="section-title">Gewinnrate über alle Jahre</h2>
                <MultiYearWinRateChart
                  years={multiStats.years}
                  byYear={multiStats.byYear}
                />
              </div>

              <div className="chart-card">
                <h2 className="section-title">Platzierungen pro Jahr</h2>
                <BarYearComparison
                  years={multiStats.years}
                  byYear={multiStats.byYear}
                />
              </div>

              <div className="chart-card">
                <h2 className="section-title">Aktivitäts-Heatmap</h2>
                <ActivityHeatmap
                  years={multiStats.years}
                  byYear={multiStats.byYear}
                />
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
                        <span className="value">{stats.totalPoints}</span>
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
                        <span className="value">{stats.winRate}%</span>
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
