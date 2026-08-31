const webPush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

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

function buildPollCreatedPayload({ pollId, spieljahr }) {
  return {
    title: "Neue Termin-Umfrage",
    body: spieljahr
      ? `Für einen Spieleabend ${spieljahr} wurde eine neue Umfrage erstellt.`
      : "Für einen Spieleabend wurde eine neue Umfrage erstellt.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `poll-${pollId}`,
    url: "/umfragen",
  };
}

function isExpiredSubscriptionError(error) {
  return error?.statusCode === 404 || error?.statusCode === 410;
}

async function sendPollCreatedNotification({
  pollId,
  creatorId,
  spieljahr,
  isTestData = false,
}) {
  if (isTestData || !configureWebPush()) {
    return { sent: 0, failed: 0, removed: 0, skipped: true };
  }

  const subscriptions = await PushSubscription.find({
    userId: { $ne: creatorId },
    "preferences.polls": { $ne: false },
  }).populate("userId", "active isTestData");

  const eligibleSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.userId?.active && subscription.userId?.isTestData !== true,
  );
  const payload = JSON.stringify(
    buildPollCreatedPayload({ pollId, spieljahr }),
  );

  const results = await Promise.allSettled(
    eligibleSubscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime,
            keys: subscription.keys,
          },
          payload,
          { TTL: 60 * 60 * 24 },
        );
        return { sent: true };
      } catch (error) {
        if (isExpiredSubscriptionError(error)) {
          await PushSubscription.deleteOne({ _id: subscription._id });
          return { removed: true };
        }
        throw error;
      }
    }),
  );

  return results.reduce(
    (counts, result) => {
      if (result.status === "rejected") {
        counts.failed += 1;
        console.error(
          "Push-Benachrichtigung fehlgeschlagen:",
          result.reason?.message,
        );
      } else if (result.value.removed) {
        counts.removed += 1;
      } else {
        counts.sent += 1;
      }
      return counts;
    },
    { sent: 0, failed: 0, removed: 0, skipped: false },
  );
}

module.exports = {
  buildPollCreatedPayload,
  configureWebPush,
  getPushConfiguration,
  isExpiredSubscriptionError,
  sendPollCreatedNotification,
};
