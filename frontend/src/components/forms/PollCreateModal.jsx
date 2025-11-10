// src/components/forms/PollCreateModal.jsx
import { useState } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import "../../styles/components/PollCreateModal.css";

export default function PollCreateModal({ onClose, eveningId, onSuccess }) {
  const [options, setOptions] = useState([{ date: "", time: "" }]);
  const [error, setError] = useState("");

  const handleChange = (index, field, value) => {
    const updated = [...options];
    updated[index][field] = value;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length >= 5) return;
    setOptions([...options, { date: "", time: "" }]);
  };

  const removeOption = (index) => {
    const updated = [...options];
    updated.splice(index, 1);
    setOptions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validOptions = options.filter((opt) => opt.date && opt.time);
    if (validOptions.length < 2) {
      return setError("Mindestens zwei gültige Terminvorschläge nötig.");
    }

    const payload = {
      eveningId,
      options: validOptions.map((opt) => ({
        date: new Date(`${opt.date}T${opt.time}`).toISOString(),
      })),
    };

    try {
      await API.post("/polls", payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Fehler beim Erstellen.");
    }
  };

  return createPortal(
    <div className="poll-modal-overlay">
      <div className="poll-modal">
        <h2>Umfrage erstellen</h2>
        <form onSubmit={handleSubmit} className="poll-modal-form">
          {options.map((opt, idx) => (
            <div key={idx} className="poll-option-row">
              <div className="poll-input-group">
                <input
                  type="date"
                  value={opt.date}
                  onChange={(e) => handleChange(idx, "date", e.target.value)}
                  className="input"
                />
                <input
                  type="time"
                  value={opt.time}
                  onChange={(e) => handleChange(idx, "time", e.target.value)}
                  className="input"
                />
                {options.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="poll-remove-btn"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={addOption} className="poll-add-btn">
            + Termin hinzufügen
          </button>

          {error && <p className="poll-error-text">{error}</p>}

          <div className="poll-modal-actions">
            <button type="button" className="button neutral" onClick={onClose}>
              Abbrechen
            </button>
            <button type="submit" className="button primary">
              Umfrage speichern
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
