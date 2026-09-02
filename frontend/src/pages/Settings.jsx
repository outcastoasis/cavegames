import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CalendarCheck2,
  CalendarClock,
  CalendarSync,
  ChevronDown,
  ClipboardList,
  KeyRound,
  ListChecks,
  Trophy,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import PasswordChangeDialog from "../components/forms/PasswordChangeDialog";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Switch from "../components/ui/Switch";
import Toast from "../components/ui/Toast";
import { useAuth } from "../context/authState";
import API from "../services/api";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationState,
} from "../utils/pushNotifications";
import "../styles/pages/Settings.css";

const initialPushState = {
  loading: true,
  supported: true,
  permission: "default",
  subscribed: false,
  needsIosInstallation: false,
};

const initialPreferences = {
  pollAssignment: true,
  pollCreated: true,
  pollReminder: true,
  pollFinalized: true,
  eveningChanged: true,
  resultsAvailable: true,
  eveningUpcoming: true,
};

const notificationCategories = [
  {
    key: "pollAssignment",
    title: "Als Spielleiter eingeteilt",
    description: "Wenn du eine Termin-Umfrage erstellen sollst.",
    icon: ClipboardList,
  },
  {
    key: "pollCreated",
    title: "Neue Umfragen",
    description: "Sobald eine neue Termin-Umfrage bereit ist.",
    icon: ListChecks,
  },
  {
    key: "pollReminder",
    title: "Offene Abstimmungen",
    description: "Wöchentlich, solange deine Auswahl fehlt.",
    icon: CalendarClock,
  },
  {
    key: "pollFinalized",
    title: "Termin fixiert",
    description: "Wenn Datum und Uhrzeit festgelegt wurden.",
    icon: CalendarCheck2,
  },
  {
    key: "eveningChanged",
    title: "Spieleabend geändert",
    description: "Bei Änderungen an Termin, Jahr oder Spielleitung.",
    icon: CalendarSync,
  },
  {
    key: "resultsAvailable",
    title: "Resultate verfügbar",
    description: "Sobald ein Abend ausgewertet wurde.",
    icon: Trophy,
  },
  {
    key: "eveningUpcoming",
    title: "Spieleabend in einer Woche",
    description: "Erinnerung an Termin und Teilnahme.",
    icon: CalendarClock,
  },
];

export default function Settings() {
  const { setTitle } = useOutletContext();
  const { logout } = useAuth();
  const [pushState, setPushState] = useState(initialPushState);
  const [updatingPush, setUpdatingPush] = useState(false);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingPreference, setSavingPreference] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const logoutTimerRef = useRef(null);

  useEffect(() => {
    setTitle("Einstellungen");
  }, [setTitle]);

  useEffect(
    () => () => {
      window.clearTimeout(logoutTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    let active = true;

    getPushNotificationState()
      .then((state) => {
        if (active) setPushState({ ...state, loading: false });
      })
      .catch((error) => {
        console.error("Push-Status konnte nicht geladen werden:", error);
        if (active) {
          setPushState((current) => ({
            ...current,
            loading: false,
            supported: false,
          }));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    API.get("/notifications/preferences")
      .then((response) => {
        if (active) setPreferences(response.data);
      })
      .catch((error) => {
        console.error(
          "Benachrichtigungseinstellungen konnten nicht geladen werden:",
          error,
        );
        if (active) {
          setToast(
            error.response?.data?.error ||
              "Benachrichtigungseinstellungen konnten nicht geladen werden.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingPreferences(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handlePushToggle = async () => {
    if (updatingPush) return;

    setUpdatingPush(true);
    try {
      const nextState = pushState.subscribed
        ? await disablePushNotifications()
        : await enablePushNotifications();
      setPushState({ ...nextState, loading: false });
      setToast(
        nextState.subscribed
          ? "Benachrichtigungen aktiviert"
          : "Benachrichtigungen deaktiviert",
      );
    } catch (error) {
      setToast(
        error.response?.data?.error ||
          error.message ||
          "Benachrichtigungseinstellung konnte nicht geändert werden.",
      );

      try {
        const currentState = await getPushNotificationState();
        setPushState({ ...currentState, loading: false });
      } catch {
        // Der bisher sichtbare Status bleibt erhalten.
      }
    } finally {
      setUpdatingPush(false);
    }
  };

  const handlePreferenceToggle = async (key, enabled) => {
    if (savingPreference) return;

    const previousValue = preferences[key];
    setPreferences((current) => ({ ...current, [key]: enabled }));
    setSavingPreference(key);
    try {
      const response = await API.patch("/notifications/preferences", {
        [key]: enabled,
      });
      setPreferences(response.data);
      setToast("Benachrichtigungseinstellung gespeichert");
    } catch (error) {
      setPreferences((current) => ({ ...current, [key]: previousValue }));
      setToast(
        error.response?.data?.error ||
          "Benachrichtigungseinstellung konnte nicht gespeichert werden.",
      );
    } finally {
      setSavingPreference("");
    }
  };

  const handlePasswordChanged = (message) => {
    setPasswordDialogOpen(false);
    setToast(message || "Passwort geändert. Bitte melde dich erneut an.");
    logoutTimerRef.current = window.setTimeout(() => logout(), 1600);
  };

  const pushButtonText = updatingPush
    ? "Wird geändert …"
    : pushState.loading
      ? "Wird geladen …"
      : !pushState.supported
        ? "Nicht unterstützt"
        : pushState.subscribed
          ? "Deaktivieren"
          : "Aktivieren";
  const pushDisabled =
    pushState.loading ||
    updatingPush ||
    !pushState.supported ||
    pushState.needsIosInstallation ||
    (!pushState.subscribed && pushState.permission === "denied");
  const enabledCategoryCount = notificationCategories.filter(
    ({ key }) => preferences[key],
  ).length;

  return (
    <div className="page-shell page-shell--compact settings-page">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <section className="settings-section" aria-labelledby="settings-notifications-title">
        <div className="settings-section-heading">
          <span>Mitteilungen</span>
          <h2 id="settings-notifications-title">Benachrichtigungen</h2>
        </div>

        <Card className="settings-notification-card" padding="none">
          <div className="settings-primary-row">
            <span className="settings-row-icon" aria-hidden="true">
              {pushState.subscribed ? <Bell size={21} /> : <BellOff size={21} />}
            </span>
            <div className="settings-row-copy">
              <strong>Push auf diesem Gerät</strong>
              <span>
                {pushState.subscribed
                  ? "Dieses Gerät empfängt deine Auswahl."
                  : "Push-Mitteilungen für dieses Gerät aktivieren."
                }
              </span>
            </div>
            <Button
              disabled={pushDisabled}
              onClick={handlePushToggle}
              size="sm"
              variant={pushState.subscribed ? "secondary" : "primary"}
            >
              {pushButtonText}
            </Button>
          </div>

          {pushState.needsIosInstallation && (
            <p className="settings-notice">
              Auf dem iPhone zuerst über „Zum Home-Bildschirm“ installieren.
            </p>
          )}
          {pushState.permission === "denied" && (
            <p className="settings-notice settings-notice--warning">
              Push ist in den Browser-Einstellungen blockiert.
            </p>
          )}

          <button
            type="button"
            className={`settings-category-trigger${categoriesOpen ? " is-open" : ""}`}
            aria-expanded={categoriesOpen}
            aria-controls="notification-category-list"
            onClick={() => setCategoriesOpen((open) => !open)}
          >
            <span>
              <strong>Benachrichtigungsarten</strong>
              <small>
                {loadingPreferences
                  ? "Wird geladen …"
                  : `${enabledCategoryCount} von ${notificationCategories.length} aktiv`}
              </small>
            </span>
            <ChevronDown size={20} aria-hidden="true" />
          </button>

          <div
            id="notification-category-list"
            className="settings-category-list"
            hidden={!categoriesOpen}
          >
            {notificationCategories.map((category) => {
              const Icon = category.icon;
              return (
                <div className="settings-category-row" key={category.key}>
                  <span className="settings-category-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <Switch
                    checked={Boolean(preferences[category.key])}
                    description={category.description}
                    disabled={loadingPreferences || Boolean(savingPreference)}
                    label={category.title}
                    name={`notification-${category.key}`}
                    onChange={(enabled) =>
                      handlePreferenceToggle(category.key, enabled)
                    }
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="settings-section" aria-labelledby="settings-security-title">
        <div className="settings-section-heading">
          <span>Konto</span>
          <h2 id="settings-security-title">Sicherheit</h2>
        </div>

        <Card className="settings-primary-row" padding="md">
          <span className="settings-row-icon" aria-hidden="true">
            <KeyRound size={21} />
          </span>
          <div className="settings-row-copy">
            <strong>Passwort</strong>
            <span>Persönlichen Zugang aktualisieren.</span>
          </div>
          <Button
            onClick={() => setPasswordDialogOpen(true)}
            size="sm"
            variant="secondary"
          >
            Ändern
          </Button>
        </Card>
      </section>

      {passwordDialogOpen && (
        <PasswordChangeDialog
          onClose={() => setPasswordDialogOpen(false)}
          onSuccess={handlePasswordChanged}
        />
      )}
    </div>
  );
}
