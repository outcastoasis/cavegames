function normalizeId(value) {
  return value?._id?.toString?.() || value?.toString?.() || "";
}

function hasRecordedGames(evening) {
  return Boolean(evening?.games?.length);
}

function getParticipantScoreSummary(evening, userId) {
  const targetId = normalizeId(userId);
  let scoreEntries = 0;
  let totalPoints = 0;

  for (const game of evening?.games || []) {
    for (const score of game.scores || []) {
      if (normalizeId(score.userId) !== targetId) continue;
      scoreEntries += 1;
      totalPoints += Number(score.points) || 0;
    }
  }

  return { scoreEntries, totalPoints };
}

function addParticipantAndScores(evening, userId) {
  const targetId = normalizeId(userId);
  evening.participantIds.push(userId);

  let scoreEntriesAdded = 0;
  for (const game of evening.games || []) {
    const alreadyHasScore = (game.scores || []).some(
      (score) => normalizeId(score.userId) === targetId,
    );
    if (alreadyHasScore) continue;

    game.scores.push({ userId, points: 0 });
    scoreEntriesAdded += 1;
  }

  return { scoreEntriesAdded };
}

function removeParticipantAndScores(evening, userId) {
  const targetId = normalizeId(userId);
  const summary = getParticipantScoreSummary(evening, targetId);

  evening.participantIds = (evening.participantIds || []).filter(
    (id) => normalizeId(id) !== targetId,
  );

  for (const game of evening.games || []) {
    game.scores = (game.scores || []).filter(
      (score) => normalizeId(score.userId) !== targetId,
    );
  }

  return summary;
}

function validateScoresForParticipants(scores, participantIds) {
  if (!Array.isArray(scores)) {
    return "Punktestände müssen als Liste übermittelt werden.";
  }

  const expectedIds = new Set((participantIds || []).map(normalizeId));
  const submittedIds = new Set();

  for (const score of scores) {
    const userId = normalizeId(score?.userId);
    if (!userId || !expectedIds.has(userId)) {
      return "Punkte dürfen nur für aktuelle Teilnehmer erfasst werden.";
    }
    if (submittedIds.has(userId)) {
      return "Jeder Teilnehmer darf pro Spiel nur einen Punktestand haben.";
    }
    if (!Number.isFinite(Number(score.points)) || Number(score.points) < 0) {
      return "Punkte müssen eine Zahl grösser oder gleich 0 sein.";
    }
    submittedIds.add(userId);
  }

  if (submittedIds.size !== expectedIds.size) {
    return "Für jeden aktuellen Teilnehmer muss ein Punktestand vorhanden sein.";
  }

  return null;
}

module.exports = {
  addParticipantAndScores,
  getParticipantScoreSummary,
  hasRecordedGames,
  normalizeId,
  removeParticipantAndScores,
  validateScoresForParticipants,
};
