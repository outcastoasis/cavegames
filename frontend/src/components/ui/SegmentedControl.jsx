import "../../styles/components/SegmentedControl.css";

export default function SegmentedControl({
  ariaLabel,
  className = "",
  disabled = false,
  onChange,
  options,
  value,
}) {
  return (
    <div
      className={`ui-segmented-control ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            type="button"
            key={option.value}
            className={`ui-segmented-control__option ${
              selected ? "is-selected" : ""
            } ${option.tone ? `ui-segmented-control__option--${option.tone}` : ""}`.trim()}
            onClick={() => !selected && onChange(option.value)}
            aria-pressed={selected}
            disabled={disabled || option.disabled}
          >
            {option.icon && (
              <span className="ui-segmented-control__icon" aria-hidden="true">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
