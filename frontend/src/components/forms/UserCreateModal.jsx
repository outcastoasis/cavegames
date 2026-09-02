import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserPlus } from "lucide-react";
import API from "../../services/api";
import Button from "../ui/Button";
import "../../styles/components/AdminUserModal.css";

export default function UserCreateModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    password: "",
    role: "spieler",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, submitting]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.displayName || !form.username || !form.password) {
      setError("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }
    if (form.password.length < 6) {
      setError("Das Passwort benötigt mindestens 6 Zeichen.");
      return;
    }

    setSubmitting(true);
    try {
      await API.post("/users", form);
      await onSuccess?.();
      onClose();
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Benutzer konnte nicht erstellt werden.",
      );
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-user-modal-overlay">
      <div
        aria-labelledby="user-create-title"
        aria-modal="true"
        className="admin-user-modal"
        role="dialog"
      >
        <ModalHeader
          icon={<UserPlus size={22} />}
          id="user-create-title"
          subtitle="Zugang und Rolle festlegen."
          title="Neuer Benutzer"
        />

        <form className="admin-user-modal-form" onSubmit={handleSubmit}>
          <Field label="Anzeigename">
            <input
              ref={firstInputRef}
              autoComplete="name"
              disabled={submitting}
              name="displayName"
              onChange={handleChange}
              placeholder="z. B. Jascha Bucher"
              required
              value={form.displayName}
            />
          </Field>
          <Field label="Benutzername">
            <input
              autoCapitalize="none"
              autoComplete="username"
              disabled={submitting}
              name="username"
              onChange={handleChange}
              placeholder="z. B. jascha"
              required
              value={form.username}
            />
          </Field>
          <Field label="Passwort">
            <input
              autoComplete="new-password"
              disabled={submitting}
              minLength={6}
              name="password"
              onChange={handleChange}
              placeholder="Mindestens 6 Zeichen"
              required
              type="password"
              value={form.password}
            />
          </Field>
          <Field label="Rolle">
            <select
              disabled={submitting}
              name="role"
              onChange={handleChange}
              value={form.role}
            >
              <option value="spieler">Spieler</option>
              <option value="admin">Admin</option>
            </select>
          </Field>

          <ModalError message={error} />
          <ModalActions
            busy={submitting}
            onClose={onClose}
            submitLabel="Erstellen"
            busyLabel="Wird erstellt …"
          />
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({ icon, id, subtitle, title }) {
  return (
    <div className="admin-user-modal-header">
      <span aria-hidden="true">{icon}</span>
      <div>
        <h2 id={id}>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

export function Field({ children, label }) {
  return (
    <label className="admin-user-modal-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ModalError({ message }) {
  return message ? (
    <p className="admin-user-modal-error" role="alert">
      {message}
    </p>
  ) : null;
}

export function ModalActions({ busy, busyLabel, onClose, submitLabel }) {
  return (
    <div className="admin-user-modal-actions">
      <Button disabled={busy} onClick={onClose} variant="secondary">
        Abbrechen
      </Button>
      <Button disabled={busy} type="submit">
        {busy ? busyLabel : submitLabel}
      </Button>
    </div>
  );
}
