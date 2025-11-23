// frontend/src/components/forms/UserEditModal.jsx

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import "../../styles/components/Modal.css";

export default function UserEditModal({ user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    displayName: "",
    role: "spieler",
    active: true,
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName || "",
        role: user.role || "spieler",
        active: user.active ?? true,
        password: "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        displayName: form.displayName,
        role: form.role,
        active: form.active,
      };
      if (form.password) payload.password = form.password;

      await API.patch(`/users/${user._id}`, payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Fehler beim Speichern.");
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal">
        <h2>Benutzer bearbeiten</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>Anzeigename</label>
          <input
            className="input"
            name="displayName"
            value={form.displayName}
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

          <label>Neues Passwort (optional)</label>
          <input
            className="input"
            type="password"
            name="password"
            value={form.password}
            placeholder="Leer lassen, um Passwort zu behalten"
            onChange={handleChange}
          />

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleChange}
            />
            Konto aktiv
          </label>

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
              {loading ? "Speichert..." : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
