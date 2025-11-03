// PollCreateModal.jsx
import { useState } from "react";
import API from "../../services/api";
import "../../styles/components/PollCreateModal.css";
import { useNavigate } from "react-router-dom";

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

  const handleSubmit = async () => {
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
      onSuccess?.(); // z.B. für erneutes Laden
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Fehler beim Erstellen.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal card">
        <h2>Umfrage erstellen</h2>

        {options.map((opt, idx) => (
          <div key={idx} className="poll-option-row">
            <div className="poll-input-group">
              <input
                type="date"
                value={opt.date}
                onChange={(e) => handleChange(idx, "date", e.target.value)}
                className="input-poll"
              />
              <input
                type="time"
                value={opt.time}
                onChange={(e) => handleChange(idx, "time", e.target.value)}
                className="input-poll"
              />
            </div>
            {options.length > 1 && (
              <span
                onClick={() => removeOption(idx)}
                className="remove-option"
                title="Entfernen"
              >
                ✕
              </span>
            )}
          </div>
        ))}

        <button onClick={addOption} className="button accent">
          + Termin hinzufügen
        </button>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button onClick={onClose} className="button neutral">
            Abbrechen
          </button>
          <button onClick={handleSubmit} className="button primary">
            Umfrage speichern
          </button>
        </div>
      </div>
    </div>
  );
}
