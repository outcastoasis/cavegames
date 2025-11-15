// src/components/forms/GameAddModal.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import "../../styles/components/Modal.css";

export default function GameAddModal({ eveningId, onClose, onSuccess }) {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
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
    <div className="modal-overlay">
      <div className="modal game-add-modal">
        <h2>Spiel auswählen oder hinzufügen</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          {loading ? (
            <p>Lade Spiele...</p>
          ) : (
            <>
              <label>Bestehendes Spiel auswählen</label>
              <select
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
                  <label>Spielname</label>
                  <input
                    className="input"
                    placeholder="z. B. Codenames"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                  <label>Kategorie (optional)</label>
                  <input
                    className="input"
                    placeholder="z. B. Party, Strategie, Karten..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </>
              )}
            </>
          )}

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="button neutral"
              onClick={onClose}
              disabled={loading}
            >
              Abbrechen
            </button>
            <button type="submit" className="button primary" disabled={loading}>
              {selectedGame ? "Auswählen" : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
