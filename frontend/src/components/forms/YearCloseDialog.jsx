import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Gamepad2,
  Info,
  Users,
} from "lucide-react";
import Button from "../ui/Button";
import { SkeletonBlock } from "../ui/Skeleton";
import "../../styles/components/YearCloseDialog.css";

export default function YearCloseDialog({
  busy,
  loading,
  onClose,
  onConfirm,
  open,
  preview,
  year,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div className="year-close-overlay">
      <div
        aria-labelledby="year-close-title"
        aria-modal="true"
        className="year-close-dialog"
        role="dialog"
      >
        <div className="year-close-dialog__header">
          <span aria-hidden="true">
            <CheckCircle2 size={23} />
          </span>
          <div>
            <h2 id="year-close-title">Jahr {year} abschliessen</h2>
            <p>Abende und Punkte vor dem Sperren prüfen.</p>
          </div>
        </div>

        {loading ? (
          <ClosePreviewSkeleton />
        ) : preview ? (
          <div className="year-close-dialog__content">
            <div className="year-close-summary">
              <SummaryItem
                icon={<CalendarDays size={18} />}
                label="Abende"
                value={preview.summary.eveningsTotal}
              />
              <SummaryItem
                icon={<AlertTriangle size={18} />}
                label="Blocker"
                tone={preview.summary.blockersTotal ? "error" : "success"}
                value={preview.summary.blockersTotal}
              />
              <SummaryItem
                icon={<Info size={18} />}
                label="Hinweise"
                tone={preview.summary.warningsTotal ? "warning" : "neutral"}
                value={preview.summary.warningsTotal}
              />
            </div>

            {preview.blockers.length > 0 && (
              <PreviewSection
                items={preview.blockers}
                title="Vor dem Abschluss"
                tone="error"
                valuesKey="issues"
              />
            )}

            {preview.warnings.length > 0 && (
              <PreviewSection
                items={preview.warnings}
                title="Hinweise"
                tone="warning"
                valuesKey="warnings"
              />
            )}

            <div
              className={`year-close-result year-close-result--${
                preview.canClose ? "success" : "error"
              }`}
              role="status"
            >
              {preview.canClose ? (
                <CheckCircle2 size={19} aria-hidden="true" />
              ) : (
                <AlertTriangle size={19} aria-hidden="true" />
              )}
              <span>
                {preview.canClose
                  ? "Bereit: Punkte werden neu berechnet und alle Abende gesperrt."
                  : "Der Abschluss ist noch nicht möglich."}
              </span>
            </div>
          </div>
        ) : (
          <p className="year-close-dialog__unavailable">
            Die Abschlussprüfung ist nicht verfügbar.
          </p>
        )}

        <div className="year-close-dialog__actions">
          <Button disabled={busy} onClick={onClose} variant="secondary">
            Abbrechen
          </Button>
          <Button
            disabled={busy || loading || !preview?.canClose}
            onClick={onConfirm}
          >
            {busy ? "Wird abgeschlossen …" : "Jahr abschliessen"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SummaryItem({ icon, label, tone = "neutral", value }) {
  return (
    <div className={`year-close-summary__item year-close-summary__item--${tone}`}>
      <span aria-hidden="true">{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function PreviewSection({ items, title, tone, valuesKey }) {
  return (
    <section className="year-close-preview-section">
      <h3>{title}</h3>
      <div className="year-close-preview-list">
        {items.map((item) => (
          <div
            className={`year-close-preview-item year-close-preview-item--${tone}`}
            key={`${tone}-${item.id}`}
          >
            <strong>{item.label}</strong>
            <span className="year-close-preview-item__facts">
              <span>
                <Users size={15} aria-hidden="true" />
                {item.participantCount}
              </span>
              <span>
                <Gamepad2 size={15} aria-hidden="true" />
                {item.gamesCount}
              </span>
            </span>
            <ul>
              {item[valuesKey].map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClosePreviewSkeleton() {
  return (
    <div className="year-close-skeleton" aria-label="Abschluss wird geprüft">
      <div>
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
      <SkeletonBlock className="year-close-skeleton__body" />
    </div>
  );
}
