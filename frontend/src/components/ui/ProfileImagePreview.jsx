import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "../../styles/components/ProfileImagePreview.css";

export default function ProfileImagePreview({
  className = "",
  fallbackSrc,
  name = "Profil",
  src,
}) {
  const triggerRef = useRef(null);
  const [displaySrc, setDisplaySrc] = useState(src || fallbackSrc || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDisplaySrc(src || fallbackSrc || "");
  }, [fallbackSrc, src]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      if (triggerElement?.isConnected) triggerElement.focus();
    };
  }, [open]);

  if (!displaySrc) return null;

  const label = name ? `${name}: Profilbild` : "Profilbild";

  const handleImageError = () => {
    if (fallbackSrc && displaySrc !== fallbackSrc) {
      setDisplaySrc(fallbackSrc);
      return;
    }

    setOpen(false);
    setDisplaySrc("");
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`profile-image-preview-trigger ${className}`.trim()}
        aria-label={`${label} vergrössern`}
        title="Profilbild vergrössern"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <img
          src={displaySrc}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
      </button>

      {open &&
        createPortal(
          <div
            className="profile-image-preview-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`${label} in grosser Ansicht`}
            onClick={(event) => {
              event.stopPropagation();
              if (event.target === event.currentTarget) setOpen(false);
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="profile-image-preview-close"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
              }}
              aria-label="Bildvorschau schliessen"
              autoFocus
            >
              <X size={24} aria-hidden="true" />
            </button>
            <figure className="profile-image-preview-figure">
              <img
                src={displaySrc}
                alt={`${label} in grosser Ansicht`}
                referrerPolicy="no-referrer"
                onError={handleImageError}
              />
              {name && <figcaption>{name}</figcaption>}
            </figure>
          </div>,
          document.body,
        )}
    </>
  );
}
