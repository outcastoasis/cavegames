const Year = require("../models/Year");
const Evening = require("../models/Evening");
const UserStat = require("../models/UserStat"); // optional
const { rebuildUserStatsForYear } = require("../utils/stats");
const { scopedFilter } = require("../utils/testMode");

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

exports.closeYear = async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const yearDoc = await Year.findOne({ year });
    if (!yearDoc) return res.status(404).json({ error: "Jahr nicht gefunden" });
    if (!req.isTestMode && yearDoc.closed)
      return res.status(400).json({ error: "Jahr ist bereits abgeschlossen" });

    const evenings = await Evening.find(scopedFilter(req, { spieljahr: year }));

    const notDone = evenings.filter((e) => e.status !== "abgeschlossen");
    if (notDone.length > 0) {
      return res
        .status(400)
        .json({ error: "Nicht alle Abende sind abgeschlossen" });
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
