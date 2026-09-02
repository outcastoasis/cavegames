import { useId } from "react";
import "../../styles/components/Switch.css";

export default function Switch({
  checked,
  className = "",
  description,
  disabled = false,
  label,
  name,
  onChange,
}) {
  const descriptionId = useId();

  return (
    <label className={`ui-switch ${className}`.trim()}>
      <span className="ui-switch__copy">
        <span className="ui-switch__label">{label}</span>
        {description && (
          <span className="ui-switch__description" id={descriptionId}>
            {description}
          </span>
        )}
      </span>
      <input
        className="ui-switch__input"
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
      />
      <span className="ui-switch__control" aria-hidden="true">
        <span className="ui-switch__thumb" />
      </span>
    </label>
  );
}
