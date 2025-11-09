const mongoose = require("mongoose");

const userStatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    spieljahr: { type: Number, required: true },

    // Bestehende Felder
    totalPoints: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    eveningsAttended: { type: Number, default: 0 },
    avgPoints: { type: Number, default: 0 }, // Durchschnittspunkte
    longestWinStreak: { type: Number, default: 0 },
    lastWinDate: { type: Date },
    bestEveningPoints: { type: Number, default: 0 },
    worstEveningPoints: { type: Number, default: 0 },
    totalPossibleEvenings: { type: Number, default: 0 }, // Für Teilnahmequote
    secondPlaces: { type: Number, default: 0 },
    thirdPlaces: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userStatSchema.index({ userId: 1, spieljahr: 1 }, { unique: true });

module.exports = mongoose.model("UserStat", userStatSchema);
