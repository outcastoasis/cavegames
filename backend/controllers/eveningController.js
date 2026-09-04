// backend/controllers/eveningController.js
const Evening = require("../models/Evening");
const {
  calculateEveningStats,
  rebuildUserStatsForYear,
} = require("../utils/stats");
const Year = require("../models/Year");
const mongoose = require("mongoose");
const { unlink } = require("fs/promises");
const {
  buildEveningPhotoPresentation,
  buildOriginalPhotoUrl,
  deleteEveningPhoto,
  uploadEveningPhotoOriginal,
} = require("../services/eveningPhotoService");
const Poll = require("../models/Poll");
const User = require("../models/User");
const { scopedFilter } = require("../utils/testMode");
const {
  YEAR_STATUSES,
  allowsGameplay,
  allowsPlanning,
  getYearStatus,
} = require("../utils/yearLifecycle");
const {
  addParticipantAndScores,
  getParticipantScoreSummary,
  hasRecordedGames,
  normalizeId,
  removeParticipantAndScores,
  validateScoresForParticipants,
} = require("../utils/eveningParticipants");
const {
  sendEveningChangedNotification,
  sendPollAssignmentNotification,
  sendResultsAvailableNotification,
} = require("../services/pushNotificationService");
const {
  canModifyEveningPhoto,
  getEveningPhotoData,
  isEveningPhotoParticipant,
} = require("../utils/eveningPhoto");

const STAT_FINAL_STATUSES = new Set(["abgeschlossen", "gesperrt"]);

async function requireEveningYear(req, res, evening, { activeOnly = false } = {}) {
  const year = await Year.findOne(
    scopedFilter(req, { year: evening.spieljahr }),
  );
  if (!year) {
    res.status(409).json({ error: "Zugehöriges Spieljahr nicht gefunden." });
    return null;
  }

  if (activeOnly ? !allowsGameplay(year) : !allowsPlanning(year)) {
    const status = getYearStatus(year);
    res.status(409).json({
      code: activeOnly ? "YEAR_NOT_ACTIVE" : "YEAR_NOT_WRITABLE",
      error:
        status === YEAR_STATUSES.CLOSED
          ? "Das Spieljahr ist abgeschlossen und kann nicht mehr verändert werden."
          : "Diese Aktion ist erst möglich, wenn das Spieljahr aktiv ist.",
    });
    return null;
  }

  return year;
}

function parseEveningLocation(value) {
  if (value == null || value === "") return { value: null };
  if (typeof value !== "string") return { error: "Ungültiger Ort" };

  const normalized = value.trim();
  if (normalized.length > 120) {
    return { error: "Der Ort darf maximal 120 Zeichen lang sein." };
  }

  return { value: normalized || null };
}

function getEveningPhotoResponseFields(evening) {
  const photo = buildEveningPhotoPresentation(getEveningPhotoData(evening));
  if (!photo) {
    return {
      groupPhotoUrl: evening?.groupPhotoUrl || null,
      groupPhotoSrcSet: null,
    };
  }

  return {
    groupPhotoUrl: photo.url,
    groupPhotoSrcSet: photo.srcSet,
    groupPhotoWidth: photo.width,
    groupPhotoHeight: photo.height,
  };
}

async function removeTemporaryUpload(file) {
  if (!file?.path) return;
  try {
    await unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Temporäre Abendfoto-Datei konnte nicht entfernt werden:", error);
    }
  }
}

async function removeEveningPhotoAsset(publicId) {
  if (!publicId) return;
  try {
    await deleteEveningPhoto(publicId);
  } catch (error) {
    console.error("Abendfoto konnte nicht aus Cloudinary entfernt werden:", error);
  }
}

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

    const yearNumbers = [...new Set(evenings.map((evening) => evening.spieljahr))];
    const years = await Year.find(
      scopedFilter(req, { year: { $in: yearNumbers } }),
    ).select("year status");
    const yearStatusByNumber = new Map(
      years.map((year) => [year.year, getYearStatus(year)]),
    );

    // Einheitliches Frontend-Mapping
    const response = evenings.map((e) => ({
      ...e.toObject(),
      ...getEveningPhotoResponseFields(e),
      yearStatus: yearStatusByNumber.get(e.spieljahr) || null,
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
    const { spieljahr, spielleiterId, location } = req.body;

    if (!spieljahr || !spielleiterId) {
      return res
        .status(400)
        .json({ error: "Spieljahr und Spielleiter sind erforderlich." });
    }

    const parsedLocation = parseEveningLocation(location);
    if (parsedLocation.error) {
      return res.status(400).json({ error: parsedLocation.error });
    }

    // Jahr prüfen
    const year = await Year.findOne(scopedFilter(req, { year: spieljahr }));
    if (!year) {
      return res.status(404).json({ error: "Spieljahr nicht gefunden." });
    }

    // Geplante und aktive Jahre dürfen vorbereitet werden.
    if (!allowsPlanning(year)) {
      return res.status(409).json({
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
      location: parsedLocation.value,
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
      ...getEveningPhotoResponseFields(populated),
      yearStatus: getYearStatus(year),
      spielleiterRef: populated.spielleiterId,
      participantRefs: populated.participantIds,
    };

    res.status(201).json(response);

    setImmediate(() => {
      sendPollAssignmentNotification({
        eveningId: newEvening._id,
        assigneeId: newEvening.spielleiterId,
        actorId: req.user._id,
        spieljahr: newEvening.spieljahr,
        isTestData: req.isTestMode,
      }).catch((error) => {
        console.error(
          "Push-Versand für zugewiesenen Spielleiter fehlgeschlagen:",
          error.message,
        );
      });
    });
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
      .populate("games.gameId", "name category imageUrl")
      .populate("games.scores.userId", "displayName");

    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }
    const eveningYear = await Year.findOne(
      scopedFilter(req, { year: evening.spieljahr }),
    ).select("status");
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
      ...getEveningPhotoResponseFields(evening),
      yearStatus: eveningYear ? getYearStatus(eveningYear) : null,
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

    if (!(await requireEveningYear(req, res, evening))) return;

    const oldYear = evening.spieljahr;
    const oldDate = evening.date?.getTime?.() || null;
    const oldLocation = evening.location || null;
    const oldSpielleiterId = normalizeId(evening.spielleiterId);
    const { spieljahr, spielleiterId, date, location } = req.body;

    if (spieljahr != null) {
      const nextYear = Number(spieljahr);
      if (!Number.isInteger(nextYear)) {
        return res.status(400).json({ error: "Ungültiges Spieljahr" });
      }

      const year = await Year.findOne(scopedFilter(req, { year: nextYear }));
      if (!year) {
        return res.status(404).json({ error: "Spieljahr nicht gefunden" });
      }
      if (!allowsPlanning(year)) {
        return res.status(409).json({
          error: "Das gewählte Spieljahr ist bereits abgeschlossen.",
        });
      }
      if (
        getYearStatus(year) === YEAR_STATUSES.PLANNED &&
        (evening.games.length > 0 || STAT_FINAL_STATUSES.has(evening.status))
      ) {
        return res.status(409).json({
          error:
            "Abende mit Spielen oder Resultaten können nicht in ein geplantes Jahr verschoben werden.",
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

    if (Object.prototype.hasOwnProperty.call(req.body, "location")) {
      const parsedLocation = parseEveningLocation(location);
      if (parsedLocation.error) {
        return res.status(400).json({ error: parsedLocation.error });
      }
      evening.location = parsedLocation.value;
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
    const updatedYear = await Year.findOne(
      scopedFilter(req, { year: updated.spieljahr }),
    ).select("status");

    const response = {
      ...updated.toObject(),
      ...getEveningPhotoResponseFields(updated),
      yearStatus: updatedYear ? getYearStatus(updatedYear) : null,
      spielleiterRef: updated.spielleiterId,
      participantRefs: updated.participantIds,
    };

    res.json(response);

    const dateChanged = oldDate !== (evening.date?.getTime?.() || null);
    const locationChanged = oldLocation !== (evening.location || null);
    const spielleiterChanged =
      oldSpielleiterId !== normalizeId(evening.spielleiterId);
    const detailsChanged =
      dateChanged ||
      locationChanged ||
      oldYear !== evening.spieljahr ||
      spielleiterChanged;

    if (spielleiterChanged && evening.status === "offen" && !evening.pollId) {
      setImmediate(() => {
        sendPollAssignmentNotification({
          eveningId: evening._id,
          assigneeId: evening.spielleiterId,
          actorId: req.user._id,
          spieljahr: evening.spieljahr,
          isTestData: req.isTestMode,
        }).catch((error) => {
          console.error(
            "Push-Versand für neu zugewiesenen Spielleiter fehlgeschlagen:",
            error.message,
          );
        });
      });
    }

    if (detailsChanged && evening.status === "fixiert") {
      setImmediate(() => {
        sendEveningChangedNotification({
          eveningId: evening._id,
          actorId: req.user._id,
          date: evening.date,
          dateChanged,
          isTestData: req.isTestMode,
        }).catch((error) => {
          console.error(
            "Push-Versand für geänderten Spieleabend fehlgeschlagen:",
            error.message,
          );
        });
      });
    }
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

    if (!(await requireEveningYear(req, res, evening))) return;

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
      await removeEveningPhotoAsset(evening.groupPhotoPublicId);
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
    const oldDate = evening.date?.getTime?.() || null;

    // Ungültiger Status
    const validStatuses = ["offen", "fixiert", "abgeschlossen", "gesperrt"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Ungültiger Status" });
    }

    if (status === "gesperrt") {
      return res.status(409).json({
        error: "Abende werden ausschliesslich durch den Jahresabschluss gesperrt.",
      });
    }

    const statusYear = await requireEveningYear(req, res, evening, {
      activeOnly: status === "abgeschlossen",
    });
    if (!statusYear) return;

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
      .populate("games.gameId", "name category imageUrl")
      .populate("games.scores.userId", "displayName");

    const response = {
      ...updated.toObject(),
      ...getEveningPhotoResponseFields(updated),
      yearStatus: getYearStatus(statusYear),
      spielleiterRef: updated.spielleiterId,
      participantRefs: updated.participantIds,
    };

    res.json({ message: "Status geändert", evening: response });

    if (oldStatus === "fixiert" && status === "abgeschlossen") {
      setImmediate(() => {
        sendResultsAvailableNotification({
          eveningId: evening._id,
          actorId: req.user._id,
          date: evening.date,
          participantIds: evening.participantIds,
          isTestData: req.isTestMode,
        }).catch((error) => {
          console.error(
            "Push-Versand für verfügbare Resultate fehlgeschlagen:",
            error.message,
          );
        });
      });
    } else if (
      oldStatus === "fixiert" &&
      status === "fixiert" &&
      oldDate !== (evening.date?.getTime?.() || null)
    ) {
      setImmediate(() => {
        sendEveningChangedNotification({
          eveningId: evening._id,
          actorId: req.user._id,
          date: evening.date,
          dateChanged: true,
          isTestData: req.isTestMode,
        }).catch((error) => {
          console.error(
            "Push-Versand für geänderten Termin fehlgeschlagen:",
            error.message,
          );
        });
      });
    }
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

    if (!(await requireEveningYear(req, res, evening))) return;

    if (evening.status === "gesperrt") {
      return res.status(400).json({
        error: "Gesperrte Abende können nicht mehr verändert werden.",
      });
    }

    if (evening.status === "abgeschlossen") {
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

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Ungültige Benutzer-ID." });
    }

    const requesterId = normalizeId(req.user?._id);
    const requestedUserId = normalizeId(userId);
    const isSelf = requesterId === requestedUserId;
    const isPrivileged =
      req.user?.role === "admin" ||
      normalizeId(evening.spielleiterId) === requesterId;

    if (!isSelf && !isPrivileged) {
      return res.status(403).json({
        error: "Nur Spielleiter oder Admins dürfen andere Teilnehmer hinzufügen.",
      });
    }

    if (hasRecordedGames(evening) && isSelf) {
      return res.status(409).json({
        code: "PARTICIPANTS_LOCKED",
        error:
          "Die eigene Teilnahme kann nach dem ersten erfassten Spiel nicht mehr geändert werden.",
      });
    }

    const userFilter = req.isTestMode
      ? {
          _id: requestedUserId,
          active: true,
          $or: [{ isTestData: true }, { _id: requesterId }],
        }
      : {
          _id: requestedUserId,
          active: true,
          isTestData: { $ne: true },
        };
    const participant = await User.findOne(userFilter).select("_id");
    if (!participant) {
      return res.status(404).json({
        error: "Aktiver Benutzer nicht gefunden.",
      });
    }

    const alreadyParticipating = evening.participantIds.some(
      (id) => normalizeId(id) === requestedUserId,
    );
    if (alreadyParticipating) {
      return res.status(400).json({ error: "Bereits eingetragen." });
    }

    const initializedScores = addParticipantAndScores(evening, userId);
    await evening.save();

    const updated = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    )
      .populate("spielleiterId", "displayName profileImageUrl")
      .populate("participantIds", "displayName profileImageUrl");

    res.json({
      message: "Teilnahme bestätigt",
      participants: updated.participantIds,
      initializedScores,
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

    if (!(await requireEveningYear(req, res, evening))) return;

    if (evening.status === "gesperrt") {
      return res.status(400).json({
        error: "Gesperrte Abende können nicht mehr verändert werden.",
      });
    }

    if (evening.status === "abgeschlossen" && req.user.role !== "admin") {
      return res
        .status(400)
        .json({ error: "Abend ist abgeschlossen – Änderungen nicht erlaubt" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Ungültige Benutzer-ID." });
    }

    const requesterId = normalizeId(req.user?._id);
    const targetUserId = normalizeId(userId);
    const isSelf = requesterId === targetUserId;
    const isPrivileged =
      req.user?.role === "admin" ||
      normalizeId(evening.spielleiterId) === requesterId;

    if (!isSelf && !isPrivileged) {
      return res.status(403).json({
        error: "Nur Spielleiter oder Admins dürfen andere Teilnehmer entfernen.",
      });
    }

    if (normalizeId(evening.spielleiterId) === targetUserId) {
      return res.status(409).json({
        code: "CANNOT_REMOVE_LEADER",
        error:
          "Der aktuelle Spielleiter kann nicht aus der Teilnehmerliste entfernt werden.",
      });
    }

    const isParticipant = evening.participantIds.some(
      (id) => normalizeId(id) === targetUserId,
    );
    if (!isParticipant) {
      return res.status(404).json({ error: "Teilnehmer nicht gefunden." });
    }

    const hasGames = hasRecordedGames(evening);
    if (hasGames && !isPrivileged) {
      return res.status(409).json({
        code: "PARTICIPANTS_LOCKED",
        error:
          "Die eigene Teilnahme kann nach dem ersten erfassten Spiel nicht mehr geändert werden.",
      });
    }

    const scoreSummary = getParticipantScoreSummary(evening, targetUserId);
    const scoreDeletionConfirmed = req.body?.confirmScoreDeletion === true;
    if (hasGames && !scoreDeletionConfirmed) {
      return res.status(409).json({
        code: "SCORE_DELETION_CONFIRMATION_REQUIRED",
        error:
          "Beim Entfernen werden alle Punktestände dieses Teilnehmers an diesem Abend gelöscht.",
        scoreSummary,
      });
    }

    const removedScores = removeParticipantAndScores(evening, targetUserId);
    const statsRefreshed =
      await saveEveningAndRefreshStatsIfGenerated(evening);

    const updated = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    )
      .populate("spielleiterId", "displayName profileImageUrl")
      .populate("participantIds", "displayName profileImageUrl");

    res.json({
      message:
        removedScores.scoreEntries > 0
          ? "Teilnehmer und zugehörige Punktestände entfernt"
          : "Teilnahme entfernt",
      participants: updated.participantIds,
      removedScores,
      statsRefreshed,
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
      .populate("games.gameId", "name category imageUrl")
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

    if (!(await requireEveningYear(req, res, evening, { activeOnly: true })))
      return;

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
      .populate("games.gameId", "name category imageUrl")
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

    if (!(await requireEveningYear(req, res, evening, { activeOnly: true })))
      return;

    if (evening.status === "abgeschlossen" && req.user.role !== "admin") {
      return res
        .status(400)
        .json({ error: "Abend ist abgeschlossen – Bearbeitung nicht erlaubt" });
    }

    const entry = evening.games.id(gameEntryId);
    if (!entry) {
      return res.status(404).json({ error: "Spieleintrag nicht gefunden" });
    }

    if (scores !== undefined) {
      const validationError = validateScoresForParticipants(
        scores,
        evening.participantIds,
      );
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      entry.scores = scores;
    }
    if (notes !== undefined) entry.notes = notes;
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

    if (!(await requireEveningYear(req, res, evening, { activeOnly: true })))
      return;

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
      ...getEveningPhotoResponseFields(e),
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

    if (!(await requireEveningYear(req, res, evening, { activeOnly: true })))
      return;

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
  let uploadedPublicId = null;
  let photoSaved = false;

  try {
    if (!file) {
      return res.status(400).json({ error: "Bitte wähle ein Bild aus." });
    }

    const evening = await Evening.findOne(scopedFilter(req, { _id: id }));
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }
    if (!canModifyEveningPhoto(evening, req.user)) {
      return res.status(409).json({
        error:
          "Abendfotos können nur bei fixierten oder abgeschlossenen Abenden geändert werden. Bei gesperrten Abenden ist dies nur als Admin möglich.",
      });
    }
    if (!(await requireEveningYear(req, res, evening, { activeOnly: true })))
      return;

    const confirmsReplacement =
      req.body?.confirmReplacement === true ||
      req.body?.confirmReplacement === "true";
    if (
      (evening.groupPhotoPublicId || evening.groupPhotoUrl) &&
      !confirmsReplacement
    ) {
      return res.status(409).json({
        code: "PHOTO_REPLACEMENT_CONFIRMATION_REQUIRED",
        error: "Das bestehende Abendfoto wird ersetzt.",
      });
    }

    const previousPublicId = evening.groupPhotoPublicId;
    const result = await uploadEveningPhotoOriginal(file.path, id);
    uploadedPublicId = result.public_id;

    const presentation = buildEveningPhotoPresentation({
      publicId: result.public_id,
      version: result.version,
      format: result.format,
      width: result.width,
      height: result.height,
    });

    evening.groupPhotoUrl = presentation.url;
    evening.groupPhotoPublicId = result.public_id;
    evening.groupPhotoVersion = result.version;
    evening.groupPhotoFormat = result.format;
    evening.groupPhotoWidth = result.width;
    evening.groupPhotoHeight = result.height;
    evening.groupPhotoBytes = result.bytes;
    evening.groupPhotoOriginalFilename = String(file.originalname || "Abendfoto")
      .slice(0, 255);
    evening.groupPhotoUploadedAt = new Date();
    await evening.save();
    photoSaved = true;

    if (previousPublicId && previousPublicId !== result.public_id) {
      await removeEveningPhotoAsset(previousPublicId);
    }

    return res.json({
      message: previousPublicId
        ? "Abendfoto ersetzt"
        : "Abendfoto hochgeladen",
      groupPhotoUrl: presentation.url,
      groupPhotoSrcSet: presentation.srcSet,
      groupPhotoWidth: presentation.width,
      groupPhotoHeight: presentation.height,
    });
  } catch (error) {
    console.error("Fehler beim Hochladen des Abendfotos:", error);
    if (uploadedPublicId && !photoSaved) {
      await removeEveningPhotoAsset(uploadedPublicId);
    }
    return res.status(500).json({
      error: "Das Abendfoto konnte nicht hochgeladen werden.",
    });
  } finally {
    await removeTemporaryUpload(file);
  }
};

exports.deleteGroupPhoto = async (req, res) => {
  try {
    if (req.body?.confirmDeletion !== true) {
      return res.status(400).json({
        code: "PHOTO_DELETION_CONFIRMATION_REQUIRED",
        error: "Das Löschen des Abendfotos muss bestätigt werden.",
      });
    }

    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    );
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }
    if (!canModifyEveningPhoto(evening, req.user)) {
      return res.status(409).json({
        error:
          "Abendfotos können nur bei fixierten oder abgeschlossenen Abenden gelöscht werden. Bei gesperrten Abenden ist dies nur als Admin möglich.",
      });
    }
    if (!(await requireEveningYear(req, res, evening, { activeOnly: true })))
      return;
    if (!evening.groupPhotoPublicId && !evening.groupPhotoUrl) {
      return res.status(404).json({ error: "Kein Abendfoto vorhanden." });
    }

    const publicId = evening.groupPhotoPublicId;
    if (publicId) await deleteEveningPhoto(publicId);

    evening.groupPhotoUrl = undefined;
    evening.groupPhotoPublicId = undefined;
    evening.groupPhotoVersion = undefined;
    evening.groupPhotoFormat = undefined;
    evening.groupPhotoWidth = undefined;
    evening.groupPhotoHeight = undefined;
    evening.groupPhotoBytes = undefined;
    evening.groupPhotoOriginalFilename = undefined;
    evening.groupPhotoUploadedAt = undefined;
    await evening.save();

    return res.json({ message: "Abendfoto gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen des Abendfotos:", error);
    return res.status(500).json({
      error: "Das Abendfoto konnte nicht gelöscht werden.",
    });
  }
};

exports.getGroupPhotoOriginal = async (req, res) => {
  try {
    const evening = await Evening.findOne(
      scopedFilter(req, { _id: req.params.id }),
    );
    if (!evening) {
      return res.status(404).json({ error: "Abend nicht gefunden" });
    }
    if (!isEveningPhotoParticipant(evening, req.user)) {
      return res.status(403).json({
        error: "Das Original ist nur für Teilnehmer dieses Abends verfügbar.",
      });
    }

    const photoData = getEveningPhotoData(evening);
    const url = photoData
      ? buildOriginalPhotoUrl(photoData)
      : evening.groupPhotoUrl;
    if (!url) {
      return res.status(404).json({ error: "Kein Abendfoto vorhanden." });
    }

    return res.json({
      url,
      filename: evening.groupPhotoOriginalFilename || "Abendfoto",
      notice:
        "Der Link ist provisorisch nicht zugriffsgeschützt und darf nicht weitergegeben werden.",
    });
  } catch (error) {
    console.error("Fehler beim Laden des Abendfoto-Originals:", error);
    return res.status(500).json({
      error: "Das Original konnte nicht geladen werden.",
    });
  }
};
