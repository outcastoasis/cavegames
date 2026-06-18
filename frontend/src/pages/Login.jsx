// frontend/src/pages/Login.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/pages/Login.css";
import logo from "../assets/images/icon-512.png";
import { LogIn, User, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import Spinner from "../components/ui/Spinner";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendWaiting, setBackendWaiting] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let retryTimer;

    const checkBackend = async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 2500);
      let isAvailable = false;

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/health`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );
        isAvailable = res.ok;
      } catch {
        isAvailable = false;
      } finally {
        window.clearTimeout(timeout);
      }

      if (!active) return;

      setBackendAvailable(isAvailable);

      if (!isAvailable) {
        retryTimer = window.setTimeout(checkBackend, 3000);
      }
    };

    checkBackend();

    return () => {
      active = false;
      window.clearTimeout(retryTimer);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || backendAvailable === false) return;

    setError("");
    setIsSubmitting(true);
    setBackendWaiting(false);

    const controller = new AbortController();
    const backendWaitingTimer = window.setTimeout(() => {
      setBackendWaiting(true);
    }, 1200);
    const requestTimeout = window.setTimeout(() => {
      controller.abort();
    }, 12000);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
          signal: controller.signal,
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Login fehlgeschlagen");

      setBackendAvailable(true);
      login(data.user, data.token);
      navigate("/");
    } catch (err) {
      if (err.name === "AbortError") {
        setError(
          "Das Backend antwortet noch nicht. Bitte kurz warten und erneut versuchen."
        );
      } else {
        setError(
          err.message === "Failed to fetch"
            ? "Backend nicht erreichbar. Der Server startet vermutlich noch."
            : err.message
        );
      }
    } finally {
      window.clearTimeout(backendWaitingTimer);
      window.clearTimeout(requestTimeout);
      setBackendWaiting(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-header">
        <img src={logo} alt="Logo" />
      </div>

      <div className="login-card">
        <h2>
          <LogIn size={20} /> Login
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="icon-input">
            <User size={18} />
            <input
              type="text"
              placeholder="Benutzername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting || backendAvailable === false}
              required
            />
          </div>

          <div className="icon-input">
            <Lock size={18} />
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting || backendAvailable === false}
              required
            />
          </div>

          <button
            type="submit"
            className="button login-button"
            disabled={isSubmitting || backendAvailable === false}
          >
            {isSubmitting && <Spinner size="small" label="Login läuft" />}
            <span>{isSubmitting ? "Einloggen..." : "Einloggen"}</span>
          </button>
          {backendAvailable === false && (
            <div className="login-status login-status--warning" role="status">
              Backend wird gestartet. Wir prüfen automatisch erneut...
            </div>
          )}
          {backendWaiting && (
            <div className="login-status" role="status">
              Backend wird gestartet. Bitte kurz warten...
            </div>
          )}
          {error && <p className="login-error">{error}</p>}
          <p className="text-small">
            Noch keinen Account? <br />
            <Link to="/register" className="register-link">
              Jetzt registrieren
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
