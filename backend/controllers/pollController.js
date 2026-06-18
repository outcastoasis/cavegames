// backend/controllers/pollController.js

const Poll = require("../models/Poll");
const Evening = require("../models/Evening");
const { scopedFilter } = require("../utils/testMode");

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
    const existing = await Poll.findOne(scopedFilter(req, { eveningId }));
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
      isTestData: req.isTestMode,
    });

    await Evening.findOneAndUpdate(scopedFilter(req, { _id: eveningId }), {
      pollId: poll._id,
    });

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
    const poll = await Poll.findOne(
      scopedFilter(req, { _id: req.params.id }),
    ).populate("options.votes", "displayName");

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
    const poll = await Poll.findOne(scopedFilter(req, { _id: req.params.id }));
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
    const poll = await Poll.findOne(scopedFilter(req, { _id: req.params.id }));
    if (!poll) {
      return res.status(404).json({
        error: "Umfrage nicht gefunden",
        details: "Finalisierung nicht möglich.",
      });
    }

    poll.finalizedOption = finalizedDate;
    await poll.save();

    await Evening.findOneAndUpdate(scopedFilter(req, { _id: poll.eveningId }), {
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
    const poll = await Poll.findOneAndDelete(
      scopedFilter(req, { _id: req.params.id }),
    );
    if (!poll) {
      return res.status(404).json({
        error: "Umfrage nicht gefunden",
        details: "Löschen nicht möglich.",
      });
    }

    await Evening.findOneAndUpdate(scopedFilter(req, { _id: poll.eveningId }), {
      pollId: null,
    });

    res.json({ message: "Umfrage wurde gelöscht" });
  } catch (err) {
    res.status(500).json({
      error: "Fehler beim Löschen der Umfrage",
      details: err.message,
    });
  }
};

exports.reopenPoll = async (req, res) => {
  try {
    const poll = await Poll.findOne(scopedFilter(req, { _id: req.params.id }));
    if (!poll) {
      return res.status(404).json({
        error: "Umfrage nicht gefunden",
        details: "Öffnen nicht möglich.",
      });
    }

    const evening = await Evening.findOne(
      scopedFilter(req, { _id: poll.eveningId }),
    );
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }
    if (evening.games.length > 0) {
      return res.status(400).json({
        error:
          "Umfrage kann nicht neu geöffnet werden, solange Spiele erfasst sind.",
      });
    }

    poll.finalizedOption = undefined;
    await poll.save();

    evening.date = null;
    evening.status = "offen";
    await evening.save();

    res.json({ message: "Umfrage wurde neu geöffnet" });
  } catch (err) {
    res.status(500).json({
      error: "Fehler beim Öffnen der Umfrage",
      details: err.message,
    });
  }
};

// 📋 Alle Umfragen abrufen
exports.getAllPolls = async (req, res) => {
  try {
    const polls = await Poll.find(scopedFilter(req))
      .populate("eveningId", "date status spielleiterId spieljahr games")
      .populate("createdBy", "displayName role") // Ersteller der Umfrage
      .populate("options.votes", "displayName"); // Stimmenanzeige (Namen)

    res.json(polls);
  } catch (err) {
    console.error("Fehler beim Laden der Umfragen:", err.message);
    res.status(500).json({
      error: "Fehler beim Laden der Umfragen",
      details: err.message,
    });
  }
};
