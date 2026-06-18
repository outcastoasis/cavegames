import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate, useOutletContext } from "react-router-dom";
import { Gamepad2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTestMode } from "../context/TestModeContext";
import API from "../services/api";
import Toast from "../components/ui/Toast";
import "../styles/pages/AdminGames.css";

const emptyForm = {
  name: "",
  category: "",
  description: "",
  imageUrl: "",
};

function GameImage({ imageUrl, name, className = "", onPreview }) {
  const hasImage = Boolean(imageUrl);
  const Component = hasImage ? "button" : "span";

  return (
    <Component
      className={`game-image ${hasImage ? "game-image--clickable" : ""} ${className}`}
      type={hasImage ? "button" : undefined}
      aria-label={hasImage ? `${name} Bild vergrössern` : undefined}
      aria-hidden={!hasImage}
      onClick={hasImage ? onPreview : undefined}
    >
      <Gamepad2 size={22} />
      {hasImage && (
        <img
          src={imageUrl}
          alt={name ? `${name} Bild` : ""}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </Component>
  );
}

export default function AdminGames() {
  const { user } = useAuth();
  const { testMode } = useTestMode();
  const { setTitle } = useOutletContext();
  const [games, setGames] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewGame, setPreviewGame] = useState(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle("Spieleverwaltung");
    fetchGames();
  }, [setTitle]);

  const filteredGames = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return games;
    return games.filter((game) =>
      `${game.name} ${game.category || ""} ${game.description || ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [games, search]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const res = await API.get("/games");
      setGames(res.data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.error || "Spiele konnten nicht geladen werden",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateEditingForm = (key, value) => {
    setEditingForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Spielname ist erforderlich");
      return;
    }

    setSaving(true);
    try {
      await API.post("/games", {
        ...form,
        name: form.name.trim(),
        category: form.category.trim(),
      });
      setForm(emptyForm);
      setToast("Spiel erstellt");
      await fetchGames();
    } catch (err) {
      setError(
        err.response?.data?.error || "Spiel konnte nicht erstellt werden",
      );
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (game) => {
    setEditingId(game._id);
    setEditingForm({
      name: game.name || "",
      category: game.category || "",
      description: game.description || "",
      imageUrl: game.imageUrl || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingForm(emptyForm);
  };

  const handleUpdate = async (gameId) => {
    if (!editingForm.name.trim()) {
      setError("Spielname ist erforderlich");
      return;
    }

    setSaving(true);
    try {
      await API.patch(`/games/${gameId}`, {
        ...editingForm,
        name: editingForm.name.trim(),
        category: editingForm.category.trim(),
      });
      cancelEdit();
      setToast("Spiel aktualisiert");
      await fetchGames();
    } catch (err) {
      setError(
        err.response?.data?.error || "Spiel konnte nicht aktualisiert werden",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (game) => {
    const ok = window.confirm(`Spiel "${game.name}" wirklich löschen?`);
    if (!ok) return;

    try {
      await API.delete(`/games/${game._id}`);
      setToast("Spiel gelöscht");
      await fetchGames();
    } catch (err) {
      setError(
        err.response?.data?.error || "Spiel konnte nicht gelöscht werden",
      );
    }
  };

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-games-page">
      <div className="admin-games-header">
        <div className="title-with-icon">
          <Gamepad2 size={20} />
          <span>Spiele</span>
        </div>
      </div>

      <form className="admin-games-create card" onSubmit={handleCreate}>
        <div className="admin-games-create-title">
          <Plus size={18} />
          <span>Neues Spiel</span>
        </div>
        <div className="admin-games-form-grid">
          <input
            className="input"
            placeholder="Name"
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
          />
          <input
            className="input"
            placeholder="Kategorie"
            value={form.category}
            onChange={(event) => updateForm("category", event.target.value)}
          />
          <input
            className="input"
            placeholder="Bild-URL"
            value={form.imageUrl}
            onChange={(event) => updateForm("imageUrl", event.target.value)}
          />
          <input
            className="input"
            placeholder="Beschreibung"
            value={form.description}
            onChange={(event) => updateForm("description", event.target.value)}
          />
        </div>
        <div className="admin-games-form-actions">
          <button className="button primary" type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? "Speichert..." : "Speichern"}
          </button>
        </div>
      </form>

      <input
        type="text"
        className="input admin-games-search"
        placeholder="Spiele suchen..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading ? (
        <p>Lade Spiele...</p>
      ) : filteredGames.length === 0 ? (
        <p>Keine Spiele gefunden.</p>
      ) : (
        <div className="admin-games-list">
          {filteredGames.map((game) => {
            const isEditing = editingId === game._id;
            const isLiveReadonly = testMode && !game.isTestData;
            return (
              <div key={game._id} className="card admin-game-card">
                {isEditing ? (
                  <div className="admin-games-form-grid">
                    <input
                      className="input"
                      placeholder="Name"
                      value={editingForm.name}
                      onChange={(event) =>
                        updateEditingForm("name", event.target.value)
                      }
                    />
                    <input
                      className="input"
                      placeholder="Kategorie"
                      value={editingForm.category}
                      onChange={(event) =>
                        updateEditingForm("category", event.target.value)
                      }
                    />
                    <input
                      className="input"
                      placeholder="Bild-URL"
                      value={editingForm.imageUrl}
                      onChange={(event) =>
                        updateEditingForm("imageUrl", event.target.value)
                      }
                    />
                    <input
                      className="input"
                      placeholder="Beschreibung"
                      value={editingForm.description}
                      onChange={(event) =>
                        updateEditingForm("description", event.target.value)
                      }
                    />
                  </div>
                ) : (
                  <div className="admin-game-info">
                    <div className="admin-game-title-row">
                      <GameImage
                        imageUrl={game.imageUrl}
                        name={game.name}
                        onPreview={() =>
                          setPreviewGame({
                            name: game.name,
                            imageUrl: game.imageUrl,
                          })
                        }
                      />
                      <strong>{game.name}</strong>
                    </div>
                    <div className="admin-game-meta">
                      {game.category || "Keine Kategorie"}
                      {isLiveReadonly && (
                        <span className="admin-game-badge">Live-Katalog</span>
                      )}
                    </div>
                    {game.description && (
                      <div className="admin-game-description">
                        {game.description}
                      </div>
                    )}
                  </div>
                )}

                <div className="admin-game-actions">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="button neutral small admin-game-action-button"
                        onClick={() => handleUpdate(game._id)}
                        disabled={saving}
                        title="Speichern"
                      >
                        <Save size={18} />
                      </button>
                      <button
                        type="button"
                        className="button neutral small admin-game-action-button"
                        onClick={cancelEdit}
                        disabled={saving}
                        title="Abbrechen"
                      >
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="button neutral small admin-game-action-button"
                        onClick={() => startEdit(game)}
                        disabled={isLiveReadonly}
                        title="Bearbeiten"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        className="button danger small admin-game-action-button"
                        onClick={() => handleDelete(game)}
                        disabled={isLiveReadonly}
                        title="Löschen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <Toast message={error} onClose={() => setError("")} />}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
      {previewGame &&
        createPortal(
          <div
            className="game-image-preview-overlay"
            onClick={() => setPreviewGame(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Escape" || event.key === "Enter") {
                setPreviewGame(null);
              }
            }}
          >
            <div
              className="game-image-preview"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={previewGame.imageUrl}
                alt={previewGame.name ? `${previewGame.name} Bild` : ""}
              />
              <strong>{previewGame.name}</strong>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
