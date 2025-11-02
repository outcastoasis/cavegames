import { useState } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import "../../styles/components/UserCreateModal.css";

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
      onSuccess(); // Benutzerliste neu laden
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Fehler beim Erstellen.");
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Neuen Benutzer erstellen</h3>
        <form onSubmit={handleSubmit} className="user-form">
          <input
            className="input"
            name="displayName"
            placeholder="Anzeigename"
            value={form.displayName}
            onChange={handleChange}
            required
          />
          <input
            className="input"
            name="username"
            placeholder="Benutzername"
            value={form.username}
            onChange={handleChange}
            required
          />
          <input
            className="input"
            name="password"
            type="password"
            placeholder="Passwort"
            value={form.password}
            onChange={handleChange}
            required
          />
          <select
            className="input"
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="spieler">Spieler</option>
            <option value="admin">Admin</option>
          </select>

          {error && <div className="alert">{error}</div>}

          <div className="button-row">
            <button type="button" className="button" onClick={onClose}>
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
