// backend/utils/stats.js

const mongoose = require("mongoose");

/**
 * Statistiken aus einem Evening-Dokument berechnen.
 * Erwartet: Evening mit .games (inkl. scores.userId) und .participantIds
 */
async function calculateEveningStats(evening) {
  if (!evening.games?.length) return {};

  const playerPointsMap = {}; // userId → Punkte
  let maxPoints = 0;
  let totalPoints = 0;
  let placements = [];
  let gameNameSet = new Set(); // Set für gameId.name
  const gameCountMap = {}; // gameId → einmal zählen

  // === 1. Spiele & Punkte durchgehen ===
  for (const game of evening.games) {
    const gameIdStr = game.gameId?.toString?.() || null;

    if (gameIdStr && !gameCountMap[gameIdStr]) {
      gameCountMap[gameIdStr] = 1; // Nur einmal pro Abend zählen
    }

    game.scores.forEach((score) => {
      const uid = score.userId?.toString?.();
      if (!uid) return;

      const pts = score.points || 0;
      playerPointsMap[uid] = (playerPointsMap[uid] || 0) + pts;
      totalPoints += pts;

      if (pts > maxPoints) {
        maxPoints = pts;
      }
    });
  }

  // === 2. Gesamtpunkte sortieren (Platzierungen) ===
  const sortedPlayers = Object.entries(playerPointsMap)
    .map(([userId, points]) => ({ userId, points }))
    .sort((a, b) => b.points - a.points);

  // === 3. Platzierungen berechnen (mit Gleichstand) ===
  let currentPlace = 1;
  for (let i = 0; i < sortedPlayers.length && currentPlace <= 3; i++) {
    const p = sortedPlayers[i];
    if (i > 0 && p.points < sortedPlayers[i - 1].points) {
      currentPlace = placements.length + 1;
    }
    if (currentPlace <= 3) {
      placements.push({ userId: p.userId, place: currentPlace });
    }
  }

  // === 4. Tagessieger (alle mit höchstem Punktwert) ===
  const topPoints = sortedPlayers[0]?.points || 0;
  const winnerIds = sortedPlayers
    .filter((p) => p.points === topPoints)
    .map((p) => new mongoose.Types.ObjectId(p.userId));

  // === 5. Umwandlung Spielhäufigkeit ===
  const gameCount = Object.entries(gameCountMap).map(([gameId, count]) => ({
    gameId: new mongoose.Types.ObjectId(gameId),
    count,
  }));

  // === 6. Rückgabeobjekt ===
  return {
    winnerIds,
    maxPoints,
    totalPoints,
    placements,
    playerPoints: sortedPlayers.map((p) => ({
      userId: new mongoose.Types.ObjectId(p.userId),
      points: p.points,
    })),
    gameCount,
    participantCount: evening.participantIds.length,
    gamesPlayedCount: evening.games.length,
  };
}

module.exports = { calculateEveningStats };

