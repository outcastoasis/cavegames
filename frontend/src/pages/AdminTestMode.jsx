import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { FlaskConical, RotateCcw, Trash2, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import Toast from "../components/ui/Toast";
import "../styles/pages/AdminTestMode.css";

export default function AdminTestMode() {
  const { user } = useAuth();
  const { setTitle } = useOutletContext();
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle("Testmodus");
  }, [setTitle]);

  const runAction = async (key, confirmText, request, successText) => {
    if (!window.confirm(confirmText)) return;
    setBusy(key);
    setError("");
    try {
      await request();
      setToast(successText);
    } catch (err) {
      setError(err.response?.data?.error || "Aktion fehlgeschlagen");
    } finally {
      setBusy("");
    }
  };

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-testmode-page">
      <div className="admin-testmode-header">
        <FlaskConical size={22} />
        <span>Testmodus-Verwaltung</span>
      </div>

      <div className="admin-testmode-actions">
        <button
          className="card admin-testmode-action"
          disabled={Boolean(busy)}
          onClick={() =>
            runAction(
              "evenings",
              "Alle Testabend-Daten inklusive Test-Umfragen und Test-Statistiken löschen?",
              () => API.delete("/test-mode/evenings"),
              "Testabend-Daten gelöscht",
            )
          }
        >
          <RotateCcw size={20} />
          <span>Testabend-Daten leeren</span>
        </button>

        <button
          className="card admin-testmode-action"
          disabled={Boolean(busy)}
          onClick={() =>
            runAction(
              "users",
              "Testspieler neu erzeugen?",
              () => API.post("/test-mode/users"),
              "Testspieler erzeugt",
            )
          }
        >
          <Users size={20} />
          <span>Testspieler neu erzeugen</span>
        </button>

        <button
          className="card admin-testmode-action danger"
          disabled={Boolean(busy)}
          onClick={() =>
            runAction(
              "all",
              "Alle Testdaten wirklich löschen? Das entfernt Testabende, Testumfragen, Testspiele und Testspieler.",
              () => API.delete("/test-mode/all"),
              "Alle Testdaten gelöscht",
            )
          }
        >
          <Trash2 size={20} />
          <span>Alle Testdaten löschen</span>
        </button>
      </div>

      {error && <Toast message={error} onClose={() => setError("")} />}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
