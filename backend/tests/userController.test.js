const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const AuthSession = require("../models/AuthSession");
const {
  changeOwnPassword,
  updateUser,
} = require("../controllers/userController");

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

test("changing a password increments the token version", async (t) => {
  const originalFindOne = User.findOne;
  const originalDeleteMany = AuthSession.deleteMany;
  let revokedSessionsFor;
  const storedUser = {
    _id: "64b000000000000000000001",
    passwordHash: "old-hash",
    tokenVersion: 0,
    async save() {},
  };
  User.findOne = async () => storedUser;
  AuthSession.deleteMany = async (filter) => {
    revokedSessionsFor = filter.userId;
  };
  t.after(() => {
    User.findOne = originalFindOne;
    AuthSession.deleteMany = originalDeleteMany;
  });

  const req = {
    params: { id: "64b000000000000000000001" },
    body: { password: "a-new-password" },
    user: { _id: "64b000000000000000000000", role: "admin" },
    isTestMode: false,
  };
  const res = createResponse();

  await updateUser(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { message: "Benutzer aktualisiert" });
  assert.notEqual(storedUser.passwordHash, "old-hash");
  assert.equal(storedUser.tokenVersion, 1);
  assert.equal(revokedSessionsFor, storedUser._id);
});

test("users can change their own password and revoke all sessions", async (t) => {
  const originalFindOne = User.findOne;
  const originalDeleteMany = AuthSession.deleteMany;
  const storedUser = {
    _id: "64b000000000000000000001",
    passwordHash: await bcrypt.hash("old-password", 4),
    tokenVersion: 3,
    async save() {},
  };
  let revokedSessionsFor;
  User.findOne = async () => storedUser;
  AuthSession.deleteMany = async (filter) => {
    revokedSessionsFor = filter.userId;
  };
  t.after(() => {
    User.findOne = originalFindOne;
    AuthSession.deleteMany = originalDeleteMany;
  });

  const req = {
    body: {
      currentPassword: "old-password",
      newPassword: "new-password",
    },
    user: { _id: storedUser._id },
  };
  const res = createResponse();
  await changeOwnPassword(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    message: "Passwort geändert. Bitte melde dich erneut an.",
  });
  assert.equal(await bcrypt.compare("new-password", storedUser.passwordHash), true);
  assert.equal(storedUser.tokenVersion, 4);
  assert.equal(revokedSessionsFor, storedUser._id);
});

test("changing the own password requires the current password", async (t) => {
  const originalFindOne = User.findOne;
  const originalDeleteMany = AuthSession.deleteMany;
  const storedUser = {
    _id: "64b000000000000000000001",
    passwordHash: await bcrypt.hash("old-password", 4),
    tokenVersion: 0,
    async save() {
      throw new Error("must not save");
    },
  };
  let revoked = false;
  User.findOne = async () => storedUser;
  AuthSession.deleteMany = async () => {
    revoked = true;
  };
  t.after(() => {
    User.findOne = originalFindOne;
    AuthSession.deleteMany = originalDeleteMany;
  });

  const req = {
    body: {
      currentPassword: "wrong-password",
      newPassword: "new-password",
    },
    user: { _id: storedUser._id },
  };
  const res = createResponse();
  await changeOwnPassword(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    error: "Das aktuelle Passwort ist nicht korrekt",
  });
  assert.equal(storedUser.tokenVersion, 0);
  assert.equal(revoked, false);
});
