const mongoose = require("mongoose");

const authSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    previousTokenHash: String,
    previousTokenValidUntil: Date,
    tokenVersion: {
      type: Number,
      required: true,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastUsedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    userAgent: {
      type: String,
      maxlength: 500,
    },
    ipAddress: {
      type: String,
      maxlength: 100,
    },
  },
  { timestamps: true },
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("AuthSession", authSessionSchema);
