const Game = require("../models/Game");
const { deleteFromCloudinary } = require("../utils/uploadService");
const { scopedFilter } = require("../utils/testMode");

exports.getGames = async (req, res) => {
  try {
    const filter = req.isTestMode ? {} : scopedFilter(req);
    const games = await Game.find(filter).sort({ name: 1 });
    res.json(games);
  } catch (err) {
    console.error("Fehler beim Laden der Spiele:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Spiele" });
  }
};

exports.createGame = async (req, res) => {
  try {
    const { name, category, description, imageUrl } = req.body;
    const cleanName = String(name || "").trim();
    const createdBy = req.user._id || req.user.userId;

    if (!cleanName) {
      return res.status(400).json({ error: "Spielname ist erforderlich" });
    }

    const existing = await Game.findOne({ name: cleanName });
    if (existing) {
      if (req.isTestMode) {
        return res.json(existing);
      }
      return res.status(400).json({ error: "Spiel bereits vorhanden" });
    }

    const newGame = await Game.create({
      name: cleanName,
      category,
      description,
      imageUrl,
      createdBy,
      isTestData: req.isTestMode,
    });

    res.status(201).json(newGame);
  } catch (err) {
    console.error("Fehler beim Erstellen des Spiels:", err.message);
    res.status(500).json({ error: "Fehler beim Erstellen des Spiels" });
  }
};

exports.getGameById = async (req, res) => {
  try {
    const filter = req.isTestMode
      ? { _id: req.params.id }
      : scopedFilter(req, { _id: req.params.id });
    const game = await Game.findOne(filter);
    if (!game) return res.status(404).json({ error: "Spiel nicht gefunden" });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Abrufen des Spiels" });
  }
};

exports.updateGame = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.name != null) payload.name = String(payload.name).trim();

    const updated = await Game.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id }),
      payload,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Spiel nicht gefunden" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Aktualisieren des Spiels" });
  }
};

exports.deleteGame = async (req, res) => {
  try {
    const deleted = await Game.findOneAndDelete(
      scopedFilter(req, { _id: req.params.id })
    );

    if (!deleted) {
      return res.status(404).json({ error: "Spiel nicht gefunden" });
    }

    if (deleted.imagePublicId) {
      await deleteFromCloudinary(deleted.imagePublicId);
    }

    res.json({ message: "Spiel gelöscht" });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Löschen des Spiels" });
  }
};
