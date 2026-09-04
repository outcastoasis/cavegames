import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import {
  DatabaseZap,
  FlaskConical,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import StatusBadge from "../components/ui/StatusBadge";
import Toast from "../components/ui/Toast";
import { useAuth } from "../context/authState";
import { useTestMode } from "../context/testMode";
import API from "../services/api";
import "../styles/pages/AdminTestMode.css";

const testActions = {
  evenings: {
    buttonLabel: "Leeren",
    busyLabel: "Wird geleert …",
    confirmLabel: "Abenddaten leeren",
    confirmText:
      "Testabende, Testumfragen und zugehörige Teststatistiken werden dauerhaft gelöscht.",
    confirmTitle: "Testabend-Daten leeren?",
    description: "Abende, Umfragen und Statistiken zurücksetzen.",
    icon: RotateCcw,
    request: () => API.delete("/test-mode/evenings"),
    successText: "Testabend-Daten gelöscht",
    title: "Testabend-Daten leeren",
    tone: "warning",
  },
  users: {
    buttonLabel: "Erzeugen",
    busyLabel: "Wird erzeugt …",
    confirmLabel: "Testspieler erzeugen",
    confirmText:
      "Fehlende Testspieler werden mit ihren vorgesehenen Konten neu angelegt.",
    confirmTitle: "Testspieler erzeugen?",
    description: "Fehlende Testkonten wieder bereitstellen.",
    icon: Users,
    request: () => API.post("/test-mode/users"),
    successText: "Testspieler erzeugt",
    title: "Testspieler erzeugen",
    tone: "primary",
  },
  all: {
    buttonLabel: "Alles löschen",
    busyLabel: "Wird gelöscht …",
    confirmLabel: "Alle Testdaten löschen",
    confirmText:
      "Testabende, Umfragen, Statistiken, Spiele und Testspieler werden dauerhaft gelöscht.",
    confirmTitle: "Alle Testdaten löschen?",
    description: "Auch Testspiele und Testspieler entfernen.",
    icon: Trash2,
    request: () => API.delete("/test-mode/all"),
    successText: "Alle Testdaten gelöscht",
    title: "Alle Testdaten löschen",
    tone: "danger",
  },
};

export default function AdminTestMode() {
  const { user } = useAuth();
  const { testMode } = useTestMode();
  const { setTitle } = useOutletContext();
  const [pendingAction, setPendingAction] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    setTitle("Testmodus");
  }, [setTitle]);

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleConfirmedAction = async () => {
    const action = testActions[pendingAction];
    if (!action || busyAction) return;

    setBusyAction(pendingAction);
    try {
      await action.request();
      setPendingAction(null);
      setToastMessage(action.successText);
    } catch (error) {
      setToastMessage(
        error.response?.data?.error || "Aktion konnte nicht ausgeführt werden.",
      );
    } finally {
      setBusyAction("");
    }
  };

  const selectedAction = testActions[pendingAction] || testActions.all;
  const ConfirmationIcon = selectedAction.icon;

  return (
    <div className="page-shell page-shell--compact admin-testmode-page">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}

      <Card as="section" className="admin-testmode-intro" padding="md">
        <span className="admin-testmode-intro__icon" aria-hidden="true">
          <FlaskConical size={23} />
        </span>
        <div className="admin-testmode-intro__copy">
          <h2>Getrennter Datenbereich</h2>
          <p>Diese Aktionen verändern ausschliesslich Testdaten.</p>
        </div>
        <StatusBadge
          label={testMode ? "Testmodus aktiv" : "Live-Modus aktiv"}
          tone={testMode ? "warning" : "neutral"}
        />
      </Card>

      <section
        aria-labelledby="admin-testmode-actions-title"
        className="admin-testmode-section"
      >
        <div className="admin-testmode-section__heading">
          <div>
            <span>Verwaltung</span>
            <h2 id="admin-testmode-actions-title">Testdaten</h2>
          </div>
          <DatabaseZap size={21} aria-hidden="true" />
        </div>

        <div
          aria-busy={Boolean(busyAction)}
          className="admin-testmode-actions"
        >
          {Object.entries(testActions).map(([key, action]) => (
            <TestActionCard
              action={action}
              busy={busyAction === key}
              disabled={Boolean(busyAction)}
              key={key}
              onClick={() => setPendingAction(key)}
            />
          ))}
        </div>
      </section>

      <ConfirmDialog
        busy={Boolean(busyAction)}
        busyLabel={selectedAction.busyLabel}
        confirmLabel={selectedAction.confirmLabel}
        danger={selectedAction.tone === "danger" || pendingAction === "evenings"}
        icon={<ConfirmationIcon size={24} />}
        onCancel={() => setPendingAction(null)}
        onConfirm={handleConfirmedAction}
        open={Boolean(pendingAction)}
        title={selectedAction.confirmTitle}
      >
        <p>{selectedAction.confirmText}</p>
        <p>Live-Daten bleiben unverändert.</p>
      </ConfirmDialog>
    </div>
  );
}

function TestActionCard({ action, busy, disabled, onClick }) {
  const ActionIcon = action.icon;

  return (
    <Card
      as="article"
      className={`admin-testmode-action admin-testmode-action--${action.tone}`}
      padding="md"
    >
      <span className="admin-testmode-action__icon" aria-hidden="true">
        <ActionIcon size={22} />
      </span>
      <div className="admin-testmode-action__copy">
        <h3>{action.title}</h3>
        <p>{action.description}</p>
      </div>
      <Button
        disabled={disabled}
        fullWidth
        onClick={onClick}
        variant={
          action.tone === "danger"
            ? "danger"
            : action.tone === "warning"
              ? "danger-ghost"
              : "primary"
        }
      >
        {busy ? action.busyLabel : action.buttonLabel}
      </Button>
    </Card>
  );
}
