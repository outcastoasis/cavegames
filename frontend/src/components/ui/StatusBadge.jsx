import "../../styles/components/StatusBadge.css";

const statusConfig = {
  offen: { label: "Offen", tone: "warning" },
  fixiert: { label: "Bestätigt", tone: "success" },
  abgeschlossen: { label: "Abgeschlossen", tone: "primary" },
  gesperrt: { label: "Gesperrt", tone: "neutral" },
};

export default function StatusBadge({
  className = "",
  label,
  showDot = true,
  status,
  tone,
}) {
  const config = statusConfig[status] || {
    label: status || "Unbekannt",
    tone: "neutral",
  };
  const resolvedTone = tone || config.tone;

  return (
    <span
      className={`ui-status-badge ui-status-badge--${resolvedTone} ${className}`.trim()}
    >
      {showDot && <span className="ui-status-badge__dot" aria-hidden="true" />}
      {label || config.label}
    </span>
  );
}
