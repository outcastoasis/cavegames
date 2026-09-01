import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  Download,
  Image as ImageIcon,
  Images,
  Trash2,
  X,
} from "lucide-react";
import API from "../services/api";
import ConfirmDialog from "./ui/ConfirmDialog";
import "../styles/components/EveningPhoto.css";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = "image/*,.heic,.heif,.avif";

export default function EveningPhotoSection({
  evening,
  canEdit,
  canDownload,
  onChanged,
}) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [pendingReplacement, setPendingReplacement] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const hasPhoto = Boolean(evening.groupPhotoUrl);

  if (!hasPhoto && !canEdit) return null;

  const resetFileInputs = () => {
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const uploadPhoto = async (file, confirmsReplacement = false) => {
    if (!file || uploading) return;

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (confirmsReplacement) {
        formData.append("confirmReplacement", "true");
      }

      await API.patch(`/evenings/${evening._id}/group-photo`, formData);
      setPendingReplacement(null);
      await onChanged();
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.error ||
          "Das Abendfoto konnte nicht hochgeladen werden.",
      );
    } finally {
      setUploading(false);
      resetFileInputs();
    }
  };

  const handleFileSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PHOTO_BYTES) {
      setError("Das Bild darf maximal 10 MB gross sein.");
      resetFileInputs();
      return;
    }

    if (hasPhoto) {
      setPendingReplacement(file);
      setError("");
      return;
    }

    uploadPhoto(file);
  };

  const deletePhoto = async () => {
    if (deleting) return;

    setDeleting(true);
    setError("");
    try {
      await API.delete(`/evenings/${evening._id}/group-photo`, {
        data: { confirmDeletion: true },
      });
      setShowDeleteConfirmation(false);
      await onChanged();
    } catch (deleteError) {
      setError(
        deleteError.response?.data?.error ||
          "Das Abendfoto konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const downloadOriginal = async () => {
    if (downloading) return;

    setDownloading(true);
    setError("");
    try {
      const response = await API.get(
        `/evenings/${evening._id}/group-photo/original`,
      );
      const link = document.createElement("a");
      link.href = response.data.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = response.data.filename || "Abendfoto";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (downloadError) {
      setError(
        downloadError.response?.data?.error ||
          "Das Original konnte nicht geöffnet werden.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="abenddetail-section evening-photo-section">
      <div className="abenddetail-section-header evening-photo-heading">
        <div className="evening-photo-title">
          <ImageIcon size={18} />
          <h2 className="abenddetail-section-title">Bild des Abends</h2>
        </div>
        {hasPhoto && canDownload && (
          <button
            type="button"
            className="button neutral small"
            onClick={downloadOriginal}
            disabled={downloading}
          >
            <Download size={16} />
            <span>{downloading ? "Wird geöffnet..." : "Original"}</span>
          </button>
        )}
      </div>

      {hasPhoto ? (
        <button
          type="button"
          className="evening-photo-preview-button"
          onClick={() => setShowPreview(true)}
          aria-label="Abendfoto vergrössern"
        >
          <img
            src={evening.groupPhotoUrl}
            srcSet={evening.groupPhotoSrcSet || undefined}
            sizes="(max-width: 600px) calc(100vw - 3rem), 850px"
            width={evening.groupPhotoWidth || undefined}
            height={evening.groupPhotoHeight || undefined}
            alt="Bild des Spieleabends"
            className="abenddetail-photo"
            loading="lazy"
            decoding="async"
          />
          <span className="evening-photo-preview-hint">Vergrössern</span>
        </button>
      ) : (
        <div className="evening-photo-empty">
          <ImageIcon size={30} />
          <p>Noch kein Bild für diesen Abend.</p>
        </div>
      )}

      {canEdit && (
        <div className="evening-photo-actions">
          <input
            ref={cameraInputRef}
            className="evening-photo-file-input"
            type="file"
            accept={ACCEPTED_PHOTO_TYPES}
            capture="environment"
            onChange={handleFileSelection}
            disabled={uploading || deleting}
          />
          <input
            ref={galleryInputRef}
            className="evening-photo-file-input"
            type="file"
            accept={ACCEPTED_PHOTO_TYPES}
            onChange={handleFileSelection}
            disabled={uploading || deleting}
          />
          <button
            type="button"
            className="button primary"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading || deleting}
          >
            <Camera size={17} />
            <span>Foto aufnehmen</span>
          </button>
          <button
            type="button"
            className="button neutral"
            onClick={() => galleryInputRef.current?.click()}
            disabled={uploading || deleting}
          >
            <Images size={17} />
            <span>{uploading ? "Wird hochgeladen..." : "Galerie wählen"}</span>
          </button>
          {hasPhoto && (
            <button
              type="button"
              className="button danger"
              onClick={() => setShowDeleteConfirmation(true)}
              disabled={uploading || deleting}
            >
              <Trash2 size={17} />
              <span>Löschen</span>
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="evening-photo-error" role="alert">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={Boolean(pendingReplacement)}
        title="Abendfoto ersetzen?"
        confirmLabel="Foto ersetzen"
        busyLabel="Wird hochgeladen..."
        busy={uploading}
        danger
        onCancel={() => {
          setPendingReplacement(null);
          resetFileInputs();
        }}
        onConfirm={() => uploadPhoto(pendingReplacement, true)}
      >
        <p>
          Das bisherige Foto wird durch „{pendingReplacement?.name}“ ersetzt.
          Eine Versionshistorie wird nicht geführt.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={showDeleteConfirmation}
        title="Abendfoto löschen?"
        confirmLabel="Endgültig löschen"
        busyLabel="Wird gelöscht..."
        busy={deleting}
        danger
        onCancel={() => setShowDeleteConfirmation(false)}
        onConfirm={deletePhoto}
      >
        <p>
          Das Original und alle optimierten Varianten werden entfernt. Diese
          Aktion kann nicht rückgängig gemacht werden.
        </p>
      </ConfirmDialog>

      {showPreview &&
        createPortal(
          <div
            className="evening-photo-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Abendfoto Vorschau"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowPreview(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setShowPreview(false);
            }}
          >
            <button
              type="button"
              className="evening-photo-lightbox-close"
              onClick={() => setShowPreview(false)}
              aria-label="Vorschau schliessen"
              autoFocus
            >
              <X size={24} />
            </button>
            <img
              src={evening.groupPhotoUrl}
              srcSet={evening.groupPhotoSrcSet || undefined}
              sizes="100vw"
              alt="Bild des Spieleabends in grosser Ansicht"
              decoding="async"
            />
          </div>,
          document.body,
        )}
    </section>
  );
}
