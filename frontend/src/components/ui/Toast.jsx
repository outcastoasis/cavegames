// frontend/src/components/ui/Toast.jsx

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "../../styles/components/Toast.css";

export default function Toast({ message, onClose }) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current?.(), 2500);
    return () => clearTimeout(timer);
  }, [message]);

  return createPortal(
    <div
      className="toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>,
    document.body,
  );
}
