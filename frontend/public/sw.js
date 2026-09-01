self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { body: event.data?.text() || "Es gibt Neuigkeiten bei Cavegames." };
  }

  const title = payload.title || "Cavegames";
  const options = {
    body: payload.body || "Es gibt Neuigkeiten bei Cavegames.",
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/notification-badge.png",
    tag: payload.tag,
    renotify: false,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  );
  if (targetUrl.origin !== self.location.origin) {
    targetUrl = new URL("/", self.location.origin);
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windowClients) => {
        const existingClient =
          windowClients.find((client) => client.url === targetUrl.href) ||
          windowClients.find(
            (client) => new URL(client.url).origin === self.location.origin,
          );

        if (existingClient) {
          try {
            const focusedClient = await existingClient.focus();
            if (
              focusedClient &&
              "navigate" in focusedClient &&
              focusedClient.url !== targetUrl.href
            ) {
              const navigatedClient = await focusedClient.navigate(
                targetUrl.href,
              );
              return navigatedClient || focusedClient;
            }
            return focusedClient;
          } catch (error) {
            console.warn(
              "Bestehende Cavegames-App konnte nicht fokussiert werden:",
              error,
            );
          }
        }

        return self.clients.openWindow(targetUrl.href);
      }),
  );
});
