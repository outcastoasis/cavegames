const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game" },
  scores: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      points: { type: Number, required: true },
    },
  ],
  notes: String,
});

const eveningSchema = new mongoose.Schema(
  {
    date: { type: Date },
    spieljahr: { type: Number, required: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    spielleiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pollId: { type: mongoose.Schema.Types.ObjectId, ref: "Poll" },
    status: {
      type: String,
      enum: ["offen", "fixiert", "abgeschlossen", "gesperrt"],
      default: "offen",
    },
    games: [gameSchema],
    groupPhotoUrl: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Evening", eveningSchema);
