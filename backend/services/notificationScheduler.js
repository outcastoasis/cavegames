const Evening = require("../models/Evening");
const NotificationDelivery = require("../models/NotificationDelivery");
const Poll = require("../models/Poll");
const PushSubscription = require("../models/PushSubscription");
const {
  buildEveningUpcomingPayload,
  buildPollReminderPayload,
  getEligibleUsersForCategory,
  getNotificationTimeZone,
  sendNotificationToUsers,
} = require("./pushNotificationService");

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
let schedulerRunning = false;

function getZonedDateParts(value, timeZone = getNotificationTimeZone()) {
  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    weekday: DAY_NAMES.indexOf(parts.weekday),
  };
}

function getZonedDateKey(value, timeZone = getNotificationTimeZone()) {
  const parts = getZonedDateParts(value, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
}

function getIsoWeekKey(value, timeZone = getNotificationTimeZone()) {
  const parts = getZonedDateParts(value, timeZone);
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getIntegerSetting(name, fallback, minimum, maximum) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= minimum && value <= maximum
    ? value
    : fallback;
}

function isPollReminderDue(value, timeZone = getNotificationTimeZone()) {
  const parts = getZonedDateParts(value, timeZone);
  const weekday = getIntegerSetting(
    "NOTIFICATION_REMINDER_WEEKDAY",
    1,
    0,
    6,
  );
  const hour = getIntegerSetting("NOTIFICATION_REMINDER_HOUR", 18, 0, 23);
  return parts.weekday === weekday && parts.hour >= hour;
}

function getUsersWithoutPollVote(poll, users) {
  const votedUserIds = new Set(
    (poll?.options || []).flatMap((option) =>
      (option.votes || []).map((userId) => userId.toString()),
    ),
  );
  return users.filter((user) => !votedUserIds.has(user._id.toString()));
}

async function deliverScheduledNotification({
  userId,
  category,
  entityId,
  periodKey,
  payload,
}) {
  const hasSubscription = await PushSubscription.exists({ userId });
  if (!hasSubscription) return { delivered: false, reason: "no-subscription" };

  let delivery;
  try {
    delivery = await NotificationDelivery.create({
      userId,
      category,
      entityId: entityId.toString(),
      periodKey,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return { delivered: false, reason: "already-delivered" };
    }
    throw error;
  }

  try {
    const summary = await sendNotificationToUsers({
      category,
      payload,
      userIds: [userId],
    });
    if (summary.sent === 0) {
      await NotificationDelivery.deleteOne({ _id: delivery._id });
      return { delivered: false, reason: "not-sent" };
    }

    delivery.sentAt = new Date();
    await delivery.save();
    return { delivered: true };
  } catch (error) {
    await NotificationDelivery.deleteOne({ _id: delivery._id });
    throw error;
  }
}

async function sendOpenPollReminders(now = new Date()) {
  const timeZone = getNotificationTimeZone();
  if (!isPollReminderDue(now, timeZone)) return 0;

  const [polls, users] = await Promise.all([
    Poll.find({
      finalizedOption: null,
      isTestData: { $ne: true },
    }).select("_id options.votes"),
    getEligibleUsersForCategory({ category: "pollReminder" }),
  ]);
  const periodKey = getIsoWeekKey(now, timeZone);
  let delivered = 0;

  for (const poll of polls) {
    for (const user of getUsersWithoutPollVote(poll, users)) {
      const result = await deliverScheduledNotification({
        userId: user._id,
        category: "pollReminder",
        entityId: poll._id,
        periodKey,
        payload: buildPollReminderPayload({ pollId: poll._id }),
      });
      if (result.delivered) delivered += 1;
    }
  }

  return delivered;
}

async function sendUpcomingEveningReminders(now = new Date()) {
  const timeZone = getNotificationTimeZone();
  const targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const targetDateKey = getZonedDateKey(targetDate, timeZone);
  const rangeStart = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

  const [evenings, users] = await Promise.all([
    Evening.find({
      status: "fixiert",
      date: { $gte: rangeStart, $lt: rangeEnd },
      isTestData: { $ne: true },
    }).select("_id date participantIds games._id"),
    getEligibleUsersForCategory({ category: "eveningUpcoming" }),
  ]);
  let delivered = 0;

  for (const evening of evenings) {
    if (getZonedDateKey(evening.date, timeZone) !== targetDateKey) continue;
    const participantIds = new Set(
      evening.participantIds.map((userId) => userId.toString()),
    );

    for (const user of users) {
      const userId = user._id.toString();
      const result = await deliverScheduledNotification({
        userId: user._id,
        category: "eveningUpcoming",
        entityId: evening._id,
        periodKey: targetDateKey,
        payload: buildEveningUpcomingPayload({
          eveningId: evening._id,
          date: evening.date,
          isParticipant: participantIds.has(userId),
          attendanceEditable: evening.games.length === 0,
        }),
      });
      if (result.delivered) delivered += 1;
    }
  }

  return delivered;
}

async function runNotificationScheduler(now = new Date()) {
  if (schedulerRunning) return { skipped: true };
  schedulerRunning = true;

  try {
    const [pollReminders, upcomingEvenings] = await Promise.all([
      sendOpenPollReminders(now),
      sendUpcomingEveningReminders(now),
    ]);
    if (pollReminders || upcomingEvenings) {
      console.log(
        `Geplante Pushs gesendet: ${pollReminders} Umfragen, ${upcomingEvenings} Spieleabende`,
      );
    }
    return { pollReminders, upcomingEvenings, skipped: false };
  } finally {
    schedulerRunning = false;
  }
}

function startNotificationScheduler() {
  if (process.env.NOTIFICATION_SCHEDULER_ENABLED !== "true") {
    console.log("Push-Scheduler ist deaktiviert.");
    return null;
  }

  const intervalMinutes = getIntegerSetting(
    "NOTIFICATION_SCHEDULER_INTERVAL_MINUTES",
    60,
    15,
    1440,
  );
  const run = () => {
    runNotificationScheduler().catch((error) => {
      console.error("Fehler im Push-Scheduler:", error.message);
    });
  };

  const initialTimer = setTimeout(run, 15_000);
  const interval = setInterval(run, intervalMinutes * 60 * 1000);
  initialTimer.unref?.();
  interval.unref?.();
  console.log(`Push-Scheduler läuft alle ${intervalMinutes} Minuten.`);

  return { initialTimer, interval };
}

module.exports = {
  deliverScheduledNotification,
  getIsoWeekKey,
  getUsersWithoutPollVote,
  getZonedDateKey,
  getZonedDateParts,
  isPollReminderDue,
  runNotificationScheduler,
  sendOpenPollReminders,
  sendUpcomingEveningReminders,
  startNotificationScheduler,
};
