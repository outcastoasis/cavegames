import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate, useOutletContext } from "react-router-dom";
import {
  Gamepad2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import GameFormModal from "../components/forms/GameFormModal";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { SkeletonBlock } from "../components/ui/Skeleton";
import StatusBadge from "../components/ui/StatusBadge";
import Toast from "../components/ui/Toast";
import { useAuth } from "../context/authState";
import { useTestMode } from "../context/testMode";
import API from "../services/api";
import "../styles/pages/AdminGames.css";

function GameImage({ imageUrl, name, onPreview }) {
  if (!imageUrl) {
    return (
      <span className="admin-game-image" aria-hidden="true">
        <Gamepad2 size={23} />
      </span>
    );
  }

  return (
    <button
      aria-label={`Bild von ${name} vergrössern`}
      className="admin-game-image admin-game-image--interactive"
      onClick={onPreview}
      type="button"
    >
      <Gamepad2 size={23} aria-hidden="true" />
      <img
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        src={imageUrl}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </button>
  );
}

export default function AdminGames() {
  const { user } = useAuth();
  const { testMode } = useTestMode();
  const { setTitle } = useOutletContext();
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formGame, setFormGame] = useState(undefined);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [previewGame, setPreviewGame] = useState(null);
  const [toast, setToast] = useState("");

  const fetchGames = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    setLoadError("");

    try {
      const response = await API.get("/games");
      setGames(response.data);
    } catch (error) {
      console.error("Fehler beim Laden der Spiele:", error);
      setLoadError(
        error.response?.data?.error || "Spiele konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTitle("Spieleverwaltung");
    fetchGames();
  }, [fetchGames, setTitle]);

  const filteredGames = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return games;
    return games.filter((game) =>
      `${game.name} ${game.category || ""} ${game.description || ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [games, search]);

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);

    try {
      await API.delete(`/games/${deleteTarget._id}`);
      setGames((current) =>
        current.filter((game) => game._id !== deleteTarget._id),
      );
      setDeleteTarget(null);
      setToast("Spiel gelöscht");
    } catch (error) {
      setToast(
        error.response?.data?.error || "Spiel konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-shell admin-games-page">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="admin-games-toolbar">
        <div className="admin-games-count">
          <Gamepad2 size={19} aria-hidden="true" />
          <span>
            {filteredGames.length} {filteredGames.length === 1 ? "Spiel" : "Spiele"}
          </span>
        </div>
        <Button
          leadingIcon={<Plus size={18} />}
          onClick={() => setFormGame(null)}
          size="sm"
        >
          Neues Spiel
        </Button>
      </div>

      <Card as="section" className="admin-games-controls" padding="md">
        <label className="admin-games-search">
          <span className="admin-games-visually-hidden">Spiele suchen</span>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Name, Kategorie oder Beschreibung"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </Card>

      {loading ? (
        <GameListSkeleton />
      ) : loadError ? (
        <Card className="admin-games-state" variant="muted">
          <RefreshCw size={23} aria-hidden="true" />
          <h2>Laden fehlgeschlagen</h2>
          <p>{loadError}</p>
          <Button
            leadingIcon={<RefreshCw size={17} />}
            onClick={() => fetchGames({ showLoader: true })}
            size="sm"
            variant="secondary"
          >
            Erneut laden
          </Button>
        </Card>
      ) : filteredGames.length === 0 ? (
        <Card className="admin-games-state" variant="muted">
          <Gamepad2 size={23} aria-hidden="true" />
          <h2>Keine Spiele gefunden</h2>
          <p>Suchbegriff anpassen oder ein neues Spiel erfassen.</p>
        </Card>
      ) : (
        <div className="admin-games-list">
          {filteredGames.map((game) => {
            const isLiveReadonly = testMode && !game.isTestData;

            return (
              <Card
                as="article"
                className="admin-game-card"
                key={game._id}
                padding="md"
              >
                <div className="admin-game-card__identity">
                  <GameImage
                    imageUrl={game.imageUrl}
                    name={game.name}
                    onPreview={() => setPreviewGame(game)}
                  />
                  <div className="admin-game-card__copy">
                    <strong>{game.name}</strong>
                    <span>{game.category || "Ohne Kategorie"}</span>
                  </div>
                </div>

                {(isLiveReadonly || game.isTestData) && (
                  <div className="admin-game-card__badges">
                    {isLiveReadonly && (
                      <StatusBadge label="Live-Katalog" tone="neutral" />
                    )}
                    {game.isTestData && (
                      <StatusBadge label="Test" tone="warning" />
                    )}
                  </div>
                )}

                {game.description && (
                  <p className="admin-game-card__description">
                    {game.description}
                  </p>
                )}

                <div className="admin-game-card__actions">
                  <Button
                    aria-label={`${game.name} bearbeiten`}
                    disabled={isLiveReadonly}
                    iconOnly
                    onClick={() => setFormGame(game)}
                    size="sm"
                    title={
                      isLiveReadonly
                        ? "Live-Spiele sind im Testmodus schreibgeschützt"
                        : "Bearbeiten"
                    }
                    variant="secondary"
                  >
                    <Pencil size={18} />
                  </Button>
                  <Button
                    aria-label={`${game.name} löschen`}
                    disabled={isLiveReadonly}
                    iconOnly
                    onClick={() => setDeleteTarget(game)}
                    size="sm"
                    title={
                      isLiveReadonly
                        ? "Live-Spiele sind im Testmodus schreibgeschützt"
                        : "Löschen"
                    }
                    variant="danger-ghost"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {formGame !== undefined && (
        <GameFormModal
          game={formGame}
          onClose={() => setFormGame(undefined)}
          onSuccess={async (message) => {
            await fetchGames();
            setToast(message);
          }}
        />
      )}

      <ConfirmDialog
        busy={deleting}
        busyLabel="Wird gelöscht …"
        confirmLabel="Löschen"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        open={Boolean(deleteTarget)}
        title="Spiel löschen?"
      >
        <p>
          „{deleteTarget?.name}“ wird dauerhaft aus dem Spielekatalog gelöscht.
        </p>
      </ConfirmDialog>

      {previewGame && (
        <GameImagePreview
          game={previewGame}
          onClose={() => setPreviewGame(null)}
        />
      )}
    </div>
  );
}

function GameImagePreview({ game, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="admin-game-preview-overlay">
      <div
        aria-label={`Bildvorschau von ${game.name}`}
        aria-modal="true"
        className="admin-game-preview"
        role="dialog"
      >
        <Button
          aria-label="Bildvorschau schliessen"
          className="admin-game-preview__close"
          iconOnly
          onClick={onClose}
          size="sm"
          variant="secondary"
        >
          <X size={18} />
        </Button>
        <img src={game.imageUrl} alt={game.name ? `${game.name} Bild` : ""} />
        <strong>{game.name}</strong>
      </div>
    </div>,
    document.body,
  );
}

function GameListSkeleton() {
  return (
    <div className="admin-games-list" aria-label="Spiele werden geladen">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card className="admin-game-skeleton" key={index} padding="md">
          <SkeletonBlock className="admin-game-skeleton__image" />
          <div>
            <SkeletonBlock className="admin-game-skeleton__name" />
            <SkeletonBlock className="admin-game-skeleton__meta" />
          </div>
          <SkeletonBlock className="admin-game-skeleton__actions" />
        </Card>
      ))}
    </div>
  );
}
