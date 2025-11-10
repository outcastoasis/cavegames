import { useState } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import "../../styles/components/Modal.css";

export default function UserCreateModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    password: "",
    role: "spieler",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!form.displayName || !form.username || !form.password) {
      setError("Bitte alle Felder ausfüllen.");
      setLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein.");
      setLoading(false);
      return;
    }

    try {
      await API.post("/users", form);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Fehler beim Erstellen.");
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal">
        <h2>Neuen Benutzer erstellen</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>Anzeigename</label>
          <input
            className="input"
            name="displayName"
            placeholder="z. B. Jascha Bucher"
            value={form.displayName}
            onChange={handleChange}
            required
          />

          <label>Benutzername</label>
          <input
            className="input"
            name="username"
            placeholder="z. B. jascha"
            value={form.username}
            onChange={handleChange}
            required
          />

          <label>Passwort</label>
          <input
            className="input"
            name="password"
            type="password"
            placeholder="Mind. 6 Zeichen"
            value={form.password}
            onChange={handleChange}
            required
          />

          <label>Rolle</label>
          <select
            className="input"
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="spieler">Spieler</option>
            <option value="admin">Admin</option>
          </select>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="button neutral"
              onClick={onClose}
              disabled={loading}
            >
              Abbrechen
            </button>
            <button type="submit" className="button primary" disabled={loading}>
              {loading ? "Speichere..." : "Erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
