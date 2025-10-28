// frontend/src/pages/Register.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/pages/Login.css";
import logo from "../assets/images/Logo_Cavegames.png";
import { UserPlus, User, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, displayName, password }),
        }
      );

      const data = await res.json();

      if (!res.ok)
        throw new Error(data.error || "Registrierung fehlgeschlagen");

      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-header">
        <img src={logo} alt="Logo" />
      </div>

      <div className="login-card">
        <h2>
          <UserPlus size={20} /> Registrieren
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="icon-input">
            <User size={18} />
            <input
              type="text"
              placeholder="Benutzername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="icon-input">
            <User size={18} />
            <input
              type="text"
              placeholder="Anzeigename"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
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
              required
            />
          </div>

          <button type="submit" className="button login-button">
            Registrieren
          </button>
          {error && (
            <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>
          )}
          <p className="text-small">
            Doch bereits einen Account? <br />
            <Link to="/login" className="register-link">
              Jetzt einloggen
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
