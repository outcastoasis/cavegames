import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/authState";
import { Navigate, useNavigate, useOutletContext } from "react-router-dom";
import API from "../services/api";
import "../styles/pages/AdminYears.css";
import Toast from "../components/ui/Toast";
import { formatSwissDate } from "../utils/swissDateTime";

export default function AdminYears() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setTitle } = useOutletContext();

  const [years, setYears] = useState([]);
  const [newYear, setNewYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [closePreview, setClosePreview] = useState(null);
  const [closePreviewYear, setClosePreviewYear] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [closingYear, setClosingYear] = useState(false);

  useEffect(() => {
    setTitle("Jahresverwaltung");
    fetchYears();
  }, [setTitle]);

  const fetchYears = async () => {
    setLoading(true);
    try {
      const res = await API.get("/years");
      setYears(res.data);
      setError("");
    } catch {
      setError("Fehler beim Laden der Jahre.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateYear = async () => {
    if (!newYear) return;
    try {
      const yearNum = parseInt(newYear);
      await API.post("/years", { year: yearNum });
      setNewYear("");
      fetchYears();
    } catch (err) {
      setError(err.response?.data?.error || "Fehler beim Erstellen.");
    }
  };

  const handleOpenClosePreview = async (year) => {
    setError("");
    setSuccess("");
    setClosePreviewYear(year);
    setClosePreview(null);
    setPreviewLoading(true);
    try {
      const res = await API.get(`/years/${year}/close-preview`);
      setClosePreview(res.data.preview);
    } catch (err) {
      setError(
        err.response?.data?.error || "Abschluss-Vorschau konnte nicht geladen werden.",
      );
      setClosePreviewYear(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreviewModal = () => {
    if (closingYear) return;
    setClosePreview(null);
    setClosePreviewYear(null);
    setPreviewLoading(false);
  };

  const handleConfirmCloseYear = async () => {
    if (!closePreviewYear || !closePreview?.canClose) return;

    setError("");
    setSuccess("");
    setClosingYear(true);
    try {
      const res = await API.post(`/years/${closePreviewYear}/close`);
      setSuccess(res.data.message || "Jahr erfolgreich abgeschlossen");
      handleClosePreviewModal();
      await fetchYears();
    } catch (err) {
      if (err.response?.data?.preview) {
        setClosePreview(err.response.data.preview);
      }
      setError(err.response?.data?.error || "Fehler beim Abschliessen.");
    } finally {
      setClosingYear(false);
    }
  };

  const renderPreviewIssues = (items, variant) => {
    if (!items?.length) {
      return (
        <p className="admin-year-preview-empty">
          {variant === "blocker"
            ? "Keine blockierenden Probleme gefunden."
            : "Keine Hinweise gefunden."}
        </p>
      );
    }

    return (
      <div className="admin-year-preview-list">
        {items.map((item) => (
          <div key={`${variant}-${item.id}`} className="admin-year-preview-item">
            <strong>{item.label}</strong>
            <span>
              {item.participantCount} Teilnehmer · {item.gamesCount} Spiele
            </span>
            <ul>
              {(variant === "blocker" ? item.issues : item.warnings).map(
                (issue) => (
                  <li key={issue}>{issue}</li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-years-page">
      {error && <Toast message={error} onClose={() => setError("")} />}

      {success && <Toast message={success} onClose={() => setSuccess("")} />}
      <div className="admin-year-header">
        <input
          type="number"
          placeholder="Neues Jahr z. B. 2025"
          className="admin-year-input"
          value={newYear}
          onChange={(e) => setNewYear(e.target.value)}
        />
        <button
          className="button primary admin-year-add-btn"
          onClick={handleCreateYear}
        >
          Jahr anlegen
        </button>
      </div>

      {loading ? (
        <p>Lade Jahre...</p>
      ) : (
        <div className="admin-year-list">
          {years.map((year) => (
            <div key={year._id} className="admin-year-card">
              <div className="admin-year-info">
                <h3>{year.year}</h3>
                <p>
                  Status:{" "}
                  {year.closed ? (
                    <span className="admin-badge admin-badge-closed">Abgeschlossen</span>
                  ) : (
                    <span className="admin-badge admin-badge-open">Offen</span>
                  )}
                </p>
                {year.closedAt && (
                  <p className="small">
                    Abgeschlossen am:{" "}
                    {formatSwissDate(year.closedAt)}
                  </p>
                )}
              </div>

              <div className="admin-year-actions">
                <button
                  className="button neutral"
                  onClick={() => navigate(`/admin/years/${year.year}`)}
                >
                  Details
                </button>

                {!year.closed && (
                  <button
                    className="button danger"
                    onClick={() => handleOpenClosePreview(year.year)}
                  >
                    Jahr abschliessen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {closePreviewYear &&
        createPortal(
          <div className="admin-year-preview-overlay" role="presentation">
            <div
              className="admin-year-preview-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="year-close-preview-title"
            >
              <h2 id="year-close-preview-title">
                Jahr {closePreviewYear} abschliessen
              </h2>

              {previewLoading ? (
                <p>Pruefe Abende...</p>
              ) : closePreview ? (
                <>
                  <div className="admin-year-preview-summary">
                    <span>{closePreview.summary.eveningsTotal} Abende</span>
                    <span>{closePreview.summary.blockersTotal} Blocker</span>
                    <span>{closePreview.summary.warningsTotal} Hinweise</span>
                  </div>

                  <section className="admin-year-preview-section">
                    <h3>Blocker</h3>
                    {renderPreviewIssues(closePreview.blockers, "blocker")}
                  </section>

                  <section className="admin-year-preview-section">
                    <h3>Hinweise</h3>
                    {renderPreviewIssues(closePreview.warnings, "warnings")}
                  </section>

                  <p
                    className={`admin-year-preview-result ${
                      closePreview.canClose
                        ? "admin-year-preview-result-ok"
                        : "admin-year-preview-result-blocked"
                    }`}
                  >
                    {closePreview.canClose
                      ? "Alle Pflichtpruefungen sind erfuellt. Das Jahr kann abgeschlossen werden."
                      : "Das Jahr kann noch nicht abgeschlossen werden."}
                  </p>
                </>
              ) : (
                <p>Keine Vorschau verfuegbar.</p>
              )}

              <div className="admin-year-preview-actions">
                <button
                  type="button"
                  className="button neutral"
                  onClick={handleClosePreviewModal}
                  disabled={closingYear}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="button danger"
                  onClick={handleConfirmCloseYear}
                  disabled={
                    previewLoading || closingYear || !closePreview?.canClose
                  }
                >
                  {closingYear ? "Schliesse ab..." : "Jahr abschliessen"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
