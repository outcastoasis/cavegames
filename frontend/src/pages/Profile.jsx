// frontend/src/pages/Profile.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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

import "../styles/pages/Profile.css";

export default function Profile() {
  const { setTitle } = useOutletContext();
  const { user, setUser } = useAuth();
  const { id } = useParams(); // Profil anderer möglich: /profile/:id
  const navigate = useNavigate();

  const userId = id || user?._id;

  const [yearList, setYearList] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  const [yearStats, setYearStats] = useState(null); // Jahresansicht
  const [multiStats, setMultiStats] = useState(null); // Alle Jahre

  const [loadingYear, setLoadingYear] = useState(false);
  const [loadingMulti, setLoadingMulti] = useState(false);

  const [viewAllYears, setViewAllYears] = useState(false); // Toggle Ansicht

  useEffect(() => {
    setTitle("Profil");
    loadAvailableYears();
  }, []);

  async function loadAvailableYears() {
    try {
      const res = await API.get("/years");
      const yrs = res.data.map((y) => y.year).sort((a, b) => b - a);

      setYearList(yrs);
      setSelectedYear(yrs[0]);
      loadYearStats(yrs[0]);
    } catch (err) {
      console.error("Fehler beim Laden der Jahre:", err);
    }
  }

  async function loadYearStats(year) {
    if (!year) return;
    setLoadingYear(true);
    try {
      const res = await API.get(`/stats/user/${userId}?year=${year}`);
      setYearStats(res.data);
    } catch (err) {
      console.error("Fehler beim Laden der Jahresstatistik:", err);
    }
    setLoadingYear(false);
  }

  async function loadMultiYearStats() {
    setLoadingMulti(true);
    try {
      const res = await API.get(`/stats/user/${userId}/all`);
      setMultiStats(res.data);
    } catch (err) {
      console.error("Fehler Multi-Year:", err);
    }
    setLoadingMulti(false);
  }

  // Toggle zwischen Jahresansicht und globaler Ansicht
  function toggleViewAll() {
    const next = !viewAllYears;
    setViewAllYears(next);
    if (next && !multiStats) loadMultiYearStats();
  }

  // Hilfsfunktion für KPI
  function KpiCard({ title, value }) {
    return (
      <div className="kpi-card">
        <div className="kpi-title">{title}</div>
        <div className="kpi-value">{value}</div>
      </div>
    );
  }

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await API.patch(`/users/${userId}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Sofort anzeigen
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
          })
        );
      }
    } catch (err) {
      console.error("Avatar Upload Error:", err);
    }
  }

  return (
    <div className="profile-page">
      {/* ==== PROFILKARTE ==== */}
      <div className="profile-card">
        <div className="profile-header">
          <h2>{user?.displayName || "Profil"}</h2>

          <button
            className="button danger"
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>

        {/* ==== PROFILBILD ==== */}
        <div className="profile-avatar-wrapper">
          <img
            src={user?.profileImageUrl || defaultAvatar}
            alt="Profilbild"
            className="profile-avatar"
          />

          {/* Datei auswählen */}
          <input
            type="file"
            id="avatarInput"
            accept="image/png, image/jpeg"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
          />

          {/* Button zum Öffnen des Datei-Dialogs */}
          <button
            className="button secondary"
            onClick={() => document.getElementById("avatarInput").click()}
          >
            Profilbild ändern
          </button>
        </div>

        <p className="profile-meta">
          Benutzername: <strong>{user?.username}</strong>
          <br />
          Rolle: <strong>{user?.role === "admin" ? "Admin" : "Spieler"}</strong>
        </p>
      </div>

      {/* ==== ANSICHTSWECHSEL ==== */}
      <div className="view-switch">
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

      {/* ===========================================================
                    J A H R E S   S T A T I S T I K
          =========================================================== */}
      {!viewAllYears && (
        <div>
          {/* Jahr-Steuerung */}
          <div className="year-controls">
            <select
              className="year-select"
              value={selectedYear || ""}
              onChange={(e) => {
                const y = Number(e.target.value);
                setSelectedYear(y);
                loadYearStats(y);
              }}
            >
              {yearList.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              className="button"
              disabled={!yearList.includes(selectedYear + 1)}
              onClick={() => {
                const next = selectedYear + 1;
                setSelectedYear(next);
                loadYearStats(next);
              }}
            >
              Nächstes Jahr →
            </button>

            <button
              className="button"
              disabled={!yearList.includes(selectedYear - 1)}
              onClick={() => {
                const prev = selectedYear - 1;
                setSelectedYear(prev);
                loadYearStats(prev);
              }}
            >
              ← Vorjahr
            </button>
          </div>

          {loadingYear && <p>Lade Jahresstatistik...</p>}

          {yearStats && (
            <div>
              {/* KPIs */}
              <div className="kpi-grid">
                <KpiCard title="Gesamtpunkte" value={yearStats.totalPoints} />
                <KpiCard
                  title="Durchschnitt"
                  value={yearStats.avgPoints.toFixed(1)}
                />
                <KpiCard
                  title="Teilnahmen"
                  value={yearStats.eveningsAttended}
                />
                <KpiCard
                  title="Teilnahmequote"
                  value={`${yearStats.attendanceRate}%`}
                />
                <KpiCard title="Gewinnrate" value={`${yearStats.winRate}%`} />
                <KpiCard
                  title="Top-3 Quote"
                  value={`${
                    Math.round(
                      ((yearStats.firstPlaces +
                        yearStats.secondPlaces +
                        yearStats.thirdPlaces) /
                        yearStats.eveningsAttended) *
                        100
                    ) || 0
                  }%`}
                />
                <KpiCard
                  title="Spielleiter"
                  value={`${yearStats.spielleiterCount}×`}
                />
                <KpiCard
                  title="Ø Platzierung"
                  value={yearStats.averagePlacement || "-"}
                />
                <KpiCard
                  title="Beste Punkte"
                  value={yearStats.bestEveningPoints}
                />
                <KpiCard
                  title="Schlechteste Punkte"
                  value={yearStats.worstEveningPoints}
                />
                <KpiCard
                  title="Peak-Performance"
                  value={yearStats.peakPerformance}
                />
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

              {/* Tabelle der Abende */}
              <h2 className="section-title">Alle Abende</h2>
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
                  {yearStats.scoreTrend.map((entry, i) => (
                    <tr key={i}>
                      <td>
                        {new Date(entry.date).toLocaleDateString("de-CH")}
                      </td>
                      <td>{entry.points}</td>
                      <td>{yearStats.placementTrend?.[i]?.place || "-"}</td>
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
          )}
        </div>
      )}

      {/* ===========================================================
                       A L L E   J A H R E
          =========================================================== */}
      {viewAllYears && (
        <div>
          {loadingMulti && <p>Lade Gesamtstatistik...</p>}

          {multiStats && (
            <div>
              {/* KPI GRID GLOBAL */}
              <div className="kpi-grid">
                <KpiCard
                  title="Gesamtpunkte"
                  value={multiStats.global.totalPoints}
                />
                <KpiCard
                  title="Gesamt-Ø Punkte"
                  value={multiStats.global.avgPoints}
                />
                <KpiCard
                  title="Teilnahmequote"
                  value={`${multiStats.global.attendanceRate}%`}
                />
                <KpiCard
                  title="Gewinnrate"
                  value={`${multiStats.global.winRate}%`}
                />
                <KpiCard
                  title="Ø Platzierung"
                  value={multiStats.global.avgPlacement || "-"}
                />
              </div>

              {/* Punkte Verlauf */}
              <div className="chart-card">
                <h2 className="section-title">Punkteverlauf über alle Jahre</h2>
                <MultiYearPointsChart
                  years={multiStats.years}
                  byYear={multiStats.byYear}
                />
              </div>

              {/* Gewinnrate Verlauf */}
              <div className="chart-card">
                <h2 className="section-title">Gewinnrate über alle Jahre</h2>
                <MultiYearWinRateChart
                  years={multiStats.years}
                  byYear={multiStats.byYear}
                />
              </div>

              {/* Jahresvergleich */}
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

              {/* Jahr-für-Jahr Vergleich */}
              <h2 className="section-title">Jahr-für-Jahr Vergleich</h2>

              <div className="year-compare-grid">
                {multiStats.years.map((y) => {
                  const ys = multiStats.byYear[y];
                  return (
                    <div className="year-card" key={y}>
                      <h3>{y}</h3>

                      <div className="year-row">
                        <span>Punkte:</span>
                        <span className="value">{ys.totalPoints}</span>
                      </div>

                      <div className="year-row">
                        <span>Teilnahmen:</span>
                        <span className="value">
                          {ys.eveningsAttended}/
                          {ys.totalPossibleEvenings ?? "?"}
                        </span>
                      </div>

                      <div className="year-row">
                        <span>Gewinnrate:</span>
                        <span className="value">{ys.winRate}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
