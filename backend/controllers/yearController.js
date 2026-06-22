const Year = require("../models/Year");
const Evening = require("../models/Evening");
const UserStat = require("../models/UserStat"); // optional
const { rebuildUserStatsForYear } = require("../utils/stats");
const { scopedFilter } = require("../utils/testMode");

function getEveningLabel(evening) {
  const date = evening.date
    ? new Date(evening.date).toLocaleDateString("de-CH")
    : "Datum offen";
  return `${date} (${evening.status})`;
}

function validateYearClosing(evenings) {
  const blockers = [];
  const warnings = [];

  if (evenings.length === 0) {
    blockers.push({
      id: "year-empty",
      label: "Jahr ohne Abende",
      date: null,
      status: "leer",
      participantCount: 0,
      gamesCount: 0,
      issues: ["Keine Abende im Jahr vorhanden"],
      warnings: [],
    });
  }

  const eveningChecks = evenings.map((evening) => {
    const issues = [];
    const warningIssues = [];
    const participantIds = (evening.participantIds || []).map((id) =>
      id.toString()
    );

    if (evening.status !== "abgeschlossen") {
      issues.push("Abend ist noch nicht abgeschlossen");
    }

    if (participantIds.length === 0) {
      issues.push("Keine Teilnehmer erfasst");
    }

    if (!evening.games?.length) {
      issues.push("Keine Spiele erfasst");
    }

    (evening.games || []).forEach((game, gameIndex) => {
      const gameName = game.gameId?.name || `Spiel ${gameIndex + 1}`;
      const scores = game.scores || [];
      const scoreUserIds = new Set(
        scores
          .filter((score) => score.userId)
          .map((score) => score.userId.toString())
      );

      participantIds.forEach((participantId) => {
        if (!scoreUserIds.has(participantId)) {
          issues.push(`${gameName}: Score für Teilnehmer fehlt`);
        }
      });

      const invalidScore = scores.some(
        (score) =>
          score.points === null ||
          score.points === undefined ||
          !Number.isFinite(Number(score.points)) ||
          Number(score.points) < 0
      );
      if (invalidScore) {
        issues.push(`${gameName}: Ungültige Punkte erfasst`);
      }

      const allZero =
        scores.length > 0 && scores.every((score) => Number(score.points) === 0);
      if (allZero) {
        warningIssues.push(`${gameName}: Alle Punkte sind 0`);
      }
    });

    const check = {
      id: evening._id,
      label: getEveningLabel(evening),
      date: evening.date,
      status: evening.status,
      participantCount: participantIds.length,
      gamesCount: evening.games?.length || 0,
      issues,
      warnings: warningIssues,
    };

    if (issues.length) {
      blockers.push(check);
    }
    if (warningIssues.length) {
      warnings.push(check);
    }

    return check;
  });

  return {
    canClose: blockers.length === 0,
    summary: {
      eveningsTotal: evenings.length,
      blockersTotal: blockers.length,
      warningsTotal: warnings.length,
    },
    blockers,
    warnings,
    evenings: eveningChecks,
  };
}

exports.getYears = async (req, res) => {
  try {
    const years = await Year.find().sort({ year: -1 });
    res.json(years);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Jahre" });
  }
};

exports.createYear = async (req, res) => {
  try {
    const { year } = req.body;
    if (!year) return res.status(400).json({ error: "Jahr erforderlich" });

    const exists = await Year.findOne({ year });
    if (exists)
      return res.status(409).json({ error: "Jahr existiert bereits" });

    const newYear = new Year({ year });
    await newYear.save();
    res.status(201).json(newYear);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
};

exports.getYearDetails = async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const yearDoc = await Year.findOne({ year });
    if (!yearDoc) return res.status(404).json({ error: "Jahr nicht gefunden" });

    const evenings = await Evening.find(scopedFilter(req, { spieljahr: year }))
      .sort({ date: 1 })
      .populate("spielleiterId", "displayName")
      .populate("participantIds", "displayName");

    // Mapping wie in getEveningById
    const response = evenings.map((e) => ({
      ...e.toObject(),
      spielleiterRef: e.spielleiterId,
      participantRefs: e.participantIds,
    }));

    res.json({ year: yearDoc, evenings: response });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden des Jahres" });
  }
};

exports.getYearClosePreview = async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const yearDoc = await Year.findOne({ year });
    if (!yearDoc) return res.status(404).json({ error: "Jahr nicht gefunden" });

    const evenings = await Evening.find(scopedFilter(req, { spieljahr: year }))
      .sort({ date: 1, createdAt: 1 })
      .populate("games.gameId", "name");

    res.json({
      year: yearDoc,
      preview: validateYearClosing(evenings),
    });
  } catch (err) {
    res.status(500).json({ error: "Fehler bei der Abschluss-Vorschau" });
  }
};

exports.closeYear = async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const yearDoc = await Year.findOne({ year });
    if (!yearDoc) return res.status(404).json({ error: "Jahr nicht gefunden" });
    if (!req.isTestMode && yearDoc.closed)
      return res.status(400).json({ error: "Jahr ist bereits abgeschlossen" });

    const evenings = await Evening.find(scopedFilter(req, { spieljahr: year }))
      .sort({ date: 1, createdAt: 1 })
      .populate("games.gameId", "name");

    const preview = validateYearClosing(evenings);
    if (!preview.canClose) {
      return res.status(400).json({
        error:
          "Jahr kann nicht abgeschlossen werden. Bitte offene Punkte prüfen.",
        preview,
      });
    }

    // 🧊 Alle Abende als 'gesperrt' markieren
    await Evening.updateMany(
      scopedFilter(req, { spieljahr: year, status: "abgeschlossen" }),
      { $set: { status: "gesperrt" } }
    );

    // 🧮 Statistiken für dieses Jahr neu aufbauen
    await rebuildUserStatsForYear(year, { isTestData: req.isTestMode });

    if (!req.isTestMode) {
      yearDoc.closed = true;
      yearDoc.closedAt = new Date();
      await yearDoc.save();
    }

    res.json({
      message: req.isTestMode
        ? "Testjahr erfolgreich abgeschlossen"
        : "Jahr erfolgreich abgeschlossen",
      year: yearDoc,
    });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Abschliessen des Jahres" });
  }
};
