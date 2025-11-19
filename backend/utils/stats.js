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

  await UserStat.deleteMany({ spieljahr: year });

  if (!evenings.length) return;

  const totalPossibleEvenings = evenings.length;

  // userId → [{date, points, place, isWinner, isSpielleiter}]
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
      const isSpielleiter = e.spielleiterId?.toString() === uid ? true : false;

      if (!userMap.has(uid)) userMap.set(uid, []);
      userMap.get(uid).push({
        date,
        points,
        place,
        isWinner,
        isSpielleiter,
        eveningId: e._id,
      });
    });
  }

  const bulkOps = [];

  for (const [userId, entries] of userMap.entries()) {
    entries.sort((a, b) => a.date - b.date);

    const eveningsAttended = entries.length;
    const totalPoints = entries.reduce((sum, e) => sum + e.points, 0);
    const bestEveningPoints = Math.max(...entries.map((e) => e.points));
    const worstEveningPoints = Math.min(...entries.map((e) => e.points));

    const totalWins = entries.filter((e) => e.isWinner).length;
    const avgPoints = eveningsAttended ? totalPoints / eveningsAttended : 0;

    const secondPlaces = entries.filter((e) => e.place === 2).length;
    const thirdPlaces = entries.filter((e) => e.place === 3).length;

    const firstPlaces = entries.filter((e) => e.place === 1).length;
    const otherPlaces = entries.filter(
      (e) => e.place !== 1 && e.place !== 2 && e.place !== 3
    ).length;

    console.log("=== DEBUG USER ===");
    console.log("User:", userId);
    console.log("Entries:", entries);
    console.log(
      "Valid Places:",
      entries.filter((e) => e.place != null)
    );

    // Durchschnittliche Platzierung (nur gültige Plätze)
    const validPlaces = entries.filter((e) => e.place != null);
    const averagePlacement = validPlaces.length
      ? validPlaces.reduce((s, e) => s + e.place, 0) / validPlaces.length
      : null;

    console.log("=> averagePlacement:", averagePlacement);

    // Score-Trend / Platzierungs-Trend
    const scoreTrend = entries.map((e) => ({
      date: e.date,
      points: e.points,
      eveningId: e.eveningId,
    }));

    const placementTrend = entries.map((e) => ({
      date: e.date,
      place: e.place ?? null,
      eveningId: e.eveningId,
    }));

    // Teilnahmequote
    const attendanceRate = totalPossibleEvenings
      ? Math.round((eveningsAttended / totalPossibleEvenings) * 100)
      : 0;

    // Spielleiterrolle-Anzahl
    const spielleiterCount = entries.filter((e) => e.isSpielleiter).length;

    // Peak Performance: Durchschnitt der besten 3 Abende
    const top3 = [...entries].sort((a, b) => b.points - a.points).slice(0, 3);
    const peakPerformance =
      top3.length > 0
        ? Math.round(top3.reduce((sum, e) => sum + e.points, 0) / top3.length)
        : 0;

    // **Teilnahme-Streak**
    let longestAttendanceStreak = 0;
    let currentAttendanceStreak = 0;

    // **Abwesenheits-Streak**
    let longestAbsenceStreak = 0;
    let currentAbsenceStreak = 0;

    // Wir simulieren jedes Event, unabhängig ob User teilnimmt oder nicht.
    // Dazu brauchen wir eine Map aller Dates im Jahr.
    const datesAll = evenings.map((e) => e.date.toISOString());
    const datesUser = new Set(entries.map((e) => e.date.toISOString()));

    for (const d of datesAll) {
      if (datesUser.has(d)) {
        currentAttendanceStreak++;
        longestAttendanceStreak = Math.max(
          longestAttendanceStreak,
          currentAttendanceStreak
        );
        currentAbsenceStreak = 0;
      } else {
        currentAbsenceStreak++;
        longestAbsenceStreak = Math.max(
          longestAbsenceStreak,
          currentAbsenceStreak
        );
        currentAttendanceStreak = 0;
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

            bestEveningPoints,
            worstEveningPoints,
            totalPossibleEvenings,

            secondPlaces,
            thirdPlaces,
            firstPlaces,
            otherPlaces,
            averagePlacement,

            winRate,
            attendanceRate,

            longestAttendanceStreak,
            longestAbsenceStreak,

            spielleiterCount,

            peakPerformance,

            scoreTrend,
            placementTrend,
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
