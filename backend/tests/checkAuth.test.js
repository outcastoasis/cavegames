const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const checkAuth = require("../middleware/checkAuth");

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("authentication uses the current database role instead of the JWT role", async (t) => {
  const originalFindOne = User.findOne;
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "check-auth-test-secret";

  let receivedFilter;
  let receivedProjection;
  User.findOne = async (filter, projection) => {
    receivedFilter = filter;
    receivedProjection = projection;
    return {
      _id: "64b000000000000000000001",
      username: "alice",
      role: "spieler",
      tokenVersion: 0,
    };
  };
  t.after(() => {
    User.findOne = originalFindOne;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const token = jwt.sign(
    {
      userId: "64b000000000000000000001",
      username: "alice",
      role: "admin",
    },
    process.env.JWT_SECRET,
  );
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createResponse();
  let nextCalled = false;

  await checkAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(receivedFilter, {
    _id: "64b000000000000000000001",
    active: true,
    isTestData: { $ne: true },
  });
  assert.equal(receivedProjection, "_id username role tokenVersion");
  assert.deepEqual(req.user, {
    _id: "64b000000000000000000001",
    username: "alice",
    role: "spieler",
  });
});

test("authentication rejects a token issued before a password change", async (t) => {
  const originalFindOne = User.findOne;
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "check-auth-test-secret";
  User.findOne = async () => ({
    _id: "64b000000000000000000001",
    username: "alice",
    role: "spieler",
    tokenVersion: 1,
  });
  t.after(() => {
    User.findOne = originalFindOne;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const oldToken = jwt.sign(
    {
      userId: "64b000000000000000000001",
      role: "spieler",
      tokenVersion: 0,
    },
    process.env.JWT_SECRET,
  );
  const req = { headers: { authorization: `Bearer ${oldToken}` } };
  const res = createResponse();
  let nextCalled = false;

  await checkAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    error: "Sitzung nicht mehr gültig. Bitte erneut anmelden",
  });
});

test("authentication rejects deleted or inactive users", async (t) => {
  const originalFindOne = User.findOne;
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "check-auth-test-secret";
  User.findOne = async () => null;
  t.after(() => {
    User.findOne = originalFindOne;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const token = jwt.sign(
    { userId: "64b000000000000000000001", role: "admin" },
    process.env.JWT_SECRET,
  );
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createResponse();
  let nextCalled = false;

  await checkAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    error: "Benutzer nicht mehr aktiv oder vorhanden",
  });
});
