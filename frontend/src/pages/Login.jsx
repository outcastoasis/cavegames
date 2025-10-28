// frontend/src/pages/Login.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/pages/Login.css";
import logo from "../assets/images/Logo_Cavegames.png";
import { LogIn, User, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Login fehlgeschlagen");

      login(data.user, data.token);
      navigate("/");
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
            Einloggen
          </button>
          {error && (
            <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>
          )}
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
