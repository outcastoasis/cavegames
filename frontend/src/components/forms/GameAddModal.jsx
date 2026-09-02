// src/components/forms/GameAddModal.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import Button from "../ui/Button";
import "../../styles/components/Modal.css";

export default function GameAddModal({ eveningId, onClose, onSuccess }) {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await API.get("/games");
      setGames(res.data);
    } catch {
      setError("Fehler beim Laden der Spieleliste.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let gameId = selectedGame;

      if (!gameId) {
        if (!name.trim()) return setError("Spielname ist erforderlich.");
        const res = await API.post("/games", {
          name: name.trim(),
          category: category.trim(),
          imageUrl: imageUrl.trim(),
          description: description.trim(),
        });
        gameId = res.data._id;
      }

      await API.post(`/evenings/${eveningId}/games`, { gameId });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Fehler beim Hinzufügen.");
    }
  };

  return createPortal(
    <div className="modal-overlay game-add-modal-overlay">
      <div
        className="modal game-add-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-add-modal-title"
      >
        <h2 id="game-add-modal-title">Spiel auswählen oder hinzufügen</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          {loading ? (
            <p>Lade Spiele...</p>
          ) : (
            <>
              <label htmlFor="game-add-existing">
                Bestehendes Spiel auswählen
              </label>
              <select
                id="game-add-existing"
                className="input"
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
              >
                <option value="">– Neues Spiel anlegen –</option>
                {games.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                    {g.category ? ` (${g.category})` : ""}
                  </option>
                ))}
              </select>

              {!selectedGame && (
                <>
                  <label htmlFor="game-add-name">Spielname</label>
                  <input
                    id="game-add-name"
                    className="input"
                    placeholder="z. B. Codenames"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                  <label htmlFor="game-add-category">Kategorie (optional)</label>
                  <input
                    id="game-add-category"
                    className="input"
                    placeholder="z. B. Party, Strategie, Karten..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />

                  <label htmlFor="game-add-image">Bild-URL (optional)</label>
                  <input
                    id="game-add-image"
                    className="input"
                    placeholder="Link zu einem Spielbild"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />

                  <label htmlFor="game-add-description">
                    Beschreibung (optional)
                  </label>
                  <input
                    id="game-add-description"
                    className="input"
                    placeholder="Kurzbeschreibung oder Hinweise"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </>
              )}
            </>
          )}

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <Button
              onClick={onClose}
              disabled={loading}
              variant="secondary"
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {selectedGame ? "Auswählen" : "Speichern"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
