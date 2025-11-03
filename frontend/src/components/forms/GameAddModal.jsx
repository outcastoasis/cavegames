import { useEffect, useState } from "react";
import API from "../../services/api";
import "../../styles/components/GameAddModal.css";

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
    } catch (err) {
      console.error("Fehler beim Laden der Spiele:", err);
      setError("Fehler beim Laden der Spieleliste.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
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

      // Jetzt Spiel zum Abend hinzufügen:
      await API.post(`/evenings/${eveningId}/games`, { eveningId, gameId });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Fehler beim Hinzufügen.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal card game-add-modal">
        <h2>Spiel auswählen oder hinzufügen</h2>

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
          <button className="button neutral" onClick={onClose}>
            Abbrechen
          </button>
          <button className="button primary" onClick={handleSubmit}>
            {selectedGame ? "Auswählen" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
