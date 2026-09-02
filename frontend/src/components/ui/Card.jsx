import { createElement } from "react";
import "../../styles/components/Card.css";

export default function Card({
  as: Component = "div",
  children,
  className = "",
  interactive = false,
  padding = "md",
  variant = "default",
  ...props
}) {
  const classes = [
    "ui-card",
    `ui-card--${variant}`,
    `ui-card--padding-${padding}`,
    interactive ? "ui-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return createElement(Component, { ...props, className: classes }, children);
}
