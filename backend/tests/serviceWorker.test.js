const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const serviceWorkerSource = readFileSync(
  path.resolve(__dirname, "../../frontend/public/sw.js"),
  "utf8",
);

function loadServiceWorker({ windowClients = [], openWindow }) {
  const listeners = new Map();
  const self = {
    location: { origin: "https://cavegames.test" },
    clients: {
      claim: async () => undefined,
      matchAll: async () => windowClients,
      openWindow,
    },
    registration: { showNotification: async () => undefined },
    skipWaiting: async () => undefined,
    addEventListener: (name, listener) => listeners.set(name, listener),
  };

  vm.runInNewContext(serviceWorkerSource, {
    URL,
    console: { warn: () => undefined },
    self,
  });

  return listeners;
}

async function dispatchNotificationClick(listener, url) {
  let work;
  listener({
    notification: {
      close: () => undefined,
      data: { url },
    },
    waitUntil: (promise) => {
      work = promise;
    },
  });
  await work;
}

test("notification clicks focus a background app before navigating", async () => {
  const calls = [];
  const existingClient = {
    url: "https://cavegames.test/",
    focus: async function focus() {
      calls.push("focus");
      return this;
    },
    navigate: async function navigate(url) {
      calls.push(`navigate:${url}`);
      this.url = url;
      return this;
    },
  };
  const listeners = loadServiceWorker({
    windowClients: [existingClient],
    openWindow: async (url) => {
      calls.push(`open:${url}`);
    },
  });

  await dispatchNotificationClick(
    listeners.get("notificationclick"),
    "/umfragen",
  );

  assert.deepEqual(calls, [
    "focus",
    "navigate:https://cavegames.test/umfragen",
  ]);
});

test("notification clicks open the app when focusing fails", async () => {
  const calls = [];
  const listeners = loadServiceWorker({
    windowClients: [
      {
        url: "https://cavegames.test/",
        focus: async () => {
          calls.push("focus");
          throw new Error("App cannot be focused");
        },
      },
    ],
    openWindow: async (url) => {
      calls.push(`open:${url}`);
    },
  });

  await dispatchNotificationClick(
    listeners.get("notificationclick"),
    "/abende/123",
  );

  assert.deepEqual(calls, [
    "focus",
    "open:https://cavegames.test/abende/123",
  ]);
});
