// backend/controllers/eveningController.js
const Evening = require("../models/Evening");
const {
  calculateEveningStats,
  rebuildUserStatsForYear,
} = require("../utils/stats");
const Year = require("../models/Year");
const mongoose = require("mongoose");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/uploadService");
const Poll = require("../models/Poll");
const User = require("../models/User");
const { scopedFilter } = require("../utils/testMode");

const STAT_FINAL_STATUSES = new Set(["abgeschlossen", "gesperrt"]);

function hasGeneratedEveningStats(evening) {
  return (
    STAT_FINAL_STATUSES.has(evening.status) ||
    evening.totalPoints != null ||
    evening.maxPoints != null ||
    evening.gamesPlayedCount != null ||
    evening.participantCount != null ||
    Boolean(evening.winnerIds?.length) ||
    Boolean(evening.placements?.length) ||
    Boolean(evening.playerPoints?.length) ||
    Boolean(evening.gameCount?.length)
  );
}

async function saveEveningAndRefreshStatsIfGenerated(evening) {
  if (!hasGeneratedEveningStats(evening)) {
    await evening.save();
    return false;
  }

  const stats = calculateEveningStats(evening);
  Object.assign(evening, stats);
  await evening.save();
  await rebuildUserStatsForYear(evening.spieljahr, {
    isTestData: evening.isTestData === true,
  });
  return true;
}

exports.getEvenings = async (req, res) => {
  try {
    const evenings = await Evening.find(scopedFilter(req))
      .populate("pollId") // ← WICHTIG!
      .populate("spielleiterId", "displayName profileImageUrl")
      .populate("participantIds", "displayName profileImageUrl")
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

    // Jahr prüfen
    const year = await Year.findOne({ year: spieljahr });
    if (!year) {
      return res.status(404).json({ error: "Spieljahr nicht gefunden." });
    }

    // Blockieren, falls Jahr abgeschlossen ist
    if (!req.isTestMode && year.closed === true) {
      return res.status(400).json({
        error:
          "Das gewählte Spieljahr ist bereits abgeschlossen. Es können keine neuen Abende erstellt werden.",
      });
    }

    // Nur 1 offener Abend pro Jahr zulässig
    const existing = await Evening.findOne(
      scopedFilter(req, { spieljahr, status: "offen" }),
    );
    if (existing) {
      return res.status(400).json({
        error: "Es existiert bereits ein offener Abend in diesem Jahr.",
      });
    }

    const newEvening = new Evening({
      spieljahr,
      spielleiterId,
      participantIds: [spielleiterId],
      status: "offen",
      date: null,
      isTestData: req.isTestMode,
    });

    await newEvening.save();

    // Populate für direkte Frontend-Nutzung
    const populated = await Evening.findById(newEvening._id)
      .populate("spielleiterId", "displayName profileImageUrl")
      .populate("participantIds", "displayName profileImageUrl");

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
    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    )
      .populate("spielleiterId", "displayName profileImageUrl")
      .populate("participantIds", "displayName profileImageUrl")
      .populate("games.gameId", "name category")
      .populate("games.scores.userId", "displayName");

    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }
    // Falls Statistiken fehlen (alte Daten), on-the-fly berechnen
    if (!evening.playerPoints || evening.playerPoints.length === 0) {
      const calc = calculateEveningStats(evening);
      evening.winnerIds = calc.winnerIds;
      evening.playerPoints = calc.playerPoints;
      evening.placements = calc.placements;
      evening.maxPoints = calc.maxPoints;
      evening.totalPoints = calc.totalPoints;
      evening.gameCount = calc.gameCount;
      evening.gamesPlayedCount = calc.gamesPlayedCount;
      evening.participantCount = calc.participantCount;
    }

    const response = {
      ...evening.toObject(),
      spielleiterRef: evening.spielleiterId,
      participantRefs: evening.participantIds,

      // Spiele korrekt aufbereitet
      games: evening.games.map((g) => ({
        _id: g._id,
        gameId: g.gameId,
        scores: g.scores.map((s) => ({
          userId: s.userId?._id,
          userName: s.userId?.displayName,
          points: s.points,
        })),
      })),

      // WICHTIG: Abendstatistiken korrekt und separat
      winnerIds: evening.winnerIds?.map((id) => id.toString()),
      playerPoints: evening.playerPoints?.map((p) => ({
        userId: p.userId.toString(),
        points: p.points,
      })),
      placements: evening.placements?.map((pl) => ({
        userId: pl.userId.toString(),
        place: pl.place,
      })),
      gameCount: evening.gameCount?.map((g) => ({
        gameId: g.gameId.toString(),
        count: g.count,
      })),

      totalPoints: evening.totalPoints,
      maxPoints: evening.maxPoints,
      gamesPlayedCount: evening.gamesPlayedCount,
      participantCount: evening.participantCount,
    };

    res.json(response);
  } catch (err) {
    console.error("Fehler beim Laden des Abends:", err.message);
    res.status(500).json({ error: "Fehler beim Laden des Abends" });
  }
};

exports.updateEvening = async (req, res) => {
  try {
    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    );

    if (!evening)
      return res.status(404).json({ error: "Abend nicht gefunden" });

    const oldYear = evening.spieljahr;
    const { spieljahr, spielleiterId, date } = req.body;

    if (spieljahr != null) {
      const nextYear = Number(spieljahr);
      if (!Number.isInteger(nextYear)) {
        return res.status(400).json({ error: "Ungültiges Spieljahr" });
      }

      const year = await Year.findOne({ year: nextYear });
      if (!year) {
        return res.status(404).json({ error: "Spieljahr nicht gefunden" });
      }
      if (!req.isTestMode && year.closed) {
        return res.status(400).json({
          error: "Das gewählte Spieljahr ist bereits abgeschlossen.",
        });
      }

      evening.spieljahr = nextYear;
    }

    if (spielleiterId != null) {
      if (!mongoose.Types.ObjectId.isValid(spielleiterId)) {
        return res.status(400).json({ error: "Ungültiger Spielleiter" });
      }

      const userFilter = req.isTestMode
        ? {
            _id: spielleiterId,
            active: true,
            $or: [{ isTestData: true }, { _id: req.user._id }],
          }
        : { _id: spielleiterId, active: true, isTestData: { $ne: true } };
      const spielleiter = await User.findOne(userFilter);
      if (!spielleiter) {
        return res.status(404).json({ error: "Spielleiter nicht gefunden" });
      }

      const isAlreadyParticipant = evening.participantIds.some(
        (id) => id.toString() === spielleiterId.toString(),
      );
      if (!isAlreadyParticipant && evening.games.length > 0) {
        return res.status(400).json({
          error:
            "Spielleiter kann bei bereits erfassten Spielen nur auf bestehende Teilnehmer geändert werden.",
        });
      }
      if (!isAlreadyParticipant) {
        evening.participantIds.push(spielleiterId);
      }

      evening.spielleiterId = spielleiterId;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "date")) {
      evening.date = date ? new Date(date) : null;
    }

    await evening.save();

    if (oldYear !== evening.spieljahr && hasGeneratedEveningStats(evening)) {
      await rebuildUserStatsForYear(oldYear, {
        isTestData: evening.isTestData === true,
      });
      await rebuildUserStatsForYear(evening.spieljahr, {
        isTestData: evening.isTestData === true,
      });
    }

    const updated = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    )
      .populate("spielleiterId", "displayName profileImageUrl")
      .populate("participantIds", "displayName profileImageUrl");

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
    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    );
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    const yearDoc = await Year.findOne({ year: evening.spieljahr });
    if (yearDoc?.closed) {
      return res.status(400).json({
        error: "Jahr ist abgeschlossen – Abend kann nicht gelöscht werden",
      });
    }

    // 1) Poll löschen (robust über eveningId)
    const poll = await Poll.findOneAndDelete(
      scopedFilter(req, { eveningId: evening._id }),
    );
    if (poll) {
      // defensiv: pollId am Abend lösen
      await Evening.updateOne(scopedFilter(req, { _id: evening._id }), {
        $set: { pollId: null },
      });
    }

    // 2) Gruppenfoto löschen
    if (evening.groupPhotoPublicId) {
      await deleteFromCloudinary(evening.groupPhotoPublicId);
    }

    // 3) Abend löschen
    await Evening.deleteOne(scopedFilter(req, { _id: evening._id }));

    // 4) Stats neu bauen
    try {
      await rebuildUserStatsForYear(evening.spieljahr, {
        isTestData: evening.isTestData === true,
      });
    } catch (e) {
      console.error("Rebuild failed after delete:", e);
      return res.status(500).json({
        error:
          "Abend gelöscht, aber Statistiken konnten nicht neu berechnet werden",
      });
    }

    return res.json({
      message: "Abend inkl. Umfrage und Stats-Verknüpfungen gelöscht",
    });
  } catch (err) {
    console.error("Fehler beim Löschen:", err.message);
    return res.status(500).json({ error: "Fehler beim Löschen" });
  }
};

exports.changeEveningStatus = async (req, res) => {
  try {
    const { status, date } = req.body;
    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    );

    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    const oldStatus = evening.status;

    // Ungültiger Status
    const validStatuses = ["offen", "fixiert", "abgeschlossen", "gesperrt"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Ungültiger Status" });
    }

    // Logs verhindern Rückschritt nach unten (optional)
    if (oldStatus === "abgeschlossen" && status === "fixiert") {
      return res.status(400).json({
        error: "Abgeschlossene Abende können nicht zurückgesetzt werden",
      });
    }

    if (
      ["abgeschlossen", "gesperrt"].includes(oldStatus) &&
      status === "offen"
    ) {
      return res.status(400).json({
        error:
          "Abgeschlossene oder gesperrte Abende können nicht geöffnet werden",
      });
    }

    if (status === "offen") {
      if (evening.games.length > 0) {
        return res.status(400).json({
          error:
            "Terminfixierung kann nicht zurückgesetzt werden, solange Spiele erfasst sind.",
        });
      }
      evening.date = null;
      if (evening.pollId) {
        await Poll.updateOne(scopedFilter(req, { _id: evening.pollId }), {
          $unset: { finalizedOption: "" },
        });
      }
    }

    if (status === "fixiert") {
      const nextDate = date ? new Date(date) : evening.date;
      if (!nextDate || Number.isNaN(nextDate.getTime())) {
        return res.status(400).json({
          error: "Zum Fixieren ist ein Termin erforderlich",
        });
      }
      evening.date = nextDate;
    }

    // ===========================================
    // 1. Statistiken NUR bei fixiert → abgeschlossen
    // ===========================================
    if (oldStatus === "fixiert" && status === "abgeschlossen") {
      const stats = calculateEveningStats(evening);
      Object.assign(evening, stats);
    }

    // ===========================================
    // 2. Status setzen & speichern
    // ===========================================
    evening.status = status;
    await evening.save();
    await rebuildUserStatsForYear(evening.spieljahr, {
      isTestData: evening.isTestData === true,
    });

    // Rückgabe
    const updated = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    )
      .populate("spielleiterId", "displayName profileImageUrl")
      .populate("participantIds", "displayName profileImageUrl")
      .populate("games.gameId", "name category")
      .populate("games.scores.userId", "displayName");

    const response = {
      ...updated.toObject(),
      spielleiterRef: updated.spielleiterId,
      participantRefs: updated.participantIds,
    };

    res.json({ message: "Status geändert", evening: response });
  } catch (err) {
    console.error("Fehler beim Statuswechsel:", err.message);
    res.status(500).json({ error: "Fehler beim Statuswechsel" });
  }
};

// 🧍‍♂️ Teilnahme hinzufügen
exports.addParticipant = async (req, res) => {
  try {
    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    );
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    if (evening.status === "abgeschlossen" && req.user?.role !== "admin") {
      return res
        .status(400)
        .json({ error: "Abend ist abgeschlossen – Änderungen nicht erlaubt" });
    }

    const userId = req.body?.userId || req.user?._id;
    if (!userId) {
      return res
        .status(400)
        .json({ error: "Benutzer-ID fehlt (nicht eingeloggt?)" });
    }

    if (evening.participantIds.includes(userId)) {
      return res.status(400).json({ error: "Bereits eingetragen." });
    }

    evening.participantIds.push(userId);
    await evening.save();

    const updated = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    )
      .populate("spielleiterId", "displayName profileImageUrl")
      .populate("participantIds", "displayName profileImageUrl");

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
    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    );
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    if (evening.status === "abgeschlossen" && req.user.role !== "admin") {
      return res
        .status(400)
        .json({ error: "Abend ist abgeschlossen – Änderungen nicht erlaubt" });
    }

    evening.participantIds = evening.participantIds.filter(
      (id) => id.toString() !== userId.toString(),
    );
    await evening.save();

    const updated = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    )
      .populate("spielleiterId", "displayName profileImageUrl")
      .populate("participantIds", "displayName profileImageUrl");

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
    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    )
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

    if (!gameId || !mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({ error: "Ungültige Spiel-ID." });
    }

    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    ).populate("participantIds", "displayName profileImageUrl");

    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    if (evening.status === "abgeschlossen" && req.user.role !== "admin") {
      return res.status(400).json({
        error: "Abend ist abgeschlossen – Hinzufügen nicht erlaubt",
      });
    }

    const scores = evening.participantIds.map((p) => ({
      userId: p._id,
      points: 0,
    }));

    evening.games.push({ gameId, scores, notes });
    await evening.save();

    const updated = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    )
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

    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    );
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    if (evening.status === "abgeschlossen" && req.user.role !== "admin") {
      return res
        .status(400)
        .json({ error: "Abend ist abgeschlossen – Bearbeitung nicht erlaubt" });
    }

    const entry = evening.games.id(gameEntryId);
    if (!entry) {
      return res.status(404).json({ error: "Spieleintrag nicht gefunden" });
    }

    if (scores) entry.scores = scores;
    if (notes) entry.notes = notes;
    const statsRefreshed = await saveEveningAndRefreshStatsIfGenerated(evening);

    res.json({ message: "Spiel aktualisiert", game: entry, statsRefreshed });
  } catch (err) {
    console.error("Fehler bei updateEveningGame:", err.message);
    res.status(500).json({ error: "Fehler beim Aktualisieren des Spiels" });
  }
};

// 🗑️ Spiel aus Abend löschen
exports.deleteEveningGame = async (req, res) => {
  try {
    const { gameEntryId } = req.params;
    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    );
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    if (evening.status === "abgeschlossen" && req.user.role !== "admin") {
      return res
        .status(400)
        .json({ error: "Abend ist abgeschlossen – Bearbeitung nicht erlaubt" });
    }

    evening.games = evening.games.filter(
      (g) => g._id.toString() !== gameEntryId.toString(),
    );
    const statsRefreshed = await saveEveningAndRefreshStatsIfGenerated(evening);

    res.json({ message: "Spiel gelöscht", statsRefreshed });
  } catch (err) {
    console.error("Fehler bei deleteEveningGame:", err.message);
    res.status(500).json({ error: "Fehler beim Löschen des Spiels" });
  }
};

exports.getArchivedEvenings = async (req, res) => {
  try {
    const evenings = await Evening.find(
      scopedFilter(req, { status: "gesperrt" }),
    )
      .populate("spielleiterId", "displayName profileImageUrl")
      .populate("participantIds", "displayName profileImageUrl")
      .sort({ date: -1 });

    const mapped = evenings.map((e) => ({
      ...e.toObject(),
      spielleiterRef: e.spielleiterId,
      participantRefs: e.participantIds,
    }));

    res.json(mapped);
  } catch (err) {
    console.error("Fehler beim Laden der Historie:", err);
    res.status(500).json({ error: "Fehler beim Laden der Historie" });
  }
};

exports.recalculateEveningStats = async (req, res) => {
  try {
    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    );

    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    // Abendstatistik neu berechnen
    const stats = calculateEveningStats(evening);
    Object.assign(evening, stats);

    await evening.save();

    // WICHTIG: Jahres-Statistiken vollständig neu berechnen
    await rebuildUserStatsForYear(evening.spieljahr, {
      isTestData: evening.isTestData === true,
    });

    res.json({ message: "Statistiken aktualisiert", stats });
  } catch (err) {
    console.error("Fehler bei Recalculate:", err.message);
    res.status(500).json({ error: "Fehler beim Neuberechnen" });
  }
};

// 👤 Benutzer, die noch nicht Teilnehmer sind (für Dropdown)
exports.getEligibleUsers = async (req, res) => {
  try {
    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    );
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }

    // Hole alle aktiven Benutzer ausser bereits Teilnehmende
    const users = await User.find({
      active: true,
      ...(req.isTestMode
        ? { isTestData: true }
        : { isTestData: { $ne: true } }),
      _id: { $nin: evening.participantIds },
    }).select("_id displayName role");

    res.json(users);
  } catch (err) {
    console.error("Fehler bei getEligibleUsers:", err.message);
    res.status(500).json({ error: "Fehler beim Abrufen der Benutzer" });
  }
};

exports.uploadGroupPhoto = async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "No file uploaded" });

  const evening = await Evening.findOne(scopedFilter(req, { _id: id }));
  if (!evening) return res.status(404).json({ error: "Evening not found" });

  const folder = `spielabend/evenings/${id}`;
  const publicId = `group-photo`;

  // altes Bild löschen
  if (evening.groupPhotoPublicId) {
    await deleteFromCloudinary(evening.groupPhotoPublicId);
  }

  // neues Bild hochladen
  const result = await uploadToCloudinary(file.path, folder, publicId);

  evening.groupPhotoUrl = result.secure_url;
  evening.groupPhotoPublicId = result.public_id;
  await evening.save();

  res.json({
    message: "Group photo updated",
    url: result.secure_url,
  });
};
