const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const AuthSession = require("../models/AuthSession");
const { updateUser } = require("../controllers/userController");

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
