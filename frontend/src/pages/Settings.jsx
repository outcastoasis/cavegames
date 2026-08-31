import { useEffect, useState } from "react";
import { Bell, BellOff, KeyRound } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import Toast from "../components/ui/Toast";
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

export default function Settings() {
  const { setTitle } = useOutletContext();
  const [pushState, setPushState] = useState(initialPushState);
  const [updatingPush, setUpdatingPush] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setTitle("Einstellungen");
  }, [setTitle]);

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

  const buttonText = updatingPush
    ? "Wird geändert…"
    : pushState.loading
      ? "Status wird geladen…"
      : !pushState.supported
        ? "Nicht unterstützt"
        : pushState.subscribed
          ? "Deaktivieren"
          : "Aktivieren";

  return (
    <div className="settings-page">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <section className="settings-intro">
        <h1>Persönliche Einstellungen</h1>
        <p>
          Verwalte hier deine Benachrichtigungen und künftig weitere
          Kontoeinstellungen.
        </p>
      </section>

      <section className="settings-card" aria-labelledby="push-title">
        <div className="settings-card-icon" aria-hidden="true">
          {pushState.subscribed ? <Bell size={22} /> : <BellOff size={22} />}
        </div>
        <div className="settings-card-content">
          <h2 id="push-title">Benachrichtigungen</h2>
          <p>
            {pushState.subscribed
              ? "Du erhältst auf diesem Gerät eine Meldung, wenn eine neue Umfrage erstellt wird."
              : "Aktiviere Meldungen für neue Umfragen auf diesem Gerät."}
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

      <section className="settings-card settings-card--muted">
        <div className="settings-card-icon" aria-hidden="true">
          <KeyRound size={22} />
        </div>
        <div className="settings-card-content">
          <h2>Passwort</h2>
          <p>Die selbstständige Passwortänderung wird hier später ergänzt.</p>
        </div>
        <span className="settings-coming-soon">Später</span>
      </section>
    </div>
  );
}
