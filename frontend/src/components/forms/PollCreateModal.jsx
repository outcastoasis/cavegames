import { useState } from "react";
import { createPortal } from "react-dom";
import { CalendarPlus, Plus, Trash2 } from "lucide-react";
import API from "../../services/api";
import Button from "../ui/Button";
import {
  getSwissTodayInputValue,
  swissDateTimeInputToIso,
} from "../../utils/swissDateTime";
import "../../styles/components/PollCreateModal.css";

const padDateTimePart = (value) => String(value).padStart(2, "0");

const roundDateTimeToQuarterHour = (value) => {
  if (!value) return "";

  const [datePart, timePart] = value.split("T");
  const [year, month, day] = (datePart || "").split("-").map(Number);
  const [hours, minutes] = (timePart || "").split(":").map(Number);
  if ([year, month, day, hours, minutes].some(Number.isNaN)) return value;

  const roundedMinutes = Math.round(minutes / 15) * 15;
  const roundedDate = new Date(year, month - 1, day, hours, roundedMinutes);

  return `${roundedDate.getFullYear()}-${padDateTimePart(
    roundedDate.getMonth() + 1,
  )}-${padDateTimePart(roundedDate.getDate())}T${padDateTimePart(
    roundedDate.getHours(),
  )}:${padDateTimePart(roundedDate.getMinutes())}`;
};

export default function PollCreateModal({ onClose, eveningId, onSuccess }) {
  const [options, setOptions] = useState([{ value: "" }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (index, value) => {
    setOptions((currentOptions) =>
      currentOptions.map((option, optionIndex) =>
        optionIndex === index ? { ...option, value } : option,
      ),
    );
  };

  const addOption = () => {
    if (options.length >= 5) return;
    setOptions((currentOptions) => [
      ...currentOptions,
      { value: "" },
    ]);
  };

  const removeOption = (index) => {
    setOptions((currentOptions) =>
      currentOptions.filter((_, optionIndex) => optionIndex !== index),
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validOptions = options.filter((option) => option.value);
    if (validOptions.length < 2) {
      setError("Mindestens zwei gültige Terminvorschläge nötig.");
      return;
    }

    const payload = {
      eveningId,
      options: validOptions.map((option) => ({
        date: swissDateTimeInputToIso(
          roundDateTimeToQuarterHour(option.value),
        ),
      })),
    };

    setSubmitting(true);
    try {
      await API.post("/polls", payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Fehler beim Erstellen.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="poll-modal-overlay">
      <div
        aria-labelledby="poll-modal-title"
        aria-modal="true"
        className="poll-modal"
        role="dialog"
      >
        <div className="poll-modal__header">
          <span className="poll-modal__icon" aria-hidden="true">
            <CalendarPlus size={23} />
          </span>
          <div>
            <h2 id="poll-modal-title">Umfrage erstellen</h2>
            <p>Zwei bis fünf Terminvorschläge.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="poll-modal-form">
          <div className="poll-modal-options">
            {options.map((option, index) => (
              <div key={index} className="poll-option-row">
                <label className="poll-modal-field poll-modal-field--datetime">
                  <span>Datum und Uhrzeit</span>
                  <input
                    aria-label={`Datum und Uhrzeit für Vorschlag ${index + 1}`}
                    className="poll-modal-input"
                    disabled={submitting}
                    min={`${getSwissTodayInputValue()}T00:00`}
                    onBlur={(event) =>
                      handleChange(
                        index,
                        roundDateTimeToQuarterHour(event.target.value),
                      )
                    }
                    onChange={(event) =>
                      handleChange(index, event.target.value)
                    }
                    step="900"
                    type="datetime-local"
                    value={option.value}
                  />
                </label>

                {options.length > 1 && (
                  <Button
                    aria-label={`Terminvorschlag ${index + 1} entfernen`}
                    className="poll-option-row__remove"
                    disabled={submitting}
                    iconOnly
                    onClick={() => removeOption(index)}
                    size="sm"
                    title="Terminvorschlag entfernen"
                    variant="danger-ghost"
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            className="poll-modal-add"
            disabled={submitting || options.length >= 5}
            leadingIcon={<Plus size={18} />}
            onClick={addOption}
            size="sm"
            variant="secondary"
          >
            Termin hinzufügen
          </Button>

          {error && (
            <p className="poll-error-text" role="alert">
              {error}
            </p>
          )}

          <div className="poll-modal-actions">
            <Button
              disabled={submitting}
              onClick={onClose}
              variant="secondary"
            >
              Abbrechen
            </Button>
            <Button disabled={submitting} type="submit">
              {submitting ? "Wird gespeichert..." : "Umfrage speichern"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
