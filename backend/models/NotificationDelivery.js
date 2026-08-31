const mongoose = require("mongoose");
const {
  NOTIFICATION_CATEGORY_KEYS,
} = require("../utils/notificationPreferences");

const notificationDeliverySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: NOTIFICATION_CATEGORY_KEYS,
      required: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    periodKey: {
      type: String,
      required: true,
    },
    sentAt: Date,
  },
  { timestamps: true },
);

notificationDeliverySchema.index(
  { userId: 1, category: 1, entityId: 1, periodKey: 1 },
  { unique: true },
);
notificationDeliverySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 400 },
);

module.exports = mongoose.model(
  "NotificationDelivery",
  notificationDeliverySchema,
);
