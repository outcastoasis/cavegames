const Poll = require("../models/Poll");
const Evening = require("../models/Evening");

// 🟢 Umfrage erstellen
exports.createPoll = async (req, res) => {
  const { eveningId, options } = req.body;
  const userId = req.user._id || req.user.userId;

  if (!userId) {
    console.error("❗ FEHLER: Kein gültiger userId im Token vorhanden.");
    return res.status(401).json({
      error: "Token enthält keine Benutzer-ID",
      details: req.user,
    });
  }

  try {
    const existing = await Poll.findOne({ eveningId });
    if (existing) {
      return res.status(409).json({
        error: "Umfrage bereits vorhanden",
        details: "Für diesen Abend existiert bereits eine Umfrage.",
      });
    }

    const poll = await Poll.create({
      eveningId,
      options,
      createdBy: userId,
    });

    await Evening.findByIdAndUpdate(eveningId, { pollId: poll._id });

    res.status(201).json(poll);
  } catch (err) {
    console.error("❌ Poll Create Error:", err);
    res.status(500).json({
      error: "Umfrage konnte nicht erstellt werden",
      details: err.message,
    });
  }
};

// 📄 Umfrage anzeigen
exports.getPoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id).populate(
      "options.votes",
      "displayName"
    );

    if (!poll) {
      return res.status(404).json({
        error: "Umfrage nicht gefunden",
        details: "Es existiert keine Umfrage mit dieser ID.",
      });
    }

    res.json(poll);
  } catch (err) {
    res.status(500).json({
      error: "Fehler beim Laden der Umfrage",
      details: err.message,
    });
  }
};

// ✅ Stimme abgeben
exports.votePoll = async (req, res) => {
  const userId = req.user._id || req.user.userId;
  const { optionDates } = req.body;

  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({
        error: "Umfrage nicht gefunden",
        details: "Es existiert keine Umfrage mit dieser ID.",
      });
    }

    // Bisherige Stimmen entfernen
    poll.options.forEach((opt) => {
      opt.votes = opt.votes.filter((v) => v.toString() !== userId.toString());
    });

    // Neue Stimmen hinzufügen
    poll.options.forEach((opt) => {
      if (optionDates.includes(opt.date.toISOString())) {
        opt.votes.push(userId);
      }
    });

    await poll.save();
    res.json({ message: "Abstimmung erfolgreich gespeichert" });
  } catch (err) {
    res.status(500).json({
      error: "Abstimmung fehlgeschlagen",
      details: err.message,
    });
  }
};

// 🏁 Umfrage finalisieren
exports.finalizePoll = async (req, res) => {
  const { finalizedDate } = req.body;

  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({
        error: "Umfrage nicht gefunden",
        details: "Finalisierung nicht möglich.",
      });
    }

    poll.finalizedOption = finalizedDate;
    await poll.save();

    await Evening.findByIdAndUpdate(poll.eveningId, {
      date: finalizedDate,
      status: "fixiert",
    });

    res.json({
      message: "Termin wurde erfolgreich fixiert",
      finalizedDate,
    });
  } catch (err) {
    res.status(500).json({
      error: "Finalisierung fehlgeschlagen",
      details: err.message,
    });
  }
};

// ❌ Umfrage löschen
exports.deletePoll = async (req, res) => {
  try {
    const poll = await Poll.findByIdAndDelete(req.params.id);
    if (!poll) {
      return res.status(404).json({
        error: "Umfrage nicht gefunden",
        details: "Löschen nicht möglich.",
      });
    }

    await Evening.findByIdAndUpdate(poll.eveningId, { pollId: null });

    res.json({ message: "Umfrage wurde gelöscht" });
  } catch (err) {
    res.status(500).json({
      error: "Fehler beim Löschen der Umfrage",
      details: err.message,
    });
  }
};
