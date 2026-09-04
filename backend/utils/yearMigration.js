const Evening = require("../models/Evening");
const Year = require("../models/Year");
const { YEAR_STATUSES } = require("./yearLifecycle");

async function normalizeLegacyYears() {
  await Year.collection.updateMany(
    { isTestData: { $exists: false } },
    { $set: { isTestData: false } },
  );

  await Year.collection.updateMany(
    { closed: true },
    { $set: { status: YEAR_STATUSES.CLOSED } },
  );
  const livePlanningMigration = await Year.collection.updateMany(
    {
      isTestData: { $ne: true },
      status: { $nin: Object.values(YEAR_STATUSES) },
    },
    { $set: { status: YEAR_STATUSES.PLANNED } },
  );
  const testPlanningMigration = await Year.collection.updateMany(
    {
      isTestData: true,
      status: { $nin: Object.values(YEAR_STATUSES) },
    },
    { $set: { status: YEAR_STATUSES.PLANNED } },
  );
  await Year.collection.updateMany({}, { $unset: { closed: "" } });

  return {
    live: livePlanningMigration.modifiedCount > 0,
    test: testPlanningMigration.modifiedCount > 0,
  };
}

async function restoreTestYearsFromEvenings() {
  const testYearNumbers = await Evening.distinct("spieljahr", {
    isTestData: true,
  });

  let createdPlannedYear = false;

  for (const year of testYearNumbers) {
    const testEvenings = await Evening.find({
      spieljahr: year,
      isTestData: true,
    }).select("status updatedAt");
    const inferredClosed =
      testEvenings.length > 0 &&
      testEvenings.every((evening) => evening.status === "gesperrt");

    if (!inferredClosed) {
      await Evening.updateMany(
        { spieljahr: year, isTestData: true, status: "gesperrt" },
        { $set: { status: "abgeschlossen" } },
      );
    }

    const latestUpdate = inferredClosed
      ? testEvenings.reduce(
          (latest, evening) =>
            evening.updatedAt > latest ? evening.updatedAt : latest,
          testEvenings[0].updatedAt,
        )
      : undefined;

    const update = inferredClosed
      ? {
          $set: {
            status: YEAR_STATUSES.CLOSED,
            closedAt: latestUpdate,
          },
          $unset: { activatedAt: "" },
        }
      : {
          $setOnInsert: {
            year,
            isTestData: true,
            status: YEAR_STATUSES.PLANNED,
          },
        };

    const result = await Year.updateOne({ year, isTestData: true }, update, {
      upsert: true,
    });
    if (!inferredClosed && result.upsertedCount > 0) {
      createdPlannedYear = true;
    }
  }

  return createdPlannedYear;
}

async function ensureInitialActiveYear(isTestData) {
  const scope = isTestData
    ? { isTestData: true }
    : { isTestData: { $ne: true } };
  const activeYear = await Year.findOne({
    ...scope,
    status: YEAR_STATUSES.ACTIVE,
  });
  if (activeYear) return;

  const candidate = await Year.findOne({
    ...scope,
    status: YEAR_STATUSES.PLANNED,
  }).sort({ year: -1 });
  if (!candidate) return;

  candidate.status = YEAR_STATUSES.ACTIVE;
  candidate.activatedAt = candidate.activatedAt || new Date();
  await candidate.save();
}

async function migrateYearScopes() {
  const migratedPlanningYears = await normalizeLegacyYears();

  // Entfernt den früheren globalen year-Unique-Index, bevor Testjahre ergänzt werden.
  await Year.syncIndexes();
  const restoredPlannedTestYear = await restoreTestYearsFromEvenings();

  // Nur die einmalige Migration bestimmt ein Startjahr automatisch. Danach
  // bleiben neue oder bewusst geplante Jahre bis zur manuellen Aktivierung so.
  if (migratedPlanningYears.live) {
    await ensureInitialActiveYear(false);
  }
  if (migratedPlanningYears.test || restoredPlannedTestYear) {
    await ensureInitialActiveYear(true);
  }
  await Year.syncIndexes();
}

module.exports = {
  ensureInitialActiveYear,
  migrateYearScopes,
  normalizeLegacyYears,
  restoreTestYearsFromEvenings,
};
