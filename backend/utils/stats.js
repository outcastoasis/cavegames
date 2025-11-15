// backend/utils/stats.js
const mongoose = require("mongoose");
const Evening = require("../models/Evening");
const UserStat = require("../models/UserStat");

/**
 * Berechnet alle finalen Abendstatistiken.
 * Erwartet ein Evening-Dokument mit:
 *  - .games   (Array mit gameId und scores)
 *  - .participantIds (Array der teilnehmenden User)
 */
function calculateEveningStats(evening) {
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

  const playerPointsMap = {};
  let totalPoints = 0;
  let maxPoints = 0;
  const gameCountMap = {};

  for (const game of evening.games) {
    let rawGameId = game.gameId?._id?.toString?.() || game.gameId?.toString?.();

    if (rawGameId && mongoose.Types.ObjectId.isValid(rawGameId)) {
      gameCountMap[rawGameId] = 1;
    }

    for (const score of game.scores || []) {
      const uid = score.userId?._id?.toString?.() || score.userId?.toString?.();
      if (!uid || !mongoose.Types.ObjectId.isValid(uid)) continue;

      const pts = Number(score.points) || 0;

      playerPointsMap[uid] = (playerPointsMap[uid] || 0) + pts;
      totalPoints += pts;
      if (pts > maxPoints) maxPoints = pts;
    }
  }

  const playerIds = Object.keys(playerPointsMap);
  if (!playerIds.length) {
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

  const sortedPlayers = playerIds
    .map((userId) => ({
      userId,
      points: playerPointsMap[userId],
    }))
    .sort((a, b) => b.points - a.points);

  const placements = [];
  let currentPlace = 1;

  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    if (i > 0 && player.points < sortedPlayers[i - 1].points) {
      currentPlace = placements.length + 1;
    }
    if (currentPlace <= 3) {
      placements.push({
        userId: player.userId,
        place: currentPlace,
      });
    } else break;
  }

  const highest = sortedPlayers[0].points;

  const winnerIds = sortedPlayers
    .filter((p) => p.points === highest)
    .map((p) =>
      mongoose.Types.ObjectId.isValid(p.userId)
        ? new mongoose.Types.ObjectId(p.userId)
        : null
    )
    .filter(Boolean);

  const gameCount = Object.entries(gameCountMap).map(([gameId, count]) => ({
    gameId: mongoose.Types.ObjectId.isValid(gameId)
      ? new mongoose.Types.ObjectId(gameId)
      : null,
    count,
  }));

  return {
    winnerIds,
    maxPoints,
    totalPoints,
    placements,
    playerPoints: sortedPlayers.map((p) => ({
      userId: mongoose.Types.ObjectId.isValid(p.userId)
        ? new mongoose.Types.ObjectId(p.userId)
        : null,
      points: p.points,
    })),
    gameCount,
    participantCount: evening.participantIds.length,
    gamesPlayedCount: evening.games.length,
  };
}

/**
 * Baut alle UserStat-Dokumente für ein Jahr komplett neu auf.
 * Nutzt die in Evening gespeicherten Abend-Statistiken.
 *
 * - geht alle Abende (abgeschlossen/gesperrt) im Jahr durch
 * - erstellt pro User eine Zeitreihe seiner Abende
 * - berechnet totalPoints, wins, streaks, best/worst usw.
 * - speichert alles in UserStat (upsert)
 */
async function rebuildUserStatsForYear(year) {
  if (!year) return;

  const evenings = await Evening.find({
    spieljahr: year,
    status: { $in: ["abgeschlossen", "gesperrt"] },
  }).sort({ date: 1, createdAt: 1 });

  // Vorherige Stats für dieses Jahr löschen (Full-Rebuild)
  await UserStat.deleteMany({ spieljahr: year });

  if (!evenings.length) {
    return;
  }

  const totalPossibleEvenings = evenings.length;

  // userId → [{ date, points, place, isWinner }]
  const userMap = new Map();

  for (const e of evenings) {
    const date = e.date || e.createdAt || new Date();

    const pointsByUser = new Map();
    (e.playerPoints || []).forEach((p) => {
      if (!p.userId) return;
      pointsByUser.set(p.userId.toString(), Number(p.points) || 0);
    });

    const placeByUser = new Map();
    (e.placements || []).forEach((pl) => {
      if (!pl.userId) return;
      placeByUser.set(pl.userId.toString(), pl.place);
    });

    const winnerSet = new Set((e.winnerIds || []).map((id) => id.toString()));

    (e.participantIds || []).forEach((uidObj) => {
      const uid = uidObj.toString();
      const points = pointsByUser.get(uid) ?? 0;
      const place = placeByUser.get(uid) ?? null;
      const isWinner = winnerSet.has(uid);

      if (!userMap.has(uid)) userMap.set(uid, []);
      userMap.get(uid).push({ date, points, place, isWinner });
    });
  }

  const bulkOps = [];

  for (const [userId, entries] of userMap.entries()) {
    // Chronologisch sortieren
    entries.sort((a, b) => a.date - b.date);

    const eveningsAttended = entries.length;
    const totalPoints = entries.reduce((sum, e) => sum + e.points, 0);
    const bestEveningPoints = Math.max(...entries.map((e) => e.points));
    const worstEveningPoints = Math.min(...entries.map((e) => e.points));
    const totalWins = entries.filter((e) => e.isWinner).length;
    const avgPoints = eveningsAttended ? totalPoints / eveningsAttended : 0;

    const secondPlaces = entries.filter((e) => e.place === 2).length;
    const thirdPlaces = entries.filter((e) => e.place === 3).length;

    // Win-Streak & letzte Sieg-Datum
    let longestWinStreak = 0;
    let currentStreak = 0;
    let lastWinDate = null;

    for (const e of entries) {
      if (e.isWinner) {
        currentStreak += 1;
        if (currentStreak > longestWinStreak) {
          longestWinStreak = currentStreak;
        }
        lastWinDate = e.date;
      } else {
        currentStreak = 0;
      }
    }

    const winRate = eveningsAttended
      ? Math.round((totalWins / eveningsAttended) * 100)
      : 0;

    bulkOps.push({
      updateOne: {
        filter: {
          userId: new mongoose.Types.ObjectId(userId),
          spieljahr: year,
        },
        update: {
          $set: {
            totalPoints,
            totalWins,
            eveningsAttended,
            avgPoints,
            longestWinStreak,
            lastWinDate,
            bestEveningPoints,
            worstEveningPoints,
            totalPossibleEvenings,
            secondPlaces,
            thirdPlaces,
            winRate,
          },
        },
        upsert: true,
      },
    });
  }

  if (bulkOps.length) {
    await UserStat.bulkWrite(bulkOps);
  }
}

module.exports = { calculateEveningStats, rebuildUserStatsForYear };
