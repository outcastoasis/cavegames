import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useOutletContext } from "react-router-dom";
import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CirclePlay,
  Clock3,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import YearCloseDialog from "../components/forms/YearCloseDialog";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { SkeletonBlock } from "../components/ui/Skeleton";
import StatusBadge from "../components/ui/StatusBadge";
import Toast from "../components/ui/Toast";
import { useAuth } from "../context/authState";
import { useTestMode } from "../context/testMode";
import API from "../services/api";
import { formatSwissDate } from "../utils/swissDateTime";
import {
  YEAR_STATUSES,
  getYearStatus,
  getYearStatusMeta,
} from "../utils/yearLifecycle";
import "../styles/pages/AdminYears.css";

const emptyStatusCounts = {
  offen: 0,
  fixiert: 0,
  abgeschlossen: 0,
  gesperrt: 0,
};

export default function AdminYears() {
  const { user } = useAuth();
  const { testMode } = useTestMode();
  const navigate = useNavigate();
  const { setTitle } = useOutletContext();
  const [years, setYears] = useState([]);
  const [newYear, setNewYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [closeState, setCloseState] = useState(null);
  const [closing, setClosing] = useState(false);
  const [activateTarget, setActivateTarget] = useState(null);
  const [activating, setActivating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const fetchYears = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    setLoadError("");

    try {
      const response = await API.get("/years");
      setYears(response.data);
    } catch (error) {
      console.error("Fehler beim Laden der Jahre:", error);
      setLoadError(
        error.response?.data?.error || "Jahre konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTitle("Jahresverwaltung");
    fetchYears();
  }, [fetchYears, setTitle]);

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const hasActiveYear = years.some(
    (year) => getYearStatus(year) === YEAR_STATUSES.ACTIVE,
  );
  const displayedYears = [...years].sort((first, second) => {
    const priority = {
      [YEAR_STATUSES.ACTIVE]: 0,
      [YEAR_STATUSES.PLANNED]: 1,
      [YEAR_STATUSES.CLOSED]: 2,
    };
    const statusDifference =
      priority[getYearStatus(first)] - priority[getYearStatus(second)];
    return statusDifference || second.year - first.year;
  });

  const handleCreateYear = async (event) => {
    event.preventDefault();
    const parsedYear = Number(newYear);
    if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2200) {
      setToastMessage("Bitte ein gültiges Jahr eingeben.");
      return;
    }

    setCreating(true);
    try {
      await API.post("/years", { year: parsedYear });
      setNewYear("");
      await fetchYears();
      setToastMessage(`Jahr ${parsedYear} als geplant angelegt`);
    } catch (error) {
      setToastMessage(
        error.response?.data?.error || "Jahr konnte nicht erstellt werden.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleActivateYear = async () => {
    if (!activateTarget || activating) return;

    setActivating(true);
    try {
      const response = await API.post(`/years/${activateTarget.year}/activate`);
      setActivateTarget(null);
      await fetchYears();
      setToastMessage(response.data.message || "Jahr aktiviert");
    } catch (error) {
      setActivateTarget(null);
      setToastMessage(
        error.response?.data?.error || "Jahr konnte nicht aktiviert werden.",
      );
    } finally {
      setActivating(false);
    }
  };

  const handleOpenClosePreview = async (year) => {
    setCloseState({ year, loading: true, preview: null });
    try {
      const response = await API.get(`/years/${year}/close-preview`);
      setCloseState({ year, loading: false, preview: response.data.preview });
    } catch (error) {
      setCloseState(null);
      setToastMessage(
        error.response?.data?.error ||
          "Abschlussprüfung konnte nicht geladen werden.",
      );
    }
  };

  const handleCloseYear = async () => {
    if (!closeState?.preview?.canClose || closing) return;

    setClosing(true);
    try {
      const response = await API.post(`/years/${closeState.year}/close`);
      setCloseState(null);
      await fetchYears();
      setToastMessage(response.data.message || "Jahr abgeschlossen");
    } catch (error) {
      if (error.response?.data?.preview) {
        setCloseState((current) => ({
          ...current,
          loading: false,
          preview: error.response.data.preview,
        }));
      }
      setToastMessage(
        error.response?.data?.error || "Jahr konnte nicht abgeschlossen werden.",
      );
    } finally {
      setClosing(false);
    }
  };

  const handleDeleteYear = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    try {
      const response = await API.delete(`/years/${deleteTarget.year}`);
      setYears((current) =>
        current.filter((year) => year._id !== deleteTarget._id),
      );
      setDeleteTarget(null);
      setToastMessage(response.data.message || "Jahr gelöscht");
    } catch (error) {
      setToastMessage(
        error.response?.data?.error || "Jahr konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-shell admin-years-page">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}

      <div className="admin-years-toolbar">
        <div className="admin-years-count">
          <CalendarDays size={19} aria-hidden="true" />
          <span>
            {years.length} {years.length === 1 ? "Jahr" : "Jahre"}
          </span>
        </div>
        <StatusBadge
          label={testMode ? "Testdaten" : "Live-Daten"}
          tone={testMode ? "warning" : "neutral"}
        />
      </div>

      <Card as="section" className="admin-years-create" padding="md">
        <form onSubmit={handleCreateYear}>
          <label>
            <span>Neues Spieljahr</span>
            <input
              disabled={creating}
              inputMode="numeric"
              max="2200"
              min="1900"
              onChange={(event) => setNewYear(event.target.value)}
              placeholder="z. B. 2027"
              required
              type="number"
              value={newYear}
            />
          </label>
          <Button
            disabled={creating || !newYear}
            leadingIcon={<Plus size={18} />}
            type="submit"
          >
            {creating ? "Wird angelegt …" : "Jahr planen"}
          </Button>
        </form>
      </Card>

      {!loading &&
        years.length > 0 &&
        !hasActiveYear && (
          <Card className="admin-years-current-notice" padding="sm" variant="muted">
            <CirclePlay size={20} aria-hidden="true" />
            <div>
              <strong>Kein aktives Spieljahr</strong>
              <span>Aktiviere ein geplantes Jahr für Spiele und Punkte.</span>
            </div>
          </Card>
        )}

      {loading ? (
        <YearListSkeleton />
      ) : loadError ? (
        <Card className="admin-years-state" variant="muted">
          <RefreshCw size={23} aria-hidden="true" />
          <h2>Laden fehlgeschlagen</h2>
          <p>{loadError}</p>
          <Button
            leadingIcon={<RefreshCw size={17} />}
            onClick={() => fetchYears({ showLoader: true })}
            size="sm"
            variant="secondary"
          >
            Erneut laden
          </Button>
        </Card>
      ) : years.length === 0 ? (
        <Card className="admin-years-state" variant="muted">
          <CalendarDays size={23} aria-hidden="true" />
          <h2>Noch kein Spieljahr</h2>
          <p>Lege das erste Jahr für diesen Datenbereich an.</p>
        </Card>
      ) : (
        <div className="admin-years-list">
          {displayedYears.map((year) => (
            <YearCard
              activationBlocked={hasActiveYear}
              key={year._id}
              onActivate={() => setActivateTarget(year)}
              onClose={() => handleOpenClosePreview(year.year)}
              onDelete={() => setDeleteTarget(year)}
              onOpen={() => navigate(`/admin/years/${year.year}`)}
              year={year}
            />
          ))}
        </div>
      )}

      <YearCloseDialog
        busy={closing}
        loading={Boolean(closeState?.loading)}
        onClose={() => setCloseState(null)}
        onConfirm={handleCloseYear}
        open={Boolean(closeState)}
        preview={closeState?.preview}
        year={closeState?.year}
      />

      <ConfirmDialog
        busy={activating}
        busyLabel="Wird aktiviert …"
        confirmLabel="Jahr aktivieren"
        icon={<CirclePlay size={24} />}
        onCancel={() => setActivateTarget(null)}
        onConfirm={handleActivateYear}
        open={Boolean(activateTarget)}
        title={`Jahr ${activateTarget?.year || ""} aktivieren?`}
      >
        <p>Dieses Jahr wird zum aktuellen Spieljahr.</p>
        <p>Danach können Spiele, Punkte und Abschlüsse erfasst werden.</p>
      </ConfirmDialog>

      <ConfirmDialog
        busy={deleting}
        busyLabel="Wird gelöscht …"
        confirmLabel="Jahr löschen"
        danger
        icon={<Trash2 size={24} />}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteYear}
        open={Boolean(deleteTarget)}
        title={`Jahr ${deleteTarget?.year || ""} löschen?`}
      >
        <p>
          Das Jahr und {deleteTarget?.eveningsTotal || 0} zugehörige
          {deleteTarget?.eveningsTotal === 1 ? "r Abend" : " Abende"} werden
          dauerhaft gelöscht.
        </p>
        <p>Umfragen, Statistiken und Gruppenfotos dieser Abende sind enthalten.</p>
        {getYearStatus(deleteTarget) === YEAR_STATUSES.ACTIVE && (
          <p>Danach ist kein Spieljahr aktiv, bis ein geplantes Jahr aktiviert wird.</p>
        )}
      </ConfirmDialog>
    </div>
  );
}

function YearCard({
  activationBlocked,
  onActivate,
  onClose,
  onDelete,
  onOpen,
  year,
}) {
  const counts = { ...emptyStatusCounts, ...year.statusCounts };
  const activeCount = counts.offen + counts.fixiert;
  const completedCount = counts.abgeschlossen + counts.gesperrt;
  const yearStatus = getYearStatus(year);
  const yearStatusMeta = getYearStatusMeta(year);

  return (
    <Card
      as="article"
      className={`admin-year-card admin-year-card--${yearStatus}`}
      padding="md"
    >
      <button
        aria-label={`Details zum Spieljahr ${year.year} öffnen`}
        className="admin-year-card__open"
        onClick={onOpen}
        type="button"
      />

      <div className="admin-year-card__header">
        <div className="admin-year-card__title">
          <span>Spieljahr</span>
          <h2>{year.year}</h2>
        </div>
        <div className="admin-year-card__header-end">
          <StatusBadge
            label={yearStatusMeta.label}
            tone={yearStatusMeta.tone}
          />
          <ChevronRight
            aria-hidden="true"
            className="admin-year-card__open-indicator"
            size={19}
          />
        </div>
      </div>

      <div className="admin-year-card__facts">
        <YearFact
          icon={<CalendarDays size={17} />}
          value={`${year.eveningsTotal || 0} Abende`}
        />
        <YearFact
          icon={<CheckCircle2 size={17} />}
          value={`${completedCount} abgeschlossen`}
        />
        <YearFact
          icon={<Clock3 size={17} />}
          value={`${activeCount} ausstehend`}
        />
      </div>

      {year.closedAt && (
        <p className="admin-year-card__closed-at">
          <CalendarCheck2 size={16} aria-hidden="true" />
          {formatSwissDate(year.closedAt)}
        </p>
      )}

      <div
        className={`admin-year-card__actions${
          yearStatus === YEAR_STATUSES.CLOSED
            ? " admin-year-card__actions--closed"
            : ""
        }`}
      >
        {yearStatus === YEAR_STATUSES.PLANNED && (
          <Button
            disabled={activationBlocked}
            leadingIcon={<CirclePlay size={18} />}
            onClick={onActivate}
            size="sm"
            title={
              activationBlocked
                ? "Das aktive Jahr muss zuerst abgeschlossen werden"
                : "Als aktuelles Spieljahr festlegen"
            }
          >
            Aktivieren
          </Button>
        )}
        {yearStatus === YEAR_STATUSES.ACTIVE && (
          <Button
            leadingIcon={<CalendarCheck2 size={18} />}
            onClick={onClose}
            size="sm"
          >
            Abschluss prüfen
          </Button>
        )}
        <Button
          aria-label={`Jahr ${year.year} löschen`}
          iconOnly
          onClick={onDelete}
          size="sm"
          title="Jahr löschen"
          variant="danger-ghost"
        >
          <Trash2 size={18} />
        </Button>
      </div>
    </Card>
  );
}

function YearFact({ icon, value }) {
  return (
    <span>
      <span aria-hidden="true">{icon}</span>
      {value}
    </span>
  );
}

function YearListSkeleton() {
  return (
    <div className="admin-years-list" aria-label="Jahre werden geladen">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card className="admin-year-skeleton" key={index} padding="md">
          <SkeletonBlock className="admin-year-skeleton__title" />
          <SkeletonBlock className="admin-year-skeleton__badge" />
          <SkeletonBlock className="admin-year-skeleton__facts" />
          <SkeletonBlock className="admin-year-skeleton__actions" />
        </Card>
      ))}
    </div>
  );
}
