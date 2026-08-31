const mongoose = require("mongoose");
const {
  NOTIFICATION_CATEGORIES,
} = require("../utils/notificationPreferences");

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    ...Object.fromEntries(
      Object.entries(NOTIFICATION_CATEGORIES).map(([key, defaultValue]) => [
        key,
        { type: Boolean, default: defaultValue },
      ]),
    ),
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "NotificationPreference",
  notificationPreferenceSchema,
);
