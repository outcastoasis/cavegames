const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPollCreatedPayload,
  isExpiredSubscriptionError,
} = require("../services/pushNotificationService");
const {
  validateSubscription,
} = require("../controllers/notificationController");

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
      badge: "/icons/icon-192.png",
      tag: "poll-64b000000000000000000010",
      url: "/umfragen",
    },
  );
});

test("recognizes subscriptions rejected permanently by the push provider", () => {
  assert.equal(isExpiredSubscriptionError({ statusCode: 404 }), true);
  assert.equal(isExpiredSubscriptionError({ statusCode: 410 }), true);
  assert.equal(isExpiredSubscriptionError({ statusCode: 429 }), false);
});
