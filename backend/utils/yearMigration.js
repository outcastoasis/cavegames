const Evening = require("../models/Evening");
const Year = require("../models/Year");

async function migrateYearScopes() {
  await Year.collection.updateMany(
    { isTestData: { $exists: false } },
    { $set: { isTestData: false } },
  );

  await Year.syncIndexes();

  const testYearNumbers = await Evening.distinct("spieljahr", {
    isTestData: true,
  });

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

    await Year.updateOne(
      { year, isTestData: true },
      {
        $setOnInsert: {
          year,
          isTestData: true,
          closed: inferredClosed,
          closedAt: latestUpdate,
        },
      },
      { upsert: true },
    );
  }
}

module.exports = { migrateYearScopes };
