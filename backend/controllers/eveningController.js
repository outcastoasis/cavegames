// backend/controllers/eveningController.js
const Evening = require("../models/Evening");

exports.getEvenings = async (req, res) => {
  try {
    const evenings = await Evening.find()
      .populate("pollId") // ← WICHTIG!
      .populate("spielleiterId", "displayName")
      .populate("participantIds", "displayName")
      .sort({ date: -1 });

    // Einheitliches Frontend-Mapping
    const response = evenings.map((e) => ({
      ...e.toObject(),
      spielleiterRef: e.spielleiterId,
      participantRefs: e.participantIds,
    }));

    res.json(response);
  } catch (err) {
    console.error("Fehler beim Laden der Abende:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Abende" });
  }
};

exports.createEvening = async (req, res) => {
  try {
    const { spieljahr, spielleiterId } = req.body;

    if (!spieljahr || !spielleiterId) {
      return res
        .status(400)
        .json({ error: "Spieljahr und Spielleiter sind erforderlich." });
    }

    // Nur 1 offener Abend pro Jahr zulässig
    const existing = await Evening.findOne({ spieljahr, status: "offen" });
    if (existing) {
      return res.status(400).json({
        error: "Es existiert bereits ein offener Abend in diesem Jahr.",
      });
    }

    const newEvening = new Evening({
      spieljahr,
      spielleiterId,
      organizerId: req.user.id,
      participantIds: [spielleiterId],
      status: "offen",
      date: null,
    });

    await newEvening.save();

    // Optional: Notification erstellen (wenn unterstützt)
    // await Notification.create({
    //   userId: spielleiterId,
    //   message: "Du wurdest einem neuen Abend zugeteilt. Bitte erstelle eine Umfrage.",
    //   type: "info",
    // });

    // Populate für direkte Frontend-Nutzung
    const populated = await Evening.findById(newEvening._id)
      .populate("spielleiterId", "displayName")
      .populate("participantIds", "displayName");

    const response = {
      ...populated.toObject(),
      spielleiterRef: populated.spielleiterId,
      participantRefs: populated.participantIds,
    };

    res.status(201).json(response);
  } catch (err) {
    console.error("Fehler beim Erstellen:", err);
    res.status(500).json({ error: "Fehler beim Erstellen des Abends" });
  }
};

exports.getEveningById = async (req, res) => {
  try {
    const evening = await Evening.findById(req.params.id)
      .populate("spielleiterId", "displayName")
      .populate("participantIds", "displayName")
      .populate("games.gameId", "name category") // <-- FEHLTE
      .populate("games.scores.userId", "displayName");

    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    // Backend → Frontend Mapping
    const response = {
      ...evening.toObject(),
      spielleiterRef: evening.spielleiterId,
      participantRefs: evening.participantIds,
      games: evening.games.map((g) => ({
        ...g.toObject(),
        scores: g.scores.map((s) => ({
          userId: s.userId?._id,
          userName: s.userId?.displayName,
          points: s.points,
        })),
      })),
    };

    res.json(response);
  } catch (err) {
    console.error("Fehler beim Laden des Abends:", err.message);
    res.status(500).json({ error: "Fehler beim Laden des Abends" });
  }
};

exports.updateEvening = async (req, res) => {
  try {
    const updated = await Evening.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .populate("spielleiterId", "displayName")
      .populate("participantIds", "displayName");

    if (!updated)
      return res.status(404).json({ error: "Abend nicht gefunden" });

    const response = {
      ...updated.toObject(),
      spielleiterRef: updated.spielleiterId,
      participantRefs: updated.participantIds,
    };

    res.json(response);
  } catch (err) {
    console.error("Fehler beim Aktualisieren:", err.message);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
};

exports.deleteEvening = async (req, res) => {
  try {
    const deleted = await Evening.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ error: "Abend nicht gefunden" });
    res.json({ message: "Abend gelöscht" });
  } catch (err) {
    console.error("Fehler beim Löschen:", err.message);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
};

exports.changeEveningStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const evening = await Evening.findById(req.params.id);
    if (!evening)
      return res.status(404).json({ error: "Abend nicht gefunden" });

    evening.status = status;
    await evening.save();

    res.json({ message: "Status geändert", evening });
  } catch (err) {
    console.error("Fehler beim Statuswechsel:", err.message);
    res.status(500).json({ error: "Fehler beim Statuswechsel" });
  }
};

// 🧍‍♂️ Teilnahme hinzufügen
exports.addParticipant = async (req, res) => {
  try {
    const evening = await Evening.findById(req.params.id);
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    const userId = req.user._id || req.user.userId;
    if (evening.participantIds.includes(userId)) {
      return res.status(400).json({ error: "Bereits eingetragen." });
    }

    evening.participantIds.push(userId);
    await evening.save();

    const updated = await Evening.findById(req.params.id)
      .populate("spielleiterId", "displayName")
      .populate("participantIds", "displayName");

    res.json({
      message: "Teilnahme bestätigt",
      participants: updated.participantIds,
    });
  } catch (err) {
    console.error("Fehler bei addParticipant:", err.message);
    res.status(500).json({ error: "Fehler beim Hinzufügen der Teilnahme" });
  }
};

// 🚪 Teilnahme entfernen
exports.removeParticipant = async (req, res) => {
  try {
    const { userId } = req.params;
    const evening = await Evening.findById(req.params.id);
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    evening.participantIds = evening.participantIds.filter(
      (id) => id.toString() !== userId.toString()
    );
    await evening.save();

    const updated = await Evening.findById(req.params.id)
      .populate("spielleiterId", "displayName")
      .populate("participantIds", "displayName");

    res.json({
      message: "Teilnahme entfernt",
      participants: updated.participantIds,
    });
  } catch (err) {
    console.error("Fehler bei removeParticipant:", err.message);
    res.status(500).json({ error: "Fehler beim Entfernen der Teilnahme" });
  }
};

// 🎮 Spiele eines Abends abrufen
exports.getEveningGames = async (req, res) => {
  try {
    const evening = await Evening.findById(req.params.id)
      .populate("games.gameId", "name category")
      .populate("games.scores.userId", "displayName");

    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    res.json(evening.games);
  } catch (err) {
    console.error("Fehler bei getEveningGames:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Spiele" });
  }
};

// 🎲 Neues Spiel mit Punkten hinzufügen
exports.addEveningGame = async (req, res) => {
  try {
    const { gameId, notes } = req.body;
    const evening = await Evening.findById(req.params.id).populate(
      "participantIds",
      "displayName"
    );

    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    // Initial Scores: alle Teilnehmer starten mit 0 Punkten
    const scores = evening.participantIds.map((p) => ({
      userId: p._id,
      points: 0,
    }));

    evening.games.push({ gameId, scores, notes });
    await evening.save();

    const updated = await Evening.findById(req.params.id)
      .populate("games.gameId", "name category")
      .populate("games.scores.userId", "displayName");

    res.status(201).json(updated.games);
  } catch (err) {
    console.error("Fehler bei addEveningGame:", err.message);
    res.status(500).json({ error: "Fehler beim Hinzufügen des Spiels" });
  }
};

// ✏️ Spiel-Eintrag bearbeiten
exports.updateEveningGame = async (req, res) => {
  try {
    const { gameEntryId } = req.params;
    const { scores, notes } = req.body;

    const evening = await Evening.findById(req.params.id);
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    const entry = evening.games.id(gameEntryId);
    if (!entry) {
      return res.status(404).json({ error: "Spieleintrag nicht gefunden" });
    }

    if (scores) entry.scores = scores;
    if (notes) entry.notes = notes;
    await evening.save();

    res.json({ message: "Spiel aktualisiert", game: entry });
  } catch (err) {
    console.error("Fehler bei updateEveningGame:", err.message);
    res.status(500).json({ error: "Fehler beim Aktualisieren des Spiels" });
  }
};

// 🗑️ Spiel aus Abend löschen
exports.deleteEveningGame = async (req, res) => {
  try {
    const { gameEntryId } = req.params;
    const evening = await Evening.findById(req.params.id);
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    evening.games = evening.games.filter(
      (g) => g._id.toString() !== gameEntryId.toString()
    );
    await evening.save();

    res.json({ message: "Spiel gelöscht" });
  } catch (err) {
    console.error("Fehler bei deleteEveningGame:", err.message);
    res.status(500).json({ error: "Fehler beim Löschen des Spiels" });
  }
};
