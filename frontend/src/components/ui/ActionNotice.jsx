import { ChevronRight } from "lucide-react";
import "../../styles/components/ActionNotice.css";

export default function ActionNotice({
  children,
  className = "",
  icon,
  onClick,
  showChevron = Boolean(onClick),
  title,
  tone = "primary",
  ...props
}) {
  const Component = onClick ? "button" : "div";
  const interactiveProps = onClick ? { type: "button", onClick } : {};

  return (
    <Component
      {...props}
      {...interactiveProps}
      className={`ui-action-notice ui-action-notice--${tone} ${
        onClick ? "ui-action-notice--interactive" : ""
      } ${!icon ? "ui-action-notice--without-icon" : ""} ${className}`.trim()}
    >
      {icon && (
        <span className="ui-action-notice__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="ui-action-notice__copy">
        <strong>{title}</strong>
        {children && <span>{children}</span>}
      </span>
      {showChevron && (
        <ChevronRight
          className="ui-action-notice__chevron"
          size={21}
          aria-hidden="true"
        />
      )}
    </Component>
  );
}
