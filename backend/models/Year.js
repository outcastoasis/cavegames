const mongoose = require("mongoose");

const yearSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["planned", "active", "closed"],
      default: "planned",
      required: true,
      index: true,
    },
    activatedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    isTestData: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

yearSchema.index({ year: 1, isTestData: 1 }, { unique: true });
yearSchema.index(
  { isTestData: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
  },
);

module.exports = mongoose.model("Year", yearSchema);
