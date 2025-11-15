const mongoose = require("mongoose");

const scoreTrendEntry = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    points: { type: Number, default: 0 },
    eveningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Evening",
    },
  },
  { _id: false }
);

const placementTrendEntry = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    place: { type: Number, default: null },
    eveningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Evening",
    },
  },
  { _id: false }
);

const userStatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    spieljahr: { type: Number, required: true },

    // Basiskennzahlen
    totalPoints: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    eveningsAttended: { type: Number, default: 0 },
    totalPossibleEvenings: { type: Number, default: 0 },

    avgPoints: { type: Number, default: 0 },
    avgPlacement: { type: Number, default: 0 },

    bestEveningPoints: { type: Number, default: 0 },
    worstEveningPoints: { type: Number, default: 0 },

    winRate: { type: Number, default: 0 },
    attendanceRate: { type: Number, default: 0 },

    // Platzierungsverteilung
    firstPlaces: { type: Number, default: 0 },
    secondPlaces: { type: Number, default: 0 },
    thirdPlaces: { type: Number, default: 0 },
    otherPlaces: { type: Number, default: 0 },

    // Rollen
    spielleiterCount: { type: Number, default: 0 },

    // Streaks
    longestWinStreak: { type: Number, default: 0 },
    lastWinDate: { type: Date },
    longestAttendanceStreak: { type: Number, default: 0 },
    longestAbsenceStreak: { type: Number, default: 0 },

    // Peak Performance
    peakPerformance: { type: Number, default: 0 },

    // Trends für Diagramme
    scoreTrend: {
      type: [scoreTrendEntry],
      default: [],
    },
    placementTrend: {
      type: [placementTrendEntry],
      default: [],
    },
  },
  { timestamps: true }
);

userStatSchema.index({ userId: 1, spieljahr: 1 }, { unique: true });

module.exports = mongoose.model("UserStat", userStatSchema);
