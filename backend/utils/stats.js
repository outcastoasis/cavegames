// backend/utils/stats.js
const mongoose = require("mongoose");

/**
 * Berechnet alle finalen Abendstatistiken.
 * Erwartet ein Evening-Dokument mit:
 *  - .games   (Array mit gameId und scores)
 *  - .participantIds (Array der teilnehmenden User)
 */
function calculateEveningStats(evening) {
  // Keine Spiele → keine Statistiken
  if (!evening?.games?.length) {
    return {
      winnerIds: [],
      maxPoints: 0,
      totalPoints: 0,
      placements: [],
      playerPoints: [],
      gameCount: [],
      participantCount: evening?.participantIds?.length || 0,
      gamesPlayedCount: 0,
    };
  }

  // ==============================
  // 1. Punkte sammeln
  // ==============================
  const playerPointsMap = {}; // userId → Gesamtpunkte
  let totalPoints = 0;
  let maxPoints = 0;
  const gameCountMap = {}; // gameId → 1 (einmal pro Abend zählen)

  for (const game of evening.games) {
    const gameIdStr = game.gameId?.toString?.();
    if (gameIdStr) {
      // Jedes Spiel zählt nur 1x pro Abend
      gameCountMap[gameIdStr] = 1;
    }

    for (const score of game.scores || []) {
      const uid = score.userId?.toString?.();
      if (!uid) continue; // Ignoriere kaputte Scores (z. B. gelöschter User)

      const pts = Number(score.points) || 0;

      // Punkte aufsummieren
      playerPointsMap[uid] = (playerPointsMap[uid] || 0) + pts;
      totalPoints += pts;

      // höchste Einzelpunktzahl merken
      if (pts > maxPoints) maxPoints = pts;
    }
  }

  // Wenn keine gültigen Scores existieren
  const playerIds = Object.keys(playerPointsMap);
  if (playerIds.length === 0) {
    return {
      winnerIds: [],
      maxPoints: 0,
      totalPoints: 0,
      placements: [],
      playerPoints: [],
      gameCount: [],
      participantCount: evening.participantIds.length,
      gamesPlayedCount: evening.games.length,
    };
  }

  // ==============================
  // 2. Sortierung nach Gesamtpunkten
  // ==============================
  const sortedPlayers = playerIds
    .map((userId) => ({
      userId,
      points: playerPointsMap[userId],
    }))
    .sort((a, b) => b.points - a.points);

  // ==============================
  // 3. Platzierungen (mit Gleichständen)
  // ==============================
  const placements = [];
  let currentPlace = 1;

  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];

    // Wenn Punkte niedriger als beim vorherigen → neuer Platzwert
    if (i > 0 && player.points < sortedPlayers[i - 1].points) {
      currentPlace = placements.length + 1;
    }

    // Nur Top-3 speichern
    if (currentPlace <= 3) {
      placements.push({
        userId: player.userId,
        place: currentPlace,
      });
    } else break;
  }

  // ==============================
  // 4. Tagessieger (alle mit Höchstpunktzahl)
  // ==============================
  const highest = sortedPlayers[0].points;
  const winnerIds = sortedPlayers
    .filter((p) => p.points === highest)
    .map((p) => new mongoose.Types.ObjectId(p.userId));

  // ==============================
  // 5. Spiele-Anzahl pro Abend
  // ==============================
  const gameCount = Object.entries(gameCountMap).map(([gameId, count]) => ({
    gameId: new mongoose.Types.ObjectId(gameId),
    count,
  }));

  // ==============================
  // 6. Endgültiges Ergebnisobjekt
  // ==============================
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
