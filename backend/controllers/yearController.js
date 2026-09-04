const Year = require("../models/Year");
const Evening = require("../models/Evening");
const Poll = require("../models/Poll");
const UserStat = require("../models/UserStat");
const { deleteEveningPhoto } = require("../services/eveningPhotoService");
const {
  calculateEveningStats,
  rebuildUserStatsForYear,
} = require("../utils/stats");
const { scopedFilter } = require("../utils/testMode");
const { validateYearClosing } = require("../utils/yearClosing");

function parseYear(value) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : null;
}

function getYearFilter(req, year) {
  return scopedFilter(req, { year });
}

async function loadClosingEvenings(req, year) {
  return Evening.find(scopedFilter(req, { spieljahr: year }))
    .sort({ date: 1, createdAt: 1 })
    .populate("games.gameId", "name");
}

exports.getYears = async (req, res) => {
  try {
    const [years, eveningSummary] = await Promise.all([
      Year.find(scopedFilter(req)).sort({ year: -1 }).lean(),
      Evening.aggregate([
        { $match: scopedFilter(req) },
        {
          $group: {
            _id: { year: "$spieljahr", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summaryByYear = new Map();
    eveningSummary.forEach((entry) => {
      const year = Number(entry._id.year);
      const summary = summaryByYear.get(year) || {
        eveningsTotal: 0,
        statusCounts: {
          offen: 0,
          fixiert: 0,
          abgeschlossen: 0,
          gesperrt: 0,
        },
      };
      summary.statusCounts[entry._id.status] = entry.count;
      summary.eveningsTotal += entry.count;
      summaryByYear.set(year, summary);
    });

    res.json(
      years.map((year) => ({
        ...year,
        ...(summaryByYear.get(year.year) || {
          eveningsTotal: 0,
          statusCounts: {
            offen: 0,
            fixiert: 0,
            abgeschlossen: 0,
            gesperrt: 0,
          },
        }),
      })),
    );
  } catch (error) {
    console.error("Fehler beim Laden der Jahre:", error);
    res.status(500).json({ error: "Fehler beim Laden der Jahre" });
  }
};

exports.createYear = async (req, res) => {
  try {
    const year = parseYear(req.body.year);
    if (!year) {
      return res.status(400).json({ error: "Gültiges Jahr erforderlich" });
    }

    const exists = await Year.findOne(getYearFilter(req, year));
    if (exists) {
      return res.status(409).json({ error: "Jahr existiert bereits" });
    }

    const newYear = await Year.create({
      year,
      isTestData: req.isTestMode,
    });
    return res.status(201).json(newYear);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: "Jahr existiert bereits" });
    }
    console.error("Fehler beim Erstellen des Jahres:", error);
    return res.status(500).json({ error: "Fehler beim Erstellen" });
  }
};

exports.getYearDetails = async (req, res) => {
  try {
    const year = parseYear(req.params.year);
    if (!year) return res.status(400).json({ error: "Ungültiges Jahr" });

    const yearDoc = await Year.findOne(getYearFilter(req, year));
    if (!yearDoc) return res.status(404).json({ error: "Jahr nicht gefunden" });

    const evenings = await Evening.find(scopedFilter(req, { spieljahr: year }))
      .sort({ date: 1, createdAt: 1 })
      .populate("spielleiterId", "displayName profileImageUrl")
      .populate("participantIds", "displayName profileImageUrl")
      .populate("games.gameId", "name");

    const response = evenings.map((evening) => ({
      ...evening.toObject(),
      spielleiterRef: evening.spielleiterId,
      participantRefs: evening.participantIds,
    }));

    return res.json({ year: yearDoc, evenings: response });
  } catch (error) {
    console.error("Fehler beim Laden des Jahres:", error);
    return res.status(500).json({ error: "Fehler beim Laden des Jahres" });
  }
};

exports.getYearClosePreview = async (req, res) => {
  try {
    const year = parseYear(req.params.year);
    if (!year) return res.status(400).json({ error: "Ungültiges Jahr" });

    const yearDoc = await Year.findOne(getYearFilter(req, year));
    if (!yearDoc) return res.status(404).json({ error: "Jahr nicht gefunden" });
    if (yearDoc.closed) {
      return res.status(400).json({ error: "Jahr ist bereits abgeschlossen" });
    }

    const evenings = await loadClosingEvenings(req, year);
    return res.json({
      year: yearDoc,
      preview: validateYearClosing(evenings),
    });
  } catch (error) {
    console.error("Fehler bei der Abschluss-Vorschau:", error);
    return res
      .status(500)
      .json({ error: "Fehler bei der Abschluss-Vorschau" });
  }
};

exports.closeYear = async (req, res) => {
  let year = null;
  let eveningsLocked = false;

  try {
    year = parseYear(req.params.year);
    if (!year) return res.status(400).json({ error: "Ungültiges Jahr" });

    const yearDoc = await Year.findOne(getYearFilter(req, year));
    if (!yearDoc) return res.status(404).json({ error: "Jahr nicht gefunden" });
    if (yearDoc.closed) {
      return res.status(400).json({ error: "Jahr ist bereits abgeschlossen" });
    }

    const evenings = await loadClosingEvenings(req, year);
    const preview = validateYearClosing(evenings);
    if (!preview.canClose) {
      return res.status(400).json({
        error: "Jahr kann noch nicht abgeschlossen werden.",
        preview,
      });
    }

    const operations = evenings.map((evening) => {
      const stats = calculateEveningStats(evening);
      return {
        updateOne: {
          filter: scopedFilter(req, { _id: evening._id }),
          update: { $set: { ...stats, status: "gesperrt" } },
        },
      };
    });

    if (operations.length) await Evening.bulkWrite(operations);
    eveningsLocked = true;

    await rebuildUserStatsForYear(year, { isTestData: req.isTestMode });

    yearDoc.closed = true;
    yearDoc.closedAt = new Date();
    await yearDoc.save();

    return res.json({
      message: req.isTestMode
        ? "Testjahr erfolgreich abgeschlossen"
        : "Jahr erfolgreich abgeschlossen",
      year: yearDoc,
    });
  } catch (error) {
    if (eveningsLocked && year) {
      try {
        await Evening.updateMany(
          scopedFilter(req, { spieljahr: year, status: "gesperrt" }),
          { $set: { status: "abgeschlossen" } },
        );
      } catch (rollbackError) {
        console.error("Rollback des Jahresabschlusses fehlgeschlagen:", rollbackError);
      }
    }
    console.error("Fehler beim Abschliessen des Jahres:", error);
    return res
      .status(500)
      .json({ error: "Fehler beim Abschliessen des Jahres" });
  }
};

exports.deleteYear = async (req, res) => {
  try {
    const year = parseYear(req.params.year);
    if (!year) return res.status(400).json({ error: "Ungültiges Jahr" });

    const yearDoc = await Year.findOne(getYearFilter(req, year));
    if (!yearDoc) return res.status(404).json({ error: "Jahr nicht gefunden" });

    const evenings = await Evening.find(
      scopedFilter(req, { spieljahr: year }),
    ).select("_id groupPhotoPublicId");
    const eveningIds = evenings.map((evening) => evening._id);

    await Promise.all([
      Poll.deleteMany(
        scopedFilter(req, { eveningId: { $in: eveningIds } }),
      ),
      UserStat.deleteMany(scopedFilter(req, { spieljahr: year })),
    ]);
    await Evening.deleteMany(scopedFilter(req, { spieljahr: year }));
    await Year.deleteOne(getYearFilter(req, year));

    const photoResults = await Promise.allSettled(
      evenings
        .map((evening) => evening.groupPhotoPublicId)
        .filter(Boolean)
        .map((publicId) => deleteEveningPhoto(publicId)),
    );
    const failedPhotos = photoResults.filter(
      (result) => result.status === "rejected",
    ).length;
    if (failedPhotos) {
      console.error(
        `${failedPhotos} Gruppenfoto-Datei(en) konnten beim Löschen des Jahres nicht entfernt werden.`,
      );
    }

    return res.json({
      message: `Jahr ${year} und ${evenings.length} Abend${
        evenings.length === 1 ? "" : "e"
      } gelöscht`,
      deletedEvenings: evenings.length,
    });
  } catch (error) {
    console.error("Fehler beim Löschen des Jahres:", error);
    return res.status(500).json({ error: "Jahr konnte nicht gelöscht werden" });
  }
};
