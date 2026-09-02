import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Gamepad2, Pencil } from "lucide-react";
import API from "../../services/api";
import Button from "../ui/Button";
import "../../styles/components/AdminGameModal.css";

const emptyGame = {
  name: "",
  category: "",
  imageUrl: "",
  description: "",
};

export default function GameFormModal({ game, onClose, onSuccess }) {
  const isEditing = Boolean(game?._id);
  const [form, setForm] = useState(() => ({
    name: game?.name || "",
    category: game?.category || "",
    imageUrl: game?.imageUrl || "",
    description: game?.description || "",
  }));
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

    if (!form.name.trim()) {
      setError("Bitte einen Spielnamen eingeben.");
      return;
    }

    setSubmitting(true);
    const payload = {
      ...emptyGame,
      ...form,
      name: form.name.trim(),
      category: form.category.trim(),
      imageUrl: form.imageUrl.trim(),
      description: form.description.trim(),
    };

    try {
      if (isEditing) {
        await API.patch(`/games/${game._id}`, payload);
      } else {
        await API.post("/games", payload);
      }

      await onSuccess?.(
        isEditing ? "Spiel aktualisiert" : "Spiel erstellt",
      );
      onClose();
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          `Spiel konnte nicht ${isEditing ? "aktualisiert" : "erstellt"} werden.`,
      );
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-game-modal-overlay">
      <div
        aria-labelledby="admin-game-modal-title"
        aria-modal="true"
        className="admin-game-modal"
        role="dialog"
      >
        <div className="admin-game-modal__header">
          <span aria-hidden="true">
            {isEditing ? <Pencil size={21} /> : <Gamepad2 size={22} />}
          </span>
          <div>
            <h2 id="admin-game-modal-title">
              {isEditing ? "Spiel bearbeiten" : "Neues Spiel"}
            </h2>
            <p>Die wichtigsten Angaben kompakt erfassen.</p>
          </div>
        </div>

        <form className="admin-game-modal__form" onSubmit={handleSubmit}>
          <GameField label="Name">
            <input
              ref={firstInputRef}
              autoComplete="off"
              disabled={submitting}
              name="name"
              onChange={handleChange}
              placeholder="z. B. Catan"
              required
              value={form.name}
            />
          </GameField>

          <GameField label="Kategorie">
            <input
              autoComplete="off"
              disabled={submitting}
              name="category"
              onChange={handleChange}
              placeholder="z. B. Strategie"
              value={form.category}
            />
          </GameField>

          <GameField label="Bild-URL">
            <input
              autoCapitalize="none"
              autoComplete="url"
              disabled={submitting}
              inputMode="url"
              name="imageUrl"
              onChange={handleChange}
              placeholder="https://…"
              type="url"
              value={form.imageUrl}
            />
          </GameField>

          <GameField label="Beschreibung">
            <textarea
              disabled={submitting}
              name="description"
              onChange={handleChange}
              placeholder="Kurze Beschreibung oder Hinweise"
              rows={3}
              value={form.description}
            />
          </GameField>

          {error && (
            <p className="admin-game-modal__error" role="alert">
              {error}
            </p>
          )}

          <div className="admin-game-modal__actions">
            <Button disabled={submitting} onClick={onClose} variant="secondary">
              Abbrechen
            </Button>
            <Button disabled={submitting} type="submit">
              {submitting
                ? isEditing
                  ? "Wird gespeichert …"
                  : "Wird erstellt …"
                : isEditing
                  ? "Speichern"
                  : "Erstellen"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function GameField({ children, label }) {
  return (
    <label className="admin-game-modal__field">
      <span>{label}</span>
      {children}
    </label>
  );
}
