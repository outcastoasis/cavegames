const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const {
  LOGIN_ATTEMPT_LIMIT,
  createLoginRateLimit,
} = require("../middleware/loginRateLimit");

async function startTestServer() {
  const app = express();
  app.use(express.json());
  app.post("/login", createLoginRateLimit(), (req, res) => {
    if (req.body.success === true) {
      return res.status(200).json({ ok: true });
    }
    return res.status(401).json({ error: "Ungültige Anmeldedaten" });
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

async function loginRequest(port, success = false) {
  return fetch(`http://127.0.0.1:${port}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success }),
  });
}

test("login blocks the eleventh failed attempt from one IP", async (t) => {
  const server = await startTestServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMIT; attempt += 1) {
    const response = await loginRequest(port);
    assert.equal(response.status, 401);
  }

  const blockedResponse = await loginRequest(port);
  assert.equal(blockedResponse.status, 429);
  assert.deepEqual(await blockedResponse.json(), {
    error:
      "Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuche es in 15 Minuten erneut.",
  });
});

test("successful logins do not consume failed-attempt capacity", async (t) => {
  const server = await startTestServer();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMIT; attempt += 1) {
    const response = await loginRequest(port, true);
    assert.equal(response.status, 200);
  }

  for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMIT; attempt += 1) {
    const response = await loginRequest(port);
    assert.equal(response.status, 401);
  }

  const blockedResponse = await loginRequest(port);
  assert.equal(blockedResponse.status, 429);
});
