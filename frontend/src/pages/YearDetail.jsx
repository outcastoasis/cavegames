import { useCallback, useEffect, useState } from "react";
import {
  Navigate,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Gamepad2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import YearCloseDialog from "../components/forms/YearCloseDialog";
import YearEveningModal from "../components/forms/YearEveningModal";
import EveningCard from "../components/evenings/EveningCard";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import PageLoader from "../components/ui/PageLoader";
import StatusBadge from "../components/ui/StatusBadge";
import Toast from "../components/ui/Toast";
import { useAuth } from "../context/authState";
import API from "../services/api";
import { formatSwissDate } from "../utils/swissDateTime";
import "../styles/pages/YearDetail.css";

const statusTone = {
  offen: "warning",
  fixiert: "success",
  abgeschlossen: "primary",
  gesperrt: "neutral",
};

export default function YearDetail() {
  const { user } = useAuth();
  const { year } = useParams();
  const navigate = useNavigate();
  const { setTitle } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editEvening, setEditEvening] = useState(null);
  const [fixEvening, setFixEvening] = useState(null);
  const [users, setUsers] = useState([]);
  const [years, setYears] = useState([]);
  const [closeState, setCloseState] = useState(null);
  const [closing, setClosing] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const fetchYearData = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    setLoadError("");

    try {
      const response = await API.get(`/years/${year}`);
      setData(response.data);
    } catch (error) {
      console.error("Fehler beim Laden der Jahresdaten:", error);
      setLoadError(
        error.response?.data?.error || "Jahresdaten konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    setTitle(`Jahr ${year}`);
    fetchYearData();
  }, [fetchYearData, setTitle, year]);

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const fetchAdminOptions = async () => {
    if (users.length && years.length) return true;

    try {
      const [usersResponse, yearsResponse] = await Promise.all([
        API.get("/users"),
        API.get("/years"),
      ]);
      setUsers(usersResponse.data.filter((item) => item.active !== false));
      setYears(yearsResponse.data);
      return true;
    } catch (error) {
      setToastMessage(
        error.response?.data?.error ||
          "Daten für die Bearbeitung konnten nicht geladen werden.",
      );
      return false;
    }
  };

  const openEditEvening = async (evening) => {
    if (await fetchAdminOptions()) setEditEvening(evening);
  };

  const handleOpenClosePreview = async () => {
    setCloseState({ loading: true, preview: null });
    try {
      const response = await API.get(`/years/${year}/close-preview`);
      setCloseState({ loading: false, preview: response.data.preview });
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
      const response = await API.post(`/years/${year}/close`);
      setCloseState(null);
      await fetchYearData();
      setToastMessage(response.data.message || "Jahr abgeschlossen");
    } catch (error) {
      if (error.response?.data?.preview) {
        setCloseState({
          loading: false,
          preview: error.response.data.preview,
        });
      }
      setToastMessage(
        error.response?.data?.error || "Jahr konnte nicht abgeschlossen werden.",
      );
    } finally {
      setClosing(false);
    }
  };

  const handleConfirmedAction = async () => {
    if (!confirmAction || actionBusy) return;
    const { type, evening } = confirmAction;

    setActionBusy(true);
    try {
      if (type === "delete-year") {
        const response = await API.delete(`/years/${year}`);
        setToastMessage(response.data.message || "Jahr gelöscht");
        setConfirmAction(null);
        navigate("/admin/years", { replace: true });
        return;
      }

      if (type === "delete-evening") {
        await API.delete(`/evenings/${evening._id}`);
        setToastMessage("Abend gelöscht");
      } else {
        await API.patch(`/evenings/${evening._id}/status`, { status: "offen" });
        setToastMessage("Terminfixierung zurückgesetzt");
      }

      setConfirmAction(null);
      await fetchYearData();
    } catch (error) {
      setToastMessage(
        error.response?.data?.error || "Aktion konnte nicht ausgeführt werden.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell page-shell--compact year-detail-page">
        <PageLoader
          compact
          message="Abende und Status werden vorbereitet."
          title="Spieljahr wird geladen"
        />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="page-shell page-shell--compact year-detail-page">
        <Card className="year-detail-state" variant="muted">
          <RefreshCw size={23} aria-hidden="true" />
          <h2>Laden fehlgeschlagen</h2>
          <p>{loadError || "Keine Jahresdaten gefunden."}</p>
          <Button
            leadingIcon={<RefreshCw size={17} />}
            onClick={() => fetchYearData({ showLoader: true })}
            size="sm"
            variant="secondary"
          >
            Erneut laden
          </Button>
        </Card>
      </div>
    );
  }

  const { year: yearData, evenings } = data;
  const summary = getYearSummary(evenings);
  const confirmation = getConfirmationContent(confirmAction, year, evenings.length);

  return (
    <div className="page-shell page-shell--compact year-detail-page">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}

      <Button
        className="year-detail-back"
        leadingIcon={<ArrowLeft size={18} />}
        onClick={() => navigate("/admin/years")}
        size="sm"
        variant="ghost"
      >
        Zurück
      </Button>

      <Card
        as="section"
        className={`year-detail-summary year-detail-summary--${
          yearData.closed ? "closed" : "open"
        }`}
        padding="md"
      >
        <div className="year-detail-summary__header">
          <div>
            <span>Spieljahr</span>
            <h1>{yearData.year}</h1>
          </div>
          <div className="year-detail-summary__badges">
            <StatusBadge
              label={yearData.closed ? "Abgeschlossen" : "Offen"}
              tone={yearData.closed ? "success" : "warning"}
            />
            {yearData.isTestData && (
              <StatusBadge label="Test" tone="warning" />
            )}
          </div>
        </div>

        {yearData.closedAt && (
          <p className="year-detail-summary__closed-at">
            <CalendarCheck2 size={16} aria-hidden="true" />
            Abgeschlossen am {formatSwissDate(yearData.closedAt)}
          </p>
        )}

        <div className="year-detail-metrics">
          <Metric icon={<CalendarDays size={19} />} label="Abende" value={evenings.length} />
          <Metric icon={<Users size={19} />} label="Teilnahmen" value={summary.participants} />
          <Metric icon={<Gamepad2 size={19} />} label="Spiele" value={summary.games} />
          <Metric icon={<Trophy size={19} />} label="Punkte" value={summary.points} />
        </div>

        {evenings.length > 0 && (
          <div className="year-detail-statuses" aria-label="Status der Abende">
            {Object.entries(summary.statusCounts)
              .filter(([, count]) => count > 0)
              .map(([status, count]) => (
                <StatusBadge
                  key={status}
                  label={`${count} ${getStatusLabel(status)}`}
                  showDot={false}
                  tone={statusTone[status]}
                />
              ))}
          </div>
        )}

        <div className="year-detail-summary__actions">
          {!yearData.closed && (
            <Button
              leadingIcon={<CalendarCheck2 size={18} />}
              onClick={handleOpenClosePreview}
              size="sm"
            >
              Abschluss prüfen
            </Button>
          )}
          <Button
            leadingIcon={<Trash2 size={18} />}
            onClick={() => setConfirmAction({ type: "delete-year" })}
            size="sm"
            variant="danger-ghost"
          >
            Jahr löschen
          </Button>
        </div>
      </Card>

      <section className="year-detail-section" aria-labelledby="year-evenings-title">
        <div className="year-detail-section__heading">
          <h2 id="year-evenings-title">Spieleabende</h2>
          <span>{evenings.length}</span>
        </div>

        {evenings.length === 0 ? (
          <Card className="year-detail-empty" padding="md" variant="muted">
            <CalendarDays size={22} aria-hidden="true" />
            <p>In diesem Jahr sind noch keine Abende vorhanden.</p>
          </Card>
        ) : (
          <div className="year-detail-list">
            {evenings.map((evening) => (
              <EveningCard
                actionLabel="Abend ansehen"
                evening={evening}
                footer={
                  !yearData.closed ? (
                    <EveningAdminActions
                      evening={evening}
                      onDelete={() =>
                        setConfirmAction({ type: "delete-evening", evening })
                      }
                      onEdit={() => openEditEvening(evening)}
                      onFix={() => setFixEvening(evening)}
                      onReset={() =>
                        setConfirmAction({ type: "reset-evening", evening })
                      }
                    />
                  ) : null
                }
                key={evening._id}
                onOpen={() => navigate(`/abende/${evening._id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {editEvening && (
        <YearEveningModal
          evening={editEvening}
          onClose={() => setEditEvening(null)}
          onSuccess={async (message) => {
            await fetchYearData();
            setToastMessage(message);
          }}
          users={users}
          years={years}
        />
      )}

      {fixEvening && (
        <YearEveningModal
          evening={fixEvening}
          mode="fix"
          onClose={() => setFixEvening(null)}
          onSuccess={async (message) => {
            await fetchYearData();
            setToastMessage(message);
          }}
        />
      )}

      <YearCloseDialog
        busy={closing}
        loading={Boolean(closeState?.loading)}
        onClose={() => setCloseState(null)}
        onConfirm={handleCloseYear}
        open={Boolean(closeState)}
        preview={closeState?.preview}
        year={year}
      />

      <ConfirmDialog
        busy={actionBusy}
        busyLabel={confirmation.busyLabel}
        confirmLabel={confirmation.confirmLabel}
        danger={confirmation.danger}
        icon={confirmation.icon}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmedAction}
        open={Boolean(confirmAction)}
        title={confirmation.title}
      >
        <p>{confirmation.description}</p>
      </ConfirmDialog>
    </div>
  );
}

function EveningAdminActions({ evening, onDelete, onEdit, onFix, onReset }) {
  return (
    <div className="year-detail-evening-actions">
      <Button
        aria-label="Abend bearbeiten"
        iconOnly
        onClick={onEdit}
        size="sm"
        title="Abend bearbeiten"
        variant="secondary"
      >
        <Pencil size={18} />
      </Button>
      {evening.status === "offen" && (
        <Button
          aria-label="Termin fixieren"
          iconOnly
          onClick={onFix}
          size="sm"
          title="Termin fixieren"
        >
          <CalendarCheck2 size={18} />
        </Button>
      )}
      {evening.status === "fixiert" && (
        <Button
          aria-label="Terminfixierung zurücksetzen"
          iconOnly
          onClick={onReset}
          size="sm"
          title="Terminfixierung zurücksetzen"
          variant="secondary"
        >
          <RotateCcw size={18} />
        </Button>
      )}
      <Button
        aria-label="Abend löschen"
        iconOnly
        onClick={onDelete}
        size="sm"
        title="Abend löschen"
        variant="danger-ghost"
      >
        <Trash2 size={18} />
      </Button>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="year-detail-metric">
      <span aria-hidden="true">{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function getYearSummary(evenings) {
  return evenings.reduce(
    (summary, evening) => {
      summary.participants += evening.participantRefs?.length || 0;
      summary.games += evening.games?.length || 0;
      summary.points += Number(evening.totalPoints) || 0;
      if (summary.statusCounts[evening.status] != null) {
        summary.statusCounts[evening.status] += 1;
      }
      return summary;
    },
    {
      participants: 0,
      games: 0,
      points: 0,
      statusCounts: {
        offen: 0,
        fixiert: 0,
        abgeschlossen: 0,
        gesperrt: 0,
      },
    },
  );
}

function getStatusLabel(status) {
  const labels = {
    offen: "offen",
    fixiert: "fixiert",
    abgeschlossen: "abgeschlossen",
    gesperrt: "gesperrt",
  };
  return labels[status] || status;
}

function getConfirmationContent(action, year, eveningCount) {
  if (action?.type === "delete-evening") {
    return {
      busyLabel: "Wird gelöscht …",
      confirmLabel: "Abend löschen",
      danger: true,
      description:
        "Der Abend, seine Umfrage und die zugehörigen Jahresstatistiken werden entfernt.",
      icon: <Trash2 size={24} />,
      title: "Abend löschen?",
    };
  }

  if (action?.type === "reset-evening") {
    return {
      busyLabel: "Wird zurückgesetzt …",
      confirmLabel: "Zurücksetzen",
      danger: false,
      description:
        "Der Termin wird entfernt und eine vorhandene Abstimmung wieder geöffnet.",
      icon: <RotateCcw size={24} />,
      title: "Terminfixierung zurücksetzen?",
    };
  }

  return {
    busyLabel: "Wird gelöscht …",
    confirmLabel: "Jahr löschen",
    danger: true,
    description: `Jahr ${year} und ${eveningCount} zugehörige${
      eveningCount === 1 ? "r Abend" : " Abende"
    } werden inklusive Umfragen, Statistiken und Gruppenfotos dauerhaft gelöscht.`,
    icon: <Trash2 size={24} />,
    title: `Jahr ${year} löschen?`,
  };
}
