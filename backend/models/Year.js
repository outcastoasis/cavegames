const mongoose = require("mongoose");

const yearSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
      unique: true,
    },
    closed: {
      type: Boolean,
      default: false,
    },
    closedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Year", yearSchema);
