import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarCheck2, Pencil } from "lucide-react";
import API from "../../services/api";
import {
  swissDateTimeInputToIso,
  toSwissDateTimeInputValue,
} from "../../utils/swissDateTime";
import Button from "../ui/Button";
import {
  YEAR_STATUSES,
  getYearStatus,
  getYearStatusMeta,
} from "../../utils/yearLifecycle";
import "../../styles/components/YearEveningModal.css";

export default function YearEveningModal({
  evening,
  mode = "edit",
  onClose,
  onSuccess,
  users = [],
  years = [],
}) {
  const isFixing = mode === "fix";
  const [form, setForm] = useState(() => ({
    spieljahr: String(evening.spieljahr || ""),
    spielleiterId: evening.spielleiterRef?._id || "",
    location: evening.location || "",
    date: toSwissDateTimeInputValue(evening.date),
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, submitting]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (isFixing && !form.date) {
      setError("Bitte Datum und Uhrzeit wählen.");
      return;
    }
    if (!isFixing && (!form.spieljahr || !form.spielleiterId)) {
      setError("Spieljahr und Spielleiter sind erforderlich.");
      return;
    }

    setSubmitting(true);
    try {
      if (isFixing) {
        await API.patch(`/evenings/${evening._id}/status`, {
          status: "fixiert",
          date: swissDateTimeInputToIso(form.date),
        });
      } else {
        await API.patch(`/evenings/${evening._id}`, {
          spieljahr: Number(form.spieljahr),
          spielleiterId: form.spielleiterId,
          location: form.location.trim() || null,
          date: form.date ? swissDateTimeInputToIso(form.date) : null,
        });
      }

      await onSuccess?.(
        isFixing ? "Termin fixiert" : "Abend aktualisiert",
      );
      onClose();
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          `Abend konnte nicht ${isFixing ? "fixiert" : "gespeichert"} werden.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="year-evening-modal-overlay">
      <div
        aria-labelledby="year-evening-modal-title"
        aria-modal="true"
        className="year-evening-modal"
        role="dialog"
      >
        <div className="year-evening-modal__header">
          <span aria-hidden="true">
            {isFixing ? <CalendarCheck2 size={22} /> : <Pencil size={21} />}
          </span>
          <div>
            <h2 id="year-evening-modal-title">
              {isFixing ? "Termin fixieren" : "Abend bearbeiten"}
            </h2>
            <p>
              {isFixing
                ? "Datum und Uhrzeit festlegen."
                : "Zuordnung und Termin anpassen."}
            </p>
          </div>
        </div>

        <form className="year-evening-modal__form" onSubmit={handleSubmit}>
          {isFixing ? (
            <Field label="Datum und Uhrzeit">
              <input
                ref={firstFieldRef}
                disabled={submitting}
                onChange={(event) => updateField("date", event.target.value)}
                required
                step="900"
                type="datetime-local"
                value={form.date}
              />
            </Field>
          ) : (
            <>
              <Field label="Spieljahr">
                <select
                  ref={firstFieldRef}
                  disabled={submitting}
                  onChange={(event) =>
                    updateField("spieljahr", event.target.value)
                  }
                  required
                  value={form.spieljahr}
                >
                  {years.map((year) => {
                    const status = getYearStatus(year);
                    const cannotMoveResultsToPlanned =
                      status === YEAR_STATUSES.PLANNED &&
                      ((evening.games?.length || 0) > 0 ||
                        ["abgeschlossen", "gesperrt"].includes(evening.status));
                    return (
                      <option
                        disabled={
                          status === YEAR_STATUSES.CLOSED ||
                          cannotMoveResultsToPlanned
                        }
                        key={year._id}
                        value={year.year}
                      >
                        {year.year} ({getYearStatusMeta(year).optionLabel})
                      </option>
                    );
                  })}
                </select>
              </Field>

              <Field label="Spielleiter">
                <select
                  disabled={submitting}
                  onChange={(event) =>
                    updateField("spielleiterId", event.target.value)
                  }
                  required
                  value={form.spielleiterId}
                >
                  <option value="">Bitte wählen</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.displayName} ({user.username})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Ort">
                <input
                  disabled={submitting}
                  maxLength={120}
                  onChange={(event) =>
                    updateField("location", event.target.value)
                  }
                  placeholder="z. B. Bei Markus"
                  value={form.location}
                />
              </Field>

              <Field label="Datum und Uhrzeit">
                <input
                  disabled={submitting}
                  onChange={(event) => updateField("date", event.target.value)}
                  step="900"
                  type="datetime-local"
                  value={form.date}
                />
              </Field>
            </>
          )}

          {error && (
            <p className="year-evening-modal__error" role="alert">
              {error}
            </p>
          )}

          <div className="year-evening-modal__actions">
            <Button disabled={submitting} onClick={onClose} variant="secondary">
              Abbrechen
            </Button>
            <Button disabled={submitting} type="submit">
              {submitting
                ? isFixing
                  ? "Wird fixiert …"
                  : "Wird gespeichert …"
                : isFixing
                  ? "Fixieren"
                  : "Speichern"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function Field({ children, label }) {
  return (
    <label className="year-evening-modal__field">
      <span>{label}</span>
      {children}
    </label>
  );
}
