// src/components/forms/EveningCreateModal.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import "../../styles/components/Modal.css";

export default function EveningCreateModal({ onClose, onSuccess }) {
  const [years, setYears] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [yearsRes, usersRes] = await Promise.all([
        API.get("/years"),
        API.get("/users"),
      ]);
      setYears(yearsRes.data);
      setUsers(usersRes.data.filter((u) => u.active !== false));
    } catch {
      setError("Fehler beim Laden der Daten");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedYear || !selectedUserId) {
      setError("Bitte Jahr und Spielleiter auswählen.");
      return;
    }

    try {
      setLoading(true);
      await API.post("/evenings", {
        spieljahr: selectedYear,
        spielleiterId: selectedUserId,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Fehler beim Erstellen");
    } finally {
      setLoading(false);
    }
  };

  const spielleiterName =
    users.find((u) => u._id === selectedUserId)?.displayName || "";

  return createPortal(
    <div className="modal-overlay">
      <div className="modal">
        <h2>Neuen Abend erstellen</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>Spieljahr</label>
          <select
            className="input"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">– bitte wählen –</option>
            {years.map((y) => (
              <option key={y._id} value={y.year} disabled={y.closed}>
                {y.year} {y.closed ? "(abgeschlossen)" : ""}
              </option>
            ))}
          </select>

          <label>Spielleiter</label>
          <select
            className="input"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">– bitte wählen –</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.displayName} ({u.username})
              </option>
            ))}
          </select>

          {selectedUserId && <p className="note">Ort: bei {spielleiterName}</p>}

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="button neutral" onClick={onClose}>
              Abbrechen
            </button>
            <button type="submit" className="button primary" disabled={loading}>
              {loading ? "Erstelle..." : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
