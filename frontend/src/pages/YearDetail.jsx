// src/pages/YearDetail.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import {
  ArrowLeft,
  CalendarDays,
  Gamepad2,
  Info,
  Lock,
  MapPinHouse,
  Pencil,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import "../styles/pages/YearDetail.css";
import "../styles/components/Modal.css";
import {
  formatSwissDate,
  swissDateTimeInputToIso,
  toSwissDateTimeInputValue,
} from "../utils/swissDateTime";

export default function YearDetail() {
  const { user } = useAuth();
  const { year } = useParams();
  const navigate = useNavigate();
  const { setTitle } = useOutletContext();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [editEvening, setEditEvening] = useState(null);
  const [fixEvening, setFixEvening] = useState(null);
  const [fixDate, setFixDate] = useState("");
  const [editForm, setEditForm] = useState({
    spieljahr: "",
    spielleiterId: "",
    date: "",
  });
  const [users, setUsers] = useState([]);
  const [years, setYears] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingFix, setSavingFix] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(`Jahr ${year}`);
    setLoading(true);
    fetchYearData();
  }, [year]);

  const fetchYearData = async () => {
    try {
      const res = await API.get(`/years/${year}`);
      setData(res.data);
      setError("");
    } catch (err) {
      console.error("Fehler beim Laden der Jahresdaten:", err);
      setError("Fehler beim Laden der Jahresdaten");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminOptions = async () => {
    if (users.length && years.length) return;
    const [usersRes, yearsRes] = await Promise.all([
      API.get("/users"),
      API.get("/years"),
    ]);
    setUsers(usersRes.data.filter((item) => item.active !== false));
    setYears(yearsRes.data);
  };

  const handleDeleteEvening = async (eveningId) => {
    const ok = window.confirm(
      "Willst du diesen Abend wirklich löschen? Umfrage und Statistiken für dieses Jahr werden entsprechend aktualisiert.",
    );
    if (!ok) return;

    setDeletingId(eveningId);
    setError("");

    try {
      await API.delete(`/evenings/${eveningId}`);
      await fetchYearData();
    } catch (err) {
      setError(err?.response?.data?.error || "Fehler beim Löschen des Abends");
    } finally {
      setDeletingId(null);
    }
  };

  const openEditEvening = async (abend) => {
    try {
      await fetchAdminOptions();
      setEditEvening(abend);
      setEditForm({
        spieljahr: String(abend.spieljahr || year),
        spielleiterId: abend.spielleiterRef?._id || "",
        date: toSwissDateTimeInputValue(abend.date),
      });
      setError("");
    } catch (err) {
      setError("Daten für Bearbeitung konnten nicht geladen werden");
    }
  };

  const handleEditField = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEvening = async (event) => {
    event.preventDefault();
    if (!editEvening) return;

    setSavingEdit(true);
    setError("");
    try {
      await API.patch(`/evenings/${editEvening._id}`, {
        spieljahr: Number(editForm.spieljahr),
        spielleiterId: editForm.spielleiterId,
        date: editForm.date ? swissDateTimeInputToIso(editForm.date) : null,
      });
      setEditEvening(null);
      await fetchYearData();
    } catch (err) {
      setError(
        err?.response?.data?.error || "Abend konnte nicht gespeichert werden",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleFixEvening = async (abend) => {
    setFixEvening(abend);
    setFixDate(toSwissDateTimeInputValue(abend.date));
    setError("");
  };

  const handleSaveFixing = async (event) => {
    event.preventDefault();
    if (!fixEvening || !fixDate) return;

    setSavingFix(true);
    setError("");
    try {
      await API.patch(`/evenings/${fixEvening._id}/status`, {
        status: "fixiert",
        date: swissDateTimeInputToIso(fixDate),
      });
      setFixEvening(null);
      setFixDate("");
      await fetchYearData();
    } catch (err) {
      setError(
        err?.response?.data?.error || "Abend konnte nicht fixiert werden",
      );
    } finally {
      setSavingFix(false);
    }
  };

  const handleResetFixing = async (abend) => {
    const ok = window.confirm(
      "Terminfixierung wirklich zurücksetzen? Das ist nur ohne erfasste Spiele möglich.",
    );
    if (!ok) return;

    try {
      await API.patch(`/evenings/${abend._id}/status`, { status: "offen" });
      await fetchYearData();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "Terminfixierung konnte nicht zurückgesetzt werden",
      );
    }
  };

  if (!user || user.role !== "admin") return <p>Kein Zugriff</p>;
  if (loading) return <p>Lade Daten...</p>;
  if (!data) return <p>Keine Daten gefunden.</p>;

  const { year: yearObj, evenings } = data;

  return (
    <div className="year-detail-page">
      <div className="year-detail-top">
        <div className="year-detail-top-left">
          <h2 className="year-detail-title">Jahr {yearObj.year}</h2>

          {yearObj.closed ? (
            <span className="year-detail-pill year-detail-pill-closed">
              <Info size={14} />
              Abgeschlossen am{" "}
              {formatSwissDate(yearObj.closedAt)}
            </span>
          ) : (
            <span className="year-detail-pill year-detail-pill-open">
              <Info size={14} />
              Noch offen
            </span>
          )}
        </div>

        <button
          className="button neutral year-detail-back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} /> Zurück
        </button>
      </div>

      {error && <div className="alert error year-detail-alert">{error}</div>}

      {evenings.length === 0 ? (
        <p className="year-detail-empty">Keine Abende in diesem Jahr.</p>
      ) : (
        <div className="year-detail-list">
          {evenings.map((abend) => (
            <div
              key={abend._id}
              className={`card year-detail-card status-${abend.status}`}
              onClick={(event) => {
                if (event.target.closest(".year-detail-actions")) return;
                navigate(`/abende/${abend._id}`);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter") navigate(`/abende/${abend._id}`);
              }}
            >
              <div className="year-detail-card-header">
                <div className="year-detail-date">
                  <CalendarDays size={16} />
                  {abend.date
                    ? formatSwissDate(abend.date, {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })
                    : "Datum offen"}
                </div>

                <span className={`badge-abende status-${abend.status}`}>
                  {String(abend.status || "").toUpperCase()}
                </span>
              </div>

              <div className="year-detail-meta">
                <div className="year-detail-meta-item">
                  <MapPinHouse size={16} />
                  {abend.spielleiterRef?.displayName || "-"}
                </div>

                <div className="year-detail-meta-item">
                  <Users size={16} />
                  {abend.participantRefs?.length ?? 0} Teilnehmer
                </div>

                <div className="year-detail-meta-item">
                  <Gamepad2 size={16} />
                  {abend.games?.length ?? 0} Spiele
                </div>
              </div>

              <div
                className="year-detail-actions"
                onClick={(event) => event.stopPropagation()}
              >
                {!yearObj.closed && (
                  <>
                    <button
                      className="button neutral small"
                      onClick={() => openEditEvening(abend)}
                      title="Abend bearbeiten"
                    >
                      <Pencil size={16} />
                      Bearbeiten
                    </button>

                    {abend.status === "offen" && (
                      <button
                        className="button primary small"
                        onClick={() => handleFixEvening(abend)}
                        title="Termin fixieren"
                      >
                        <Lock size={16} />
                        Fixieren
                      </button>
                    )}

                    {abend.status === "fixiert" && (
                      <button
                        className="button neutral small"
                        onClick={() => handleResetFixing(abend)}
                        title="Terminfixierung zurücksetzen"
                      >
                        <RotateCcw size={16} />
                        Zurücksetzen
                      </button>
                    )}

                    <button
                      className="button danger small"
                      onClick={() => handleDeleteEvening(abend._id)}
                      disabled={deletingId === abend._id}
                      title="Abend löschen"
                    >
                      <Trash2 size={16} />
                      {deletingId === abend._id ? "Lösche..." : "Löschen"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editEvening &&
        createPortal(
          <div className="modal-overlay">
          <div className="modal">
            <h2>Abend bearbeiten</h2>
            <form className="modal-form" onSubmit={handleSaveEvening}>
              <label>Spieljahr</label>
              <select
                className="input"
                value={editForm.spieljahr}
                onChange={(event) =>
                  handleEditField("spieljahr", event.target.value)
                }
              >
                {years.map((item) => (
                  <option
                    key={item._id}
                    value={item.year}
                    disabled={item.closed}
                  >
                    {item.year} {item.closed ? "(abgeschlossen)" : ""}
                  </option>
                ))}
              </select>

              <label>Spielleiter</label>
              <select
                className="input"
                value={editForm.spielleiterId}
                onChange={(event) =>
                  handleEditField("spielleiterId", event.target.value)
                }
              >
                <option value="">Bitte wählen</option>
                {users.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.displayName} ({item.username})
                  </option>
                ))}
              </select>

              <label>Datum</label>
              <input
                className="input"
                type="datetime-local"
                value={editForm.date}
                onChange={(event) =>
                  handleEditField("date", event.target.value)
                }
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="button neutral"
                  onClick={() => setEditEvening(null)}
                  disabled={savingEdit}
                >
                  Abbrechen
                </button>
                <button
                  className="button primary"
                  type="submit"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Speichert..." : "Speichern"}
                </button>
              </div>
            </form>
          </div>
          </div>,
          document.body,
        )}

      {fixEvening &&
        createPortal(
          <div className="modal-overlay">
          <div className="modal">
            <h2>Termin fixieren</h2>
            <form className="modal-form" onSubmit={handleSaveFixing}>
              <label>Datum und Zeit</label>
              <input
                className="input"
                type="datetime-local"
                value={fixDate}
                onChange={(event) => setFixDate(event.target.value)}
                required
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="button neutral"
                  onClick={() => {
                    setFixEvening(null);
                    setFixDate("");
                  }}
                  disabled={savingFix}
                >
                  Abbrechen
                </button>
                <button
                  className="button primary"
                  type="submit"
                  disabled={savingFix || !fixDate}
                >
                  {savingFix ? "Fixiert..." : "Fixieren"}
                </button>
              </div>
            </form>
          </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
