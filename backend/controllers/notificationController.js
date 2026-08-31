const PushSubscription = require("../models/PushSubscription");
const NotificationPreference = require("../models/NotificationPreference");
const {
  getPushConfiguration,
} = require("../services/pushNotificationService");
const {
  normalizeNotificationPreferences,
  validateNotificationPreferenceUpdate,
} = require("../utils/notificationPreferences");

const MAX_ENDPOINT_LENGTH = 2048;
const MAX_KEY_LENGTH = 512;

function validateSubscription(subscription) {
  if (!subscription || typeof subscription !== "object") {
    return "Push-Abonnement fehlt.";
  }

  const { endpoint, keys } = subscription;
  if (
    typeof endpoint !== "string" ||
    endpoint.length > MAX_ENDPOINT_LENGTH ||
    !endpoint.startsWith("https://")
  ) {
    return "Ungültiger Push-Endpunkt.";
  }

  if (
    typeof keys?.p256dh !== "string" ||
    !keys.p256dh ||
    keys.p256dh.length > MAX_KEY_LENGTH ||
    typeof keys?.auth !== "string" ||
    !keys.auth ||
    keys.auth.length > MAX_KEY_LENGTH
  ) {
    return "Ungültige Push-Schlüssel.";
  }

  return null;
}

exports.getPublicKey = (req, res) => {
  const config = getPushConfiguration();
  if (!config.configured) {
    return res.status(503).json({
      error:
        "Push-Benachrichtigungen sind auf dem Server noch nicht konfiguriert.",
    });
  }

  return res.json({ publicKey: config.publicKey });
};

exports.saveSubscription = async (req, res) => {
  const subscription = req.body?.subscription;
  const validationError = validateSubscription(subscription);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const saved = await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: {
          userId: req.user._id,
          expirationTime: subscription.expirationTime ?? null,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
          userAgent: String(req.get("user-agent") || "").slice(0, 500),
          lastSeenAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(201).json({
      enabled: true,
      subscriptionId: saved._id,
    });
  } catch (error) {
    console.error(
      "Push-Abonnement konnte nicht gespeichert werden:",
      error.message,
    );
    return res.status(500).json({
      error: "Push-Abonnement konnte nicht gespeichert werden.",
    });
  }
};

exports.removeSubscription = async (req, res) => {
  const endpoint = req.body?.endpoint;
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    endpoint.length > MAX_ENDPOINT_LENGTH
  ) {
    return res.status(400).json({ error: "Ungültiger Push-Endpunkt." });
  }

  try {
    await PushSubscription.deleteOne({
      endpoint,
      userId: req.user._id,
    });
    return res.json({ enabled: false });
  } catch (error) {
    console.error(
      "Push-Abonnement konnte nicht entfernt werden:",
      error.message,
    );
    return res.status(500).json({
      error: "Push-Abonnement konnte nicht entfernt werden.",
    });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const preferences = await NotificationPreference.findOne({
      userId: req.user._id,
    }).lean();
    return res.json(normalizeNotificationPreferences(preferences));
  } catch (error) {
    console.error(
      "Benachrichtigungseinstellungen konnten nicht geladen werden:",
      error.message,
    );
    return res.status(500).json({
      error: "Benachrichtigungseinstellungen konnten nicht geladen werden.",
    });
  }
};

exports.updatePreferences = async (req, res) => {
  const validationError = validateNotificationPreferenceUpdate(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const preferences = await NotificationPreference.findOneAndUpdate(
      { userId: req.user._id },
      { $set: req.body },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    return res.json(normalizeNotificationPreferences(preferences));
  } catch (error) {
    console.error(
      "Benachrichtigungseinstellungen konnten nicht gespeichert werden:",
      error.message,
    );
    return res.status(500).json({
      error: "Benachrichtigungseinstellungen konnten nicht gespeichert werden.",
    });
  }
};

module.exports.validateSubscription = validateSubscription;
