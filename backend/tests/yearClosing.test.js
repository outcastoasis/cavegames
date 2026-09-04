const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Evening = require("../models/Evening");
const UserStat = require("../models/UserStat");
const {
  calculateEveningStats,
  rebuildUserStatsForYear,
} = require("../utils/stats");
const { validateYearClosing } = require("../utils/yearClosing");

const userA = new mongoose.Types.ObjectId("64b000000000000000000001");
const userB = new mongoose.Types.ObjectId("64b000000000000000000002");
const gameA = new mongoose.Types.ObjectId("64b000000000000000000010");

function validEvening(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    date: new Date("2026-08-14T17:30:00.000Z"),
    status: "abgeschlossen",
    participantIds: [userA, userB],
    games: [
      {
        gameId: { _id: gameA, name: "Testspiel" },
        scores: [
          { userId: userA, points: 12 },
          { userId: userB, points: 8 },
        ],
      },
    ],
    ...overrides,
  };
}

test("an empty year cannot be closed", () => {
  const preview = validateYearClosing([]);

  assert.equal(preview.canClose, false);
  assert.equal(preview.summary.blockersTotal, 1);
  assert.match(preview.blockers[0].issues[0], /Keine Abende/);
});

test("every evening must be completed before a year can be closed", () => {
  for (const status of ["offen", "fixiert", "gesperrt"]) {
    const preview = validateYearClosing([validEvening({ status })]);
    assert.equal(preview.canClose, false);
    assert.ok(
      preview.blockers[0].issues.includes(
        "Abend ist noch nicht abgeschlossen",
      ),
    );
  }
});

test("missing dates, games and participant scores block closing", () => {
  const preview = validateYearClosing([
    validEvening({
      date: null,
      games: [{ gameId: { _id: gameA, name: "Testspiel" }, scores: [] }],
    }),
  ]);

  assert.equal(preview.canClose, false);
  assert.ok(preview.blockers[0].issues.includes("Kein gültiger Termin vorhanden"));
  assert.ok(
    preview.blockers[0].issues.some((issue) =>
      issue.includes("Score für Teilnehmer fehlt"),
    ),
  );
});

test("a complete year is accepted and zero scores remain a warning", () => {
  const regularPreview = validateYearClosing([validEvening()]);
  assert.equal(regularPreview.canClose, true);
  assert.equal(regularPreview.summary.blockersTotal, 0);

  const zeroPreview = validateYearClosing([
    validEvening({
      games: [
        {
          gameId: { _id: gameA, name: "Testspiel" },
          scores: [
            { userId: userA, points: 0 },
            { userId: userB, points: 0 },
          ],
        },
      ],
    }),
  ]);
  assert.equal(zeroPreview.canClose, true);
  assert.equal(zeroPreview.summary.warningsTotal, 1);
});

test("evening statistics sum points and count repeated games correctly", () => {
  const evening = validEvening({
    games: [
      {
        gameId: gameA,
        scores: [
          { userId: userA, points: 10 },
          { userId: userB, points: 5 },
        ],
      },
      {
        gameId: gameA,
        scores: [
          { userId: userA, points: 4 },
          { userId: userB, points: 11 },
        ],
      },
    ],
  });
  const stats = calculateEveningStats(evening);

  assert.equal(stats.totalPoints, 30);
  assert.equal(stats.gamesPlayedCount, 2);
  assert.deepEqual(
    stats.playerPoints.map((entry) => ({
      userId: entry.userId.toString(),
      points: entry.points,
    })),
    [
      { userId: userA.toString(), points: 14 },
      { userId: userB.toString(), points: 16 },
    ].sort((first, second) => second.points - first.points),
  );
  assert.deepEqual(
    stats.gameCount.map((entry) => ({
      gameId: entry.gameId.toString(),
      count: entry.count,
    })),
    [{ gameId: gameA.toString(), count: 2 }],
  );
  assert.deepEqual(
    stats.winnerIds.map((id) => id.toString()),
    [userB.toString()],
  );
});

test("test-year statistics are rebuilt inside the test-data scope", async () => {
  const originalFind = Evening.find;
  const originalDeleteMany = UserStat.deleteMany;
  const originalBulkWrite = UserStat.bulkWrite;
  let findFilter;
  let deleteFilter;
  let bulkOperations;

  Evening.find = (filter) => {
    findFilter = filter;
    return {
      sort: async () => [
        {
          _id: new mongoose.Types.ObjectId(),
          date: new Date("2026-08-14T17:30:00.000Z"),
          spieljahr: 2026,
          spielleiterId: userA,
          participantIds: [userA, userB],
          playerPoints: [
            { userId: userA, points: 12 },
            { userId: userB, points: 8 },
          ],
          placements: [
            { userId: userA, place: 1 },
            { userId: userB, place: 2 },
          ],
          winnerIds: [userA],
        },
      ],
    };
  };
  UserStat.deleteMany = async (filter) => {
    deleteFilter = filter;
  };
  UserStat.bulkWrite = async (operations) => {
    bulkOperations = operations;
  };

  try {
    await rebuildUserStatsForYear(2026, { isTestData: true });
  } finally {
    Evening.find = originalFind;
    UserStat.deleteMany = originalDeleteMany;
    UserStat.bulkWrite = originalBulkWrite;
  }

  assert.equal(findFilter.isTestData, true);
  assert.equal(deleteFilter.isTestData, true);
  assert.equal(bulkOperations.length, 2);
  assert.ok(
    bulkOperations.every(
      (operation) =>
        operation.updateOne.filter.isTestData === true &&
        operation.updateOne.update.$set.isTestData === true,
    ),
  );
});
