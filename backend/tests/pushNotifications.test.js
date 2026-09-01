const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildEveningChangedPayload,
  buildEveningUpcomingPayload,
  buildPollAssignmentPayload,
  buildPollCreatedPayload,
  buildPollFinalizedPayload,
  buildPollReminderPayload,
  buildResultsAvailablePayload,
  isExpiredSubscriptionError,
} = require("../services/pushNotificationService");
const {
  validateSubscription,
} = require("../controllers/notificationController");
const {
  normalizeNotificationPreferences,
  validateNotificationPreferenceUpdate,
} = require("../utils/notificationPreferences");
const {
  getIsoWeekKey,
  getUsersWithoutPollVote,
  getZonedDateKey,
  isPollReminderDue,
} = require("../services/notificationScheduler");

test("validates browser push subscriptions before storing them", () => {
  assert.equal(
    validateSubscription({
      endpoint: "https://push.example.test/subscription/123",
      keys: { p256dh: "public-key", auth: "auth-secret" },
    }),
    null,
  );
  assert.match(
    validateSubscription({
      endpoint: "http://push.example.test/subscription/123",
      keys: { p256dh: "public-key", auth: "auth-secret" },
    }),
    /Endpunkt/,
  );
  assert.match(
    validateSubscription({ endpoint: "https://push.example.test/123" }),
    /Schlüssel/,
  );
});

test("creates a poll notification that opens the poll overview", () => {
  assert.deepEqual(
    buildPollCreatedPayload({
      pollId: "64b000000000000000000010",
      spieljahr: 2026,
    }),
    {
      title: "Neue Termin-Umfrage",
      body: "Für einen Spieleabend 2026 wurde eine neue Umfrage erstellt.",
      icon: "/icons/icon-192.png",
      badge: "/icons/notification-badge.png",
      tag: "poll-created-64b000000000000000000010",
      url: "/umfragen",
    },
  );
});

test("creates an assignment notification for the poll creator", () => {
  assert.deepEqual(
    buildPollAssignmentPayload({
      eveningId: "64b000000000000000000011",
      spieljahr: 2026,
    }),
    {
      title: "Du wurdest als Spielleiter eingeteilt",
      body: "Bitte erstelle die Termin-Umfrage für den Spieleabend 2026.",
      icon: "/icons/icon-192.png",
      badge: "/icons/notification-badge.png",
      tag: "poll-assignment-64b000000000000000000011",
      url: "/abende",
    },
  );
});

test("normalizes and validates all notification categories", () => {
  assert.deepEqual(normalizeNotificationPreferences({ pollReminder: false }), {
    pollAssignment: true,
    pollCreated: true,
    pollReminder: false,
    pollFinalized: true,
    eveningChanged: true,
    resultsAvailable: true,
    eveningUpcoming: true,
  });
  assert.equal(
    validateNotificationPreferenceUpdate({
      pollCreated: false,
      eveningUpcoming: true,
    }),
    null,
  );
  assert.match(
    validateNotificationPreferenceUpdate({ unknownCategory: true }),
    /Ungültige/,
  );
  assert.match(
    validateNotificationPreferenceUpdate({ pollCreated: "yes" }),
    /Ungültige/,
  );
});

test("builds actionable payloads for every notification category", () => {
  const date = "2026-09-12T17:00:00.000Z";
  const finalized = buildPollFinalizedPayload({ pollId: "poll-1", date });
  assert.match(finalized.body, /12\. September 2026/);
  assert.match(finalized.body, /19:00 Uhr/);
  assert.equal(finalized.url, "/umfragen");

  assert.equal(buildPollReminderPayload({ pollId: "poll-1" }).url, "/umfragen");
  assert.match(
    buildEveningChangedPayload({
      eveningId: "evening-1",
      date,
      dateChanged: true,
    }).body,
    /neue Termin/,
  );
  assert.equal(
    buildResultsAvailablePayload({ eveningId: "evening-1", date }).url,
    "/abende/evening-1",
  );
  assert.match(
    buildEveningUpcomingPayload({
      eveningId: "evening-1",
      date,
      isParticipant: false,
    }).body,
    /Dabei \/ Nicht dabei/,
  );
  assert.doesNotMatch(
    buildEveningUpcomingPayload({
      eveningId: "evening-1",
      date,
      isParticipant: false,
      attendanceEditable: false,
    }).body,
    /Dabei \/ Nicht dabei/,
  );
});

test("uses Zurich calendar weeks and the configured weekly reminder window", (t) => {
  const originalWeekday = process.env.NOTIFICATION_REMINDER_WEEKDAY;
  const originalHour = process.env.NOTIFICATION_REMINDER_HOUR;
  process.env.NOTIFICATION_REMINDER_WEEKDAY = "1";
  process.env.NOTIFICATION_REMINDER_HOUR = "18";
  t.after(() => {
    if (originalWeekday === undefined) {
      delete process.env.NOTIFICATION_REMINDER_WEEKDAY;
    } else {
      process.env.NOTIFICATION_REMINDER_WEEKDAY = originalWeekday;
    }
    if (originalHour === undefined) {
      delete process.env.NOTIFICATION_REMINDER_HOUR;
    } else {
      process.env.NOTIFICATION_REMINDER_HOUR = originalHour;
    }
  });

  const mondayEvening = new Date("2026-08-31T16:30:00.000Z");
  assert.equal(getZonedDateKey(mondayEvening, "Europe/Zurich"), "2026-08-31");
  assert.equal(getIsoWeekKey(mondayEvening, "Europe/Zurich"), "2026-W36");
  assert.equal(isPollReminderDue(mondayEvening, "Europe/Zurich"), true);
  assert.equal(
    isPollReminderDue(
      new Date("2026-08-31T15:30:00.000Z"),
      "Europe/Zurich",
    ),
    false,
  );
});

test("weekly poll reminders only target users without any vote", () => {
  const users = [{ _id: "user-a" }, { _id: "user-b" }, { _id: "user-c" }];
  const poll = {
    options: [
      { votes: ["user-a"] },
      { votes: ["user-a", "user-c"] },
    ],
  };

  assert.deepEqual(
    getUsersWithoutPollVote(poll, users).map((user) => user._id),
    ["user-b"],
  );
});

test("recognizes subscriptions rejected permanently by the push provider", () => {
  assert.equal(isExpiredSubscriptionError({ statusCode: 404 }), true);
  assert.equal(isExpiredSubscriptionError({ statusCode: 410 }), true);
  assert.equal(isExpiredSubscriptionError({ statusCode: 429 }), false);
});
