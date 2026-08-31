const NOTIFICATION_CATEGORIES = Object.freeze({
  pollCreated: true,
  pollReminder: true,
  pollFinalized: true,
  eveningChanged: true,
  resultsAvailable: true,
  eveningUpcoming: true,
});

const NOTIFICATION_CATEGORY_KEYS = Object.freeze(
  Object.keys(NOTIFICATION_CATEGORIES),
);

function normalizeNotificationPreferences(value = {}) {
  return NOTIFICATION_CATEGORY_KEYS.reduce((preferences, key) => {
    preferences[key] =
      typeof value?.[key] === "boolean"
        ? value[key]
        : NOTIFICATION_CATEGORIES[key];
    return preferences;
  }, {});
}

function validateNotificationPreferenceUpdate(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Benachrichtigungseinstellungen fehlen.";
  }

  const keys = Object.keys(value);
  if (keys.length === 0) {
    return "Mindestens eine Einstellung muss angegeben werden.";
  }

  if (
    keys.some(
      (key) =>
        !NOTIFICATION_CATEGORY_KEYS.includes(key) ||
        typeof value[key] !== "boolean",
    )
  ) {
    return "Ungültige Benachrichtigungseinstellung.";
  }

  return null;
}

module.exports = {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_KEYS,
  normalizeNotificationPreferences,
  validateNotificationPreferenceUpdate,
};
