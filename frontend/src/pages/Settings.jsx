import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CalendarCheck2,
  CalendarClock,
  CalendarSync,
  ChevronDown,
  KeyRound,
  ListChecks,
  Trophy,
} from "lucide-react";
import { useOutletContext } from "react-router-dom";
import PasswordChangeDialog from "../components/forms/PasswordChangeDialog";
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
  pollCreated: true,
  pollReminder: true,
  pollFinalized: true,
  eveningChanged: true,
  resultsAvailable: true,
  eveningUpcoming: true,
};

const notificationCategories = [
  {
    key: "pollCreated",
    title: "Neue Umfragen",
    description: "Sobald eine neue Termin-Umfrage erstellt wurde.",
    icon: ListChecks,
  },
  {
    key: "pollReminder",
    title: "Offene Abstimmungen",
    description:
      "Einmal pro Woche, aber nur wenn deine eigene Abstimmung noch fehlt.",
    icon: CalendarClock,
  },
  {
    key: "pollFinalized",
    title: "Termin wurde fixiert",
    description: "Mit dem festgelegten Datum und der genauen Uhrzeit.",
    icon: CalendarCheck2,
  },
  {
    key: "eveningChanged",
    title: "Spieleabend wurde geändert",
    description: "Wenn Termin, Spieljahr oder Spielleitung geändert wurden.",
    icon: CalendarSync,
  },
  {
    key: "resultsAvailable",
    title: "Resultate sind verfügbar",
    description: "Sobald der Abend abgeschlossen und ausgewertet wurde.",
    icon: Trophy,
  },
  {
    key: "eveningUpcoming",
    title: "Spieleabend in einer Woche",
    description:
      "Erinnert an den Termin und den Teilnahme-Schalter «Dabei / Nicht dabei».",
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
      setPreferences((current) => ({
        ...current,
        [key]: previousValue,
      }));
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

  const buttonText = updatingPush
    ? "Wird geändert…"
    : pushState.loading
      ? "Status wird geladen…"
      : !pushState.supported
        ? "Nicht unterstützt"
        : pushState.subscribed
          ? "Deaktivieren"
          : "Aktivieren";
  const enabledCategoryCount = notificationCategories.filter(
    ({ key }) => preferences[key],
  ).length;

  return (
    <div className="settings-page">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div
        className="settings-notifications-group"
        aria-label="Benachrichtigungseinstellungen"
      >
      <section className="settings-card" aria-labelledby="push-title">
        <div className="settings-card-icon" aria-hidden="true">
          {pushState.subscribed ? <Bell size={22} /> : <BellOff size={22} />}
        </div>
        <div className="settings-card-content">
          <h2 id="push-title">Benachrichtigungen</h2>
          <p>
            {pushState.subscribed
              ? "Dieses Gerät kann die unten ausgewählten Meldungen empfangen."
              : "Aktiviere Push-Meldungen auf diesem Gerät."}
          </p>
          {pushState.needsIosInstallation && (
            <p className="settings-hint">
              Auf dem iPhone muss Cavegames zuerst über «Zum Home-Bildschirm»
              installiert und von dort geöffnet werden.
            </p>
          )}
          {pushState.permission === "denied" && (
            <p className="settings-hint settings-hint--warning">
              Benachrichtigungen sind in den Browser-Einstellungen blockiert.
            </p>
          )}
        </div>
        <button
          type="button"
          className={`button small ${
            pushState.subscribed ? "neutral" : "primary"
          }`}
          onClick={handlePushToggle}
          disabled={
            pushState.loading ||
            updatingPush ||
            !pushState.supported ||
            pushState.needsIosInstallation ||
            (!pushState.subscribed && pushState.permission === "denied")
          }
        >
          {buttonText}
        </button>
      </section>

      <section
        className="settings-category-section"
        aria-label="Benachrichtigungsarten"
      >
        <button
          type="button"
          className={`settings-category-heading ${
            categoriesOpen ? "settings-category-heading--open" : ""
          }`}
          aria-expanded={categoriesOpen}
          aria-controls="notification-category-list"
          onClick={() => setCategoriesOpen((open) => !open)}
        >
          <span className="settings-category-heading-copy">
            <span className="settings-category-title">
              Benachrichtigungsarten
            </span>
            <span className="settings-category-description">
              Diese Auswahl gilt für dein Konto auf allen Geräten.
            </span>
          </span>
          <span className="settings-category-heading-action">
            <span className="settings-category-status">
              {loadingPreferences
                ? "Wird geladen…"
                : `${enabledCategoryCount} von ${notificationCategories.length} aktiv`}
            </span>
            <ChevronDown
              className="settings-category-chevron"
              size={21}
              aria-hidden="true"
            />
          </span>
        </button>

        <div
          id="notification-category-list"
          className="settings-category-list"
          hidden={!categoriesOpen}
        >
          {notificationCategories.map((category) => {
            const Icon = category.icon;
            const inputId = `notification-${category.key}`;
            return (
              <div className="settings-category-row" key={category.key}>
                <div className="settings-category-icon" aria-hidden="true">
                  <Icon size={19} />
                </div>
                <label
                  className="settings-category-content"
                  htmlFor={inputId}
                >
                  <strong>{category.title}</strong>
                  <span>{category.description}</span>
                </label>
                <label className="settings-switch" htmlFor={inputId}>
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={Boolean(preferences[category.key])}
                    onChange={(event) =>
                      handlePreferenceToggle(
                        category.key,
                        event.target.checked,
                      )
                    }
                    disabled={
                      loadingPreferences || Boolean(savingPreference)
                    }
                  />
                  <span className="settings-switch-track" aria-hidden="true" />
                  <span className="settings-switch-label">
                    {preferences[category.key] ? "Ein" : "Aus"}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </section>
      </div>

      <section className="settings-card" aria-labelledby="password-title">
        <div className="settings-card-icon" aria-hidden="true">
          <KeyRound size={22} />
        </div>
        <div className="settings-card-content">
          <h2 id="password-title">Passwort</h2>
          <p>Ändere das Passwort für deinen persönlichen Zugang.</p>
        </div>
        <button
          type="button"
          className="button small neutral"
          onClick={() => setPasswordDialogOpen(true)}
        >
          Passwort ändern
        </button>
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
