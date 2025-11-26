const Game = require("../models/Game");

// 🔹 Alle Spiele abrufen
exports.getGames = async (req, res) => {
  try {
    const games = await Game.find().sort({ name: 1 });
    res.json(games);
  } catch (err) {
    console.error("Fehler beim Laden der Spiele:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Spiele" });
  }
};

// 🔹 Neues Spiel anlegen
exports.createGame = async (req, res) => {
  try {
    const { name, category, description, imageUrl } = req.body;
    const createdBy = req.user._id || req.user.userId;

    const existing = await Game.findOne({ name });
    if (existing)
      return res.status(400).json({ error: "Spiel bereits vorhanden" });

    const newGame = await Game.create({
      name,
      category,
      description,
      imageUrl,
      createdBy,
    });

    res.status(201).json(newGame);
  } catch (err) {
    console.error("Fehler beim Erstellen des Spiels:", err.message);
    res.status(500).json({ error: "Fehler beim Erstellen des Spiels" });
  }
};

// 🔹 Spieldetails abrufen
exports.getGameById = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ error: "Spiel nicht gefunden" });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Abrufen des Spiels" });
  }
};

// 🔹 Spiel bearbeiten
exports.updateGame = async (req, res) => {
  try {
    const updated = await Game.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated)
      return res.status(404).json({ error: "Spiel nicht gefunden" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Aktualisieren des Spiels" });
  }
};

// 🔹 Spiel löschen (nur Admin)
exports.deleteGame = async (req, res) => {
  try {
    const deleted = await Game.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ error: "Spiel nicht gefunden" });
    res.json({ message: "Spiel gelöscht" });
    if (game.imagePublicId) {
      await deleteFromCloudinary(game.imagePublicId);
    }
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Löschen des Spiels" });
  }
};
