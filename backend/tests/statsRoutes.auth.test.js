const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const statsRoutes = require("../routes/statsRoutes");

test("statistics routes reject unauthenticated requests", async (t) => {
  const app = express();
  app.use("/api/stats", statsRoutes);

  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    listener.on("error", reject);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  const response = await fetch(
    `http://127.0.0.1:${port}/api/stats/leaderboard?year=2026`,
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: "Kein gültiges Token übermittelt",
  });
});
