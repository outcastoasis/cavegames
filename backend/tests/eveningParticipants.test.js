const test = require("node:test");
const assert = require("node:assert/strict");
const {
  addParticipantAndScores,
  getParticipantScoreSummary,
  hasRecordedGames,
  removeParticipantAndScores,
  validateScoresForParticipants,
} = require("../utils/eveningParticipants");
const { calculateEveningStats } = require("../utils/stats");

const userA = "64b000000000000000000001";
const userB = "64b000000000000000000002";

test("a participant roster is locked as soon as a game exists", () => {
  assert.equal(hasRecordedGames({ games: [] }), false);
  assert.equal(hasRecordedGames({ games: [{ scores: [] }] }), true);
});

test("removing a participant also removes all of their embedded scores", () => {
  const evening = {
    participantIds: [userA, userB],
    games: [
      {
        scores: [
          { userId: userA, points: 8 },
          { userId: userB, points: 3 },
        ],
      },
      {
        scores: [
          { userId: userA, points: 5 },
          { userId: userB, points: 7 },
        ],
      },
    ],
  };

  assert.deepEqual(getParticipantScoreSummary(evening, userA), {
    scoreEntries: 2,
    totalPoints: 13,
  });
  assert.deepEqual(removeParticipantAndScores(evening, userA), {
    scoreEntries: 2,
    totalPoints: 13,
  });
  assert.deepEqual(evening.participantIds, [userB]);
  assert.ok(
    evening.games.every(
      (game) =>
        game.scores.length === 1 && game.scores[0].userId === userB,
    ),
  );
});

test("adding a participant initializes a zero score in every existing game", () => {
  const evening = {
    participantIds: [userA],
    games: [{ scores: [{ userId: userA, points: 8 }] }, { scores: [] }],
  };

  assert.deepEqual(addParticipantAndScores(evening, userB), {
    scoreEntriesAdded: 2,
  });
  assert.deepEqual(evening.participantIds, [userA, userB]);
  assert.ok(
    evening.games.every((game) =>
      game.scores.some(
        (score) => score.userId === userB && score.points === 0,
      ),
    ),
  );
});

test("score updates must exactly match the current participant roster", () => {
  assert.equal(
    validateScoresForParticipants(
      [
        { userId: userA, points: 4 },
        { userId: userB, points: 6 },
      ],
      [userA, userB],
    ),
    null,
  );
  assert.match(
    validateScoresForParticipants(
      [{ userId: userA, points: 4 }],
      [userA, userB],
    ),
    /jeden aktuellen Teilnehmer/,
  );
  assert.match(
    validateScoresForParticipants(
      [
        { userId: userA, points: 4 },
        { userId: "64b000000000000000000003", points: 9 },
      ],
      [userA, userB],
    ),
    /nur für aktuelle Teilnehmer/,
  );
});

test("evening statistics ignore legacy scores of non-participants", () => {
  const stats = calculateEveningStats({
    participantIds: [userB],
    games: [
      {
        gameId: "64b000000000000000000010",
        scores: [
          { userId: userA, points: 100 },
          { userId: userB, points: 7 },
        ],
      },
    ],
  });

  assert.equal(stats.totalPoints, 7);
  assert.deepEqual(
    stats.playerPoints.map((score) => ({
      userId: score.userId.toString(),
      points: score.points,
    })),
    [{ userId: userB, points: 7 }],
  );
});
