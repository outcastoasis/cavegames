const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const { login } = require("../controllers/authController");

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

test("login excludes test users from authentication", async (t) => {
  const originalFindOne = User.findOne;
  let receivedFilter;

  User.findOne = async (filter) => {
    receivedFilter = filter;
    return null;
  };
  t.after(() => {
    User.findOne = originalFindOne;
  });

  const req = {
    body: { username: "test_alex", password: "any-password" },
  };
  const res = createResponse();

  await login(req, res);

  assert.deepEqual(receivedFilter, {
    username: "test_alex",
    active: true,
    isTestData: { $ne: true },
  });
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "Ungültige Anmeldedaten" });
});
