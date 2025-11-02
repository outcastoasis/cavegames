const mongoose = require("mongoose");

const userStatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    spieljahr: { type: Number, required: true },
    totalPoints: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    eveningsAttended: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userStatSchema.index({ userId: 1, spieljahr: 1 }, { unique: true });

module.exports = mongoose.model("UserStat", userStatSchema);
