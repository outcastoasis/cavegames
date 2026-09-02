import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import Button from "./Button";
import "../../styles/components/ConfirmDialog.css";

export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Bestätigen",
  busyLabel = "Wird entfernt...",
  cancelLabel = "Abbrechen",
  busy = false,
  danger = false,
  onCancel,
  onConfirm,
}) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    cancelButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="confirm-dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <div className="confirm-dialog-icon" aria-hidden="true">
          <AlertTriangle size={24} />
        </div>
        <div className="confirm-dialog-content">
          <h2 id="confirm-dialog-title">{title}</h2>
          <div id="confirm-dialog-description">{children}</div>
        </div>
        <div className="confirm-dialog-actions">
          <Button
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={busy}
            variant="secondary"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={busy}
            variant={danger ? "danger" : "primary"}
          >
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
