const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
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
  const storedUser = {
    _id: "64b000000000000000000001",
    passwordHash: "old-hash",
    tokenVersion: 0,
    async save() {},
  };
  User.findOne = async () => storedUser;
  t.after(() => {
    User.findOne = originalFindOne;
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
});
