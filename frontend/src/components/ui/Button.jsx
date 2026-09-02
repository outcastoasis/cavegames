import "../../styles/components/Button.css";

export default function Button({
  children,
  className = "",
  disabled = false,
  fullWidth = false,
  iconOnly = false,
  leadingIcon = null,
  size = "md",
  trailingIcon = null,
  type = "button",
  variant = "primary",
  ...props
}) {
  const classes = [
    "ui-button",
    `ui-button--${variant}`,
    `ui-button--${size}`,
    fullWidth ? "ui-button--full" : "",
    iconOnly ? "ui-button--icon-only" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      type={type}
      className={classes}
      disabled={disabled}
    >
      {leadingIcon && (
        <span className="ui-button__icon" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      {!iconOnly && <span className="ui-button__label">{children}</span>}
      {iconOnly && children}
      {trailingIcon && (
        <span className="ui-button__icon" aria-hidden="true">
          {trailingIcon}
        </span>
      )}
    </button>
  );
}
