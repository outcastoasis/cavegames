const mongoose = require("mongoose");

const yearSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
    },
    closed: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.model("Year", yearSchema);
