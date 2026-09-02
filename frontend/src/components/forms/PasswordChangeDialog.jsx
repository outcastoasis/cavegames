import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound } from "lucide-react";
import API from "../../services/api";
import Button from "../ui/Button";
import "../../styles/components/Modal.css";
import "../../styles/components/PasswordChangeDialog.css";

export default function PasswordChangeDialog({ onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const currentPasswordRef = useRef(null);

  useEffect(() => {
    currentPasswordRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmation) {
      setError("Bitte fülle alle Passwortfelder aus.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }

    setBusy(true);
    try {
      const response = await API.patch("/users/me/password", {
        currentPassword,
        newPassword,
      });
      onSuccess(response.data.message);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Passwort konnte nicht geändert werden.",
      );
      setBusy(false);
    }
  };

  return createPortal(
    <div className="modal-overlay password-dialog-overlay">
      <div
        className="modal password-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-dialog-title"
      >
        <div className="password-dialog-heading">
          <span className="password-dialog-icon" aria-hidden="true">
            <KeyRound size={22} />
          </span>
          <div>
            <h2 id="password-dialog-title">Passwort ändern</h2>
            <p>Danach meldest du dich mit dem neuen Passwort wieder an.</p>
          </div>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label htmlFor="current-password">Aktuelles Passwort</label>
          <input
            ref={currentPasswordRef}
            id="current-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={busy}
          />

          <label htmlFor="new-password">Neues Passwort</label>
          <input
            id="new-password"
            className="input"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={busy}
          />

          <label htmlFor="confirm-password">Neues Passwort bestätigen</label>
          <input
            id="confirm-password"
            className="input"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={busy}
          />

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <Button
              onClick={onClose}
              disabled={busy}
              variant="secondary"
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Wird geändert..." : "Passwort ändern"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
