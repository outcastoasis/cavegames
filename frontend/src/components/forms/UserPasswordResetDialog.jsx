import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound } from "lucide-react";
import API from "../../services/api";
import {
  Field,
  ModalActions,
  ModalError,
  ModalHeader,
} from "./UserCreateModal";
import "../../styles/components/AdminUserModal.css";

export default function UserPasswordResetDialog({ user, onClose, onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, submitting]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Das neue Passwort benötigt mindestens 6 Zeichen.");
      return;
    }

    setSubmitting(true);
    try {
      await API.patch(`/users/${user._id}`, { password });
      onSuccess("Passwort aktualisiert");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Passwort konnte nicht aktualisiert werden.",
      );
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-user-modal-overlay">
      <div
        aria-labelledby="user-password-title"
        aria-modal="true"
        className="admin-user-modal admin-user-modal--compact"
        role="dialog"
      >
        <ModalHeader
          icon={<KeyRound size={21} />}
          id="user-password-title"
          subtitle={`Neuer Zugang für ${user.displayName}.`}
          title="Passwort ändern"
        />

        <form className="admin-user-modal-form" onSubmit={handleSubmit}>
          <Field label="Neues Passwort">
            <input
              ref={inputRef}
              autoComplete="new-password"
              disabled={submitting}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mindestens 6 Zeichen"
              required
              type="password"
              value={password}
            />
          </Field>
          <ModalError message={error} />
          <ModalActions
            busy={submitting}
            busyLabel="Wird gespeichert …"
            onClose={onClose}
            submitLabel="Passwort speichern"
          />
        </form>
      </div>
    </div>,
    document.body,
  );
}
