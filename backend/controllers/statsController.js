// backend/controllers/statsController.js
const Evening = require("../models/Evening");
const User = require("../models/User");
const Game = require("../models/Game");
const UserStat = require("../models/UserStat");
const { rebuildUserStatsForYear } = require("../utils/stats");

/**
 * 🔢 Leaderboard für ein Jahr
 * GET /api/stats/leaderboard?year=2025
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    if (!year) return res.status(400).json({ error: "Year erforderlich" });

    let stats = await UserStat.find({ spieljahr: year })
      .populate("userId", "displayName")
      .sort({ totalPoints: -1 });

    // Falls noch keine Stats existieren → neu aufbauen
    if (!stats.length) {
      await rebuildUserStatsForYear(year);
      stats = await UserStat.find({ spieljahr: year })
        .populate("userId", "displayName")
        .sort({ totalPoints: -1 });
    }

    const result = stats.map((s, index) => ({
      rank: index + 1,
      userId: s.userId._id,
      name: s.userId.displayName,
      totalPoints: s.totalPoints,
      totalWins: s.totalWins,
      eveningsAttended: s.eveningsAttended,
      avgPoints: s.avgPoints,
      winRate:
        s.totalWins && s.eveningsAttended
          ? Math.round((s.totalWins / s.eveningsAttended) * 100)
          : 0,
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ Fehler in getLeaderboard:", err.message);
    res.status(500).json({ error: "Fehler beim Laden der Rangliste" });
  }
};

/**
 * 🧑 Einzelne User-Statistik pro Jahr
 * GET /api/stats/user/:userId?year=2025
 */
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const year = parseInt(req.query.year);
    if (!year) return res.status(400).json({ error: "Jahr erforderlich" });

    let stat = await UserStat.findOne({ userId, spieljahr: year });

    // Falls noch nichts existiert → Stats für Jahr aufbauen und erneut versuchen
    if (!stat) {
      await rebuildUserStatsForYear(year);
      stat = await UserStat.findOne({ userId, spieljahr: year });
      if (!stat)
        return res.status(404).json({ error: "Keine Statistik gefunden" });
    }

    res.json(stat);
  } catch (err) {
    console.error("❌ Fehler in getUserStats:", err.message);
    res.status(500).json({ error: "Fehler beim Abrufen der Statistik" });
  }
};

/**
 * 📅 Abend-Statistiken pro Jahr
 * GET /api/stats/evenings?year=2025
 */
exports.getEveningStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    if (!year) return res.status(400).json({ error: "Jahr erforderlich" });

    const evenings = await Evening.find({
      spieljahr: year,
      status: "gesperrt",
    });

    const totalEvenings = evenings.length;
    const totalParticipants = evenings.reduce(
      (sum, e) => sum + (e.participantIds?.length || 0),
      0
    );
    const totalPoints = evenings.reduce(
      (sum, e) => sum + (e.totalPoints || 0),
      0
    );
    const maxPoints = Math.max(...evenings.map((e) => e.maxPoints || 0));
    const mostParticipants = Math.max(
      ...evenings.map((e) => e.participantIds?.length || 0)
    );

    const organizerMap = {};
    evenings.forEach((e) => {
      const orgId = e.organizerId?.toString();
      if (orgId) organizerMap[orgId] = (organizerMap[orgId] || 0) + 1;
    });

    res.json({
      totalEvenings,
      avgParticipants: totalEvenings
        ? Math.round(totalParticipants / totalEvenings)
        : 0,
      avgPoints: totalEvenings ? Math.round(totalPoints / totalEvenings) : 0,
      maxPoints,
      mostParticipants,
      organizers: organizerMap,
    });
  } catch (err) {
    console.error("❌ Fehler in getEveningStats:", err.message);
    res.status(500).json({ error: "Fehler beim Abrufen der Abendstatistik" });
  }
};

/**
 * 🎲 Spielstatistik
 * GET /api/stats/games?year=2025
 */
exports.getGameStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year);

    const evenings = await Evening.find(
      year ? { spieljahr: year, status: "gesperrt" } : { status: "gesperrt" }
    );

    const gameCountMap = {};
    evenings.forEach((e) => {
      e.games?.forEach((g) => {
        const id = g.gameId?.toString();
        if (id) gameCountMap[id] = (gameCountMap[id] || 0) + 1;
      });
    });

    const gameIds = Object.keys(gameCountMap);
    const gameDocs = await Game.find({ _id: { $in: gameIds } });

    const stats = gameDocs.map((g) => ({
      gameId: g._id,
      name: g.name,
      category: g.category,
      timesPlayed: gameCountMap[g._id.toString()] || 0,
    }));

    stats.sort((a, b) => b.timesPlayed - a.timesPlayed);

    res.json(stats);
  } catch (err) {
    console.error("❌ Fehler in getGameStats:", err.message);
    res.status(500).json({ error: "Fehler beim Abrufen der Spielstatistik" });
  }
};
