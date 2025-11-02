// models/Poll.js
const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const pollSchema = new mongoose.Schema(
  {
    eveningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Evening",
      required: true,
      unique: true, // nur 1 Umfrage pro Abend erlaubt
    },
    options: [optionSchema],
    finalizedOption: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Poll", pollSchema);
