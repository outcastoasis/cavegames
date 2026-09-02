import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil } from "lucide-react";
import API from "../../services/api";
import Switch from "../ui/Switch";
import {
  Field,
  ModalActions,
  ModalError,
  ModalHeader,
} from "./UserCreateModal";
import "../../styles/components/AdminUserModal.css";

export default function UserEditModal({ user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    role: user?.role || "spieler",
    active: user?.active ?? true,
    password: "",
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

    if (!form.displayName.trim()) {
      setError("Bitte einen Anzeigenamen eingeben.");
      return;
    }
    if (form.password && form.password.length < 6) {
      setError("Das neue Passwort benötigt mindestens 6 Zeichen.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        displayName: form.displayName,
        role: form.role,
        active: form.active,
      };
      if (form.password) payload.password = form.password;

      await API.patch(`/users/${user._id}`, payload);
      await onSuccess?.();
      onClose();
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Benutzer konnte nicht gespeichert werden.",
      );
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-user-modal-overlay">
      <div
        aria-labelledby="user-edit-title"
        aria-modal="true"
        className="admin-user-modal"
        role="dialog"
      >
        <ModalHeader
          icon={<Pencil size={21} />}
          id="user-edit-title"
          subtitle={`@${user.username}`}
          title="Benutzer bearbeiten"
        />

        <form className="admin-user-modal-form" onSubmit={handleSubmit}>
          <Field label="Anzeigename">
            <input
              ref={firstInputRef}
              autoComplete="name"
              disabled={submitting}
              name="displayName"
              onChange={handleChange}
              required
              value={form.displayName}
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
          <Field label="Neues Passwort (optional)">
            <input
              autoComplete="new-password"
              disabled={submitting}
              minLength={6}
              name="password"
              onChange={handleChange}
              placeholder="Leer lassen, um es beizubehalten"
              type="password"
              value={form.password}
            />
          </Field>

          <div className="admin-user-modal-switch">
            <Switch
              checked={form.active}
              description="Deaktivierte Konten können sich nicht anmelden."
              disabled={submitting}
              label={form.active ? "Konto aktiv" : "Konto deaktiviert"}
              name="active"
              onChange={(active) =>
                setForm((current) => ({ ...current, active }))
              }
            />
          </div>

          <ModalError message={error} />
          <ModalActions
            busy={submitting}
            busyLabel="Wird gespeichert …"
            onClose={onClose}
            submitLabel="Speichern"
          />
        </form>
      </div>
    </div>,
    document.body,
  );
}
