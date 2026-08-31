import API from "../services/api";

export function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIosDevice() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandaloneApp() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);

  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

function applicationServerKeysMatch(currentKey, expectedKey) {
  if (!currentKey) return false;
  const currentBytes = new Uint8Array(currentKey);
  return (
    currentBytes.length === expectedKey.length &&
    currentBytes.every((value, index) => value === expectedKey[index])
  );
}

async function getRegistration() {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;
  return registration;
}

export async function getPushNotificationState() {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: "unsupported",
      subscribed: false,
      needsIosInstallation: isIosDevice() && !isStandaloneApp(),
    };
  }

  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();

  return {
    supported: true,
    permission: Notification.permission,
    subscribed: Boolean(subscription),
    needsIosInstallation: isIosDevice() && !isStandaloneApp(),
  };
}

export async function enablePushNotifications() {
  if (!isPushSupported()) {
    throw new Error("Dieser Browser unterstützt keine Push-Benachrichtigungen.");
  }
  if (isIosDevice() && !isStandaloneApp()) {
    throw new Error(
      "Installiere Cavegames zuerst über «Zum Home-Bildschirm» und öffne danach die App.",
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Benachrichtigungen sind im Browser blockiert. Bitte erlaube sie in den Website-Einstellungen."
        : "Benachrichtigungen wurden nicht freigegeben.",
    );
  }

  const registration = await getRegistration();
  let subscription = await registration.pushManager.getSubscription();
  const response = await API.get("/notifications/vapid-public-key");
  const applicationServerKey = urlBase64ToUint8Array(response.data.publicKey);

  if (
    subscription &&
    !applicationServerKeysMatch(
      subscription.options?.applicationServerKey,
      applicationServerKey,
    )
  ) {
    await subscription.unsubscribe();
    subscription = null;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  try {
    await API.post("/notifications/subscriptions", {
      subscription: subscription.toJSON(),
    });
  } catch (error) {
    await subscription.unsubscribe().catch(() => {});
    throw error;
  }

  return getPushNotificationState();
}

export async function disablePushNotifications() {
  if (!isPushSupported()) {
    return getPushNotificationState();
  }

  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await API.delete("/notifications/subscriptions", {
      data: { endpoint: subscription.endpoint },
    });
    await subscription.unsubscribe();
  }

  return getPushNotificationState();
}
