const webPush = require("web-push");
const NotificationPreference = require("../models/NotificationPreference");
const PushSubscription = require("../models/PushSubscription");
const User = require("../models/User");
const {
  NOTIFICATION_CATEGORY_KEYS,
  normalizeNotificationPreferences,
} = require("../utils/notificationPreferences");

const DEFAULT_TIME_ZONE = "Europe/Zurich";
let configuredKey = null;

function getPushConfiguration() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  return {
    publicKey,
    privateKey,
    subject,
    configured: Boolean(publicKey && privateKey && subject),
  };
}

function configureWebPush() {
  const config = getPushConfiguration();
  if (!config.configured) return false;

  const nextKey = `${config.subject}:${config.publicKey}`;
  if (configuredKey !== nextKey) {
    webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    configuredKey = nextKey;
  }

  return true;
}

function getNotificationTimeZone() {
  const configuredTimeZone =
    process.env.NOTIFICATION_TIMEZONE?.trim() || DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("de-CH", { timeZone: configuredTimeZone }).format();
    return configuredTimeZone;
  } catch {
    console.error(
      `Ungültige NOTIFICATION_TIMEZONE "${configuredTimeZone}". ${DEFAULT_TIME_ZONE} wird verwendet.`,
    );
    return DEFAULT_TIME_ZONE;
  }
}

function formatNotificationDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "zum festgelegten Termin";

  const timeZone = getNotificationTimeZone();
  const dateText = new Intl.DateTimeFormat("de-CH", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
  const timeText = new Intl.DateTimeFormat("de-CH", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${dateText}, ${timeText} Uhr`;
}

function basePayload(values) {
  return {
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    ...values,
  };
}

function buildPollCreatedPayload({ pollId, spieljahr }) {
  return basePayload({
    title: "Neue Termin-Umfrage",
    body: spieljahr
      ? `Für einen Spieleabend ${spieljahr} wurde eine neue Umfrage erstellt.`
      : "Für einen Spieleabend wurde eine neue Umfrage erstellt.",
    tag: `poll-created-${pollId}`,
    url: "/umfragen",
  });
}

function buildPollReminderPayload({ pollId }) {
  return basePayload({
    title: "Deine Abstimmung fehlt noch",
    body: "Bei einer offenen Termin-Umfrage hast du noch nicht abgestimmt.",
    tag: `poll-reminder-${pollId}`,
    url: "/umfragen",
  });
}

function buildPollFinalizedPayload({ pollId, date }) {
  return basePayload({
    title: "Termin wurde fixiert",
    body: `Der Spieleabend findet am ${formatNotificationDateTime(date)} statt.`,
    tag: `poll-finalized-${pollId}`,
    url: "/umfragen",
  });
}

function buildEveningChangedPayload({ eveningId, date, dateChanged = false }) {
  return basePayload({
    title: "Spieleabend wurde geändert",
    body:
      dateChanged && date
        ? `Der neue Termin ist ${formatNotificationDateTime(date)}.`
        : date
          ? `Die Angaben für den Spieleabend am ${formatNotificationDateTime(date)} wurden geändert.`
          : "Die Angaben für einen Spieleabend wurden geändert.",
    tag: `evening-changed-${eveningId}`,
    url: `/abende/${eveningId}`,
  });
}

function buildResultsAvailablePayload({ eveningId, date }) {
  return basePayload({
    title: "Resultate sind verfügbar",
    body: date
      ? `Die Punkte und Platzierungen vom ${formatNotificationDateTime(date)} sind berechnet.`
      : "Die Punkte und Platzierungen des Spieleabends sind berechnet.",
    tag: `results-${eveningId}`,
    url: `/abende/${eveningId}`,
  });
}

function buildEveningUpcomingPayload({
  eveningId,
  date,
  isParticipant,
  attendanceEditable = true,
}) {
  let body;
  if (isParticipant) {
    body = `Du bist für ${formatNotificationDateTime(date)} als dabei eingetragen.`;
  } else if (attendanceEditable) {
    body = `${formatNotificationDateTime(date)}: Prüfe jetzt den Schalter «Dabei / Nicht dabei».`;
  } else {
    body = `${formatNotificationDateTime(date)}: Du bist aktuell nicht als Teilnehmer eingetragen.`;
  }

  return basePayload({
    title: "Spieleabend in einer Woche",
    body,
    tag: `evening-upcoming-${eveningId}`,
    url: `/abende/${eveningId}`,
  });
}

function isExpiredSubscriptionError(error) {
  return error?.statusCode === 404 || error?.statusCode === 410;
}

function normalizeIds(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => value.toString()))];
}

async function getEligibleUsersForCategory({
  category,
  userIds,
  excludeUserIds = [],
}) {
  if (!NOTIFICATION_CATEGORY_KEYS.includes(category)) {
    throw new Error(`Unbekannte Benachrichtigungskategorie: ${category}`);
  }

  const filter = { active: true, isTestData: { $ne: true } };
  const normalizedUserIds = normalizeIds(userIds);
  const normalizedExcludedIds = normalizeIds(excludeUserIds);
  if (userIds && normalizedUserIds.length === 0) return [];
  if (normalizedUserIds.length > 0) filter._id = { $in: normalizedUserIds };
  if (normalizedExcludedIds.length > 0) {
    filter._id = { ...(filter._id || {}), $nin: normalizedExcludedIds };
  }

  const users = await User.find(filter).select("_id");
  if (users.length === 0) return [];

  const preferences = await NotificationPreference.find({
    userId: { $in: users.map((user) => user._id) },
  }).lean();
  const preferenceMap = new Map(
    preferences.map((preference) => [
      preference.userId.toString(),
      normalizeNotificationPreferences(preference),
    ]),
  );

  return users.filter((user) => {
    const preferencesForUser =
      preferenceMap.get(user._id.toString()) ||
      normalizeNotificationPreferences();
    return preferencesForUser[category];
  });
}

async function sendNotificationToUsers({
  category,
  payload,
  userIds,
  excludeUserIds = [],
  isTestData = false,
}) {
  if (isTestData || !configureWebPush()) {
    return { sent: 0, failed: 0, removed: 0, users: 0, skipped: true };
  }

  const users = await getEligibleUsersForCategory({
    category,
    userIds,
    excludeUserIds,
  });
  const eligibleUserIds = users.map((user) => user._id);
  if (eligibleUserIds.length === 0) {
    return { sent: 0, failed: 0, removed: 0, users: 0, skipped: false };
  }

  const subscriptions = await PushSubscription.find({
    userId: { $in: eligibleUserIds },
  });
  const serializedPayload = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime,
            keys: subscription.keys,
          },
          serializedPayload,
          { TTL: 60 * 60 * 24 },
        );
        return { sent: true, userId: subscription.userId.toString() };
      } catch (error) {
        if (isExpiredSubscriptionError(error)) {
          await PushSubscription.deleteOne({ _id: subscription._id });
          return { removed: true };
        }
        throw error;
      }
    }),
  );

  const sentUserIds = new Set();
  const summary = results.reduce(
    (counts, result) => {
      if (result.status === "rejected") {
        counts.failed += 1;
        console.error(
          `Push-Benachrichtigung (${category}) fehlgeschlagen:`,
          result.reason?.message,
        );
      } else if (result.value.removed) {
        counts.removed += 1;
      } else {
        counts.sent += 1;
        sentUserIds.add(result.value.userId);
      }
      return counts;
    },
    { sent: 0, failed: 0, removed: 0, users: 0, skipped: false },
  );
  summary.users = sentUserIds.size;
  return summary;
}

function sendPollCreatedNotification({
  pollId,
  creatorId,
  spieljahr,
  isTestData = false,
}) {
  return sendNotificationToUsers({
    category: "pollCreated",
    payload: buildPollCreatedPayload({ pollId, spieljahr }),
    excludeUserIds: [creatorId],
    isTestData,
  });
}

function sendPollFinalizedNotification({
  pollId,
  actorId,
  date,
  isTestData = false,
}) {
  return sendNotificationToUsers({
    category: "pollFinalized",
    payload: buildPollFinalizedPayload({ pollId, date }),
    excludeUserIds: [actorId],
    isTestData,
  });
}

function sendEveningChangedNotification({
  eveningId,
  actorId,
  date,
  dateChanged,
  isTestData = false,
}) {
  return sendNotificationToUsers({
    category: "eveningChanged",
    payload: buildEveningChangedPayload({ eveningId, date, dateChanged }),
    excludeUserIds: [actorId],
    isTestData,
  });
}

function sendResultsAvailableNotification({
  eveningId,
  actorId,
  date,
  participantIds,
  isTestData = false,
}) {
  return sendNotificationToUsers({
    category: "resultsAvailable",
    payload: buildResultsAvailablePayload({ eveningId, date }),
    userIds: participantIds,
    excludeUserIds: [actorId],
    isTestData,
  });
}

module.exports = {
  buildEveningChangedPayload,
  buildEveningUpcomingPayload,
  buildPollCreatedPayload,
  buildPollFinalizedPayload,
  buildPollReminderPayload,
  buildResultsAvailablePayload,
  configureWebPush,
  formatNotificationDateTime,
  getEligibleUsersForCategory,
  getNotificationTimeZone,
  getPushConfiguration,
  isExpiredSubscriptionError,
  sendEveningChangedNotification,
  sendNotificationToUsers,
  sendPollCreatedNotification,
  sendPollFinalizedNotification,
  sendResultsAvailableNotification,
};
