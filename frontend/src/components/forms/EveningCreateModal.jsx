import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarPlus, MapPinHouse } from "lucide-react";
import API from "../../services/api";
import Button from "../ui/Button";
import {
  YEAR_STATUSES,
  getYearStatus,
  getYearStatusMeta,
} from "../../utils/yearLifecycle";
import "../../styles/components/EveningCreateModal.css";

export default function EveningCreateModal({ onClose, onSuccess }) {
  const [years, setYears] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const yearSelectRef = useRef(null);

  useEffect(() => {
    let active = true;

    const fetchDropdownData = async () => {
      setDataLoading(true);
      setError("");
      try {
        const [yearsResponse, usersResponse] = await Promise.all([
          API.get("/years"),
          API.get("/users"),
        ]);
        if (!active) return;

        const nextYears = yearsResponse.data;
        const nextUsers = usersResponse.data.filter(
          (user) => user.active !== false,
        );
        const activeYear = nextYears.find(
          (year) => getYearStatus(year) === YEAR_STATUSES.ACTIVE,
        );

        setYears(nextYears);
        setUsers(nextUsers);
        setSelectedYear(activeYear ? String(activeYear.year) : "");
      } catch (requestError) {
        console.error("Auswahldaten konnten nicht geladen werden:", requestError);
        if (active) setError("Jahre und Benutzer konnten nicht geladen werden.");
      } finally {
        if (active) setDataLoading(false);
      }
    };

    fetchDropdownData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!dataLoading) yearSelectRef.current?.focus();
  }, [dataLoading]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, submitting]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!selectedYear || !selectedUserId) {
      setError("Bitte Spieljahr und Spielleiter auswählen.");
      return;
    }

    setSubmitting(true);
    try {
      await API.post("/evenings", {
        spieljahr: Number(selectedYear),
        spielleiterId: selectedUserId,
      });
      await onSuccess?.();
      onClose();
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Der Spieleabend konnte nicht erstellt werden.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedGameLeader = users.find(
    (user) => user._id === selectedUserId,
  );

  return createPortal(
    <div className="evening-create-overlay">
      <div
        aria-labelledby="evening-create-title"
        aria-describedby="evening-create-description"
        aria-modal="true"
        className="evening-create-modal"
        role="dialog"
      >
        <div className="evening-create-header">
          <span className="evening-create-header__icon" aria-hidden="true">
            <CalendarPlus size={23} />
          </span>
          <div>
            <h2 id="evening-create-title">Neuer Abend</h2>
            <p id="evening-create-description">
              Spieljahr und Standardort festlegen.
            </p>
          </div>
        </div>

        <form className="evening-create-form" onSubmit={handleSubmit}>
          <label className="evening-create-field">
            <span>Spieljahr</span>
            <select
              ref={yearSelectRef}
              disabled={dataLoading || submitting}
              onChange={(event) => setSelectedYear(event.target.value)}
              required
              value={selectedYear}
            >
              <option value="">Bitte wählen</option>
              {years.map((year) => {
                const status = getYearStatus(year);
                return (
                  <option
                    disabled={status === YEAR_STATUSES.CLOSED}
                    key={year._id}
                    value={year.year}
                  >
                    {year.year} ({getYearStatusMeta(year).optionLabel})
                  </option>
                );
              })}
            </select>
          </label>

          <label className="evening-create-field">
            <span>Spielleiter</span>
            <select
              disabled={dataLoading || submitting}
              onChange={(event) => setSelectedUserId(event.target.value)}
              required
              value={selectedUserId}
            >
              <option value="">Bitte wählen</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.displayName} ({user.username})
                </option>
              ))}
            </select>
          </label>

          {selectedGameLeader && (
            <div className="evening-create-location">
              <MapPinHouse size={18} aria-hidden="true" />
              <span>
                Ort <strong>Bei {selectedGameLeader.displayName}</strong>
              </span>
            </div>
          )}

          {error && (
            <p className="evening-create-error" role="alert">
              {error}
            </p>
          )}

          <div className="evening-create-actions">
            <Button
              disabled={submitting}
              onClick={onClose}
              variant="secondary"
            >
              Abbrechen
            </Button>
            <Button
              disabled={dataLoading || submitting}
              type="submit"
            >
              {submitting ? "Wird erstellt …" : "Abend erstellen"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
