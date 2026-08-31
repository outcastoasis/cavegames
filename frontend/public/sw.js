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
    badge: payload.badge || "/icons/icon-192.png",
    tag: payload.tag,
    renotify: false,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let targetUrl = new URL(event.notification.data?.url || "/", self.location.origin);
  if (targetUrl.origin !== self.location.origin) {
    targetUrl = new URL("/", self.location.origin);
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        const existingClient = clients.find(
          (client) => new URL(client.url).origin === self.location.origin,
        );

        if (existingClient) {
          if ("navigate" in existingClient) {
            await existingClient.navigate(targetUrl.href);
          }
          return existingClient.focus();
        }

        return self.clients.openWindow(targetUrl.href);
      }),
  );
});
