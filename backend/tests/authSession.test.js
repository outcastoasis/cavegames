const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const AuthSession = require("../models/AuthSession");
const {
  REFRESH_COOKIE_NAME,
  createAuthSession,
  hashToken,
  parseCookies,
  parseRefreshToken,
  rotateAuthSession,
  safeHashEquals,
} = require("../services/authSessionService");
const checkAuthOrigin = require("../middleware/checkAuthOrigin");

function createResponse() {
  return {
    cookies: [],
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
      return this;
    },
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

test("parses opaque refresh cookies without exposing their secret", () => {
  const cookies = parseCookies("theme=dark; cavegames_refresh=session.secret%2Bvalue");
  assert.equal(cookies.cavegames_refresh, "session.secret+value");
  assert.deepEqual(parseRefreshToken(cookies.cavegames_refresh), {
    sessionId: "session",
    secret: "secret+value",
  });
  assert.equal(parseRefreshToken("invalid"), null);
  assert.equal(safeHashEquals(hashToken("one"), hashToken("one")), true);
  assert.equal(safeHashEquals(hashToken("one"), hashToken("two")), false);
});

test("creates a 90-day HttpOnly session and a short-lived access token", async (t) => {
  const originalCreate = AuthSession.create;
  const originalSecret = process.env.JWT_SECRET;
  const originalDays = process.env.AUTH_SESSION_DAYS;
  const originalTtl = process.env.AUTH_ACCESS_TOKEN_TTL;
  const originalSameSite = process.env.AUTH_COOKIE_SAME_SITE;
  const originalSecure = process.env.AUTH_COOKIE_SECURE;
  process.env.JWT_SECRET = "auth-session-test-secret";
  process.env.AUTH_SESSION_DAYS = "90";
  process.env.AUTH_ACCESS_TOKEN_TTL = "15m";
  process.env.AUTH_COOKIE_SAME_SITE = "none";
  process.env.AUTH_COOKIE_SECURE = "true";

  let storedSession;
  AuthSession.create = async (session) => {
    storedSession = session;
    return session;
  };
  t.after(() => {
    AuthSession.create = originalCreate;
    const restore = (name, value) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    };
    restore("JWT_SECRET", originalSecret);
    restore("AUTH_SESSION_DAYS", originalDays);
    restore("AUTH_ACCESS_TOKEN_TTL", originalTtl);
    restore("AUTH_COOKIE_SAME_SITE", originalSameSite);
    restore("AUTH_COOKIE_SECURE", originalSecure);
  });

  const now = new Date("2026-08-31T10:00:00.000Z");
  const user = {
    _id: "64b000000000000000000001",
    username: "alice",
    displayName: "Alice",
    role: "spieler",
    tokenVersion: 2,
  };
  const req = {
    ip: "127.0.0.1",
    get: (name) => (name === "user-agent" ? "test-browser" : undefined),
  };
  const res = createResponse();
  const auth = await createAuthSession({ user, req, res, now });

  const cookie = res.cookies[0];
  assert.equal(cookie.name, REFRESH_COOKIE_NAME);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.secure, true);
  assert.equal(cookie.options.sameSite, "none");
  assert.equal(cookie.options.path, "/api/auth");
  assert.equal(cookie.options.maxAge, 90 * 24 * 60 * 60 * 1000);

  const parsedCookie = parseRefreshToken(cookie.value);
  assert.equal(storedSession.sessionId, parsedCookie.sessionId);
  assert.equal(storedSession.tokenHash, hashToken(parsedCookie.secret));
  assert.notEqual(storedSession.tokenHash, parsedCookie.secret);
  assert.equal(storedSession.tokenVersion, 2);
  assert.equal(storedSession.expiresAt.toISOString(), "2026-11-29T10:00:00.000Z");

  const decoded = jwt.verify(auth.token, process.env.JWT_SECRET);
  assert.equal(decoded.userId, user._id);
  assert.ok(decoded.exp - decoded.iat <= 15 * 60);
  assert.deepEqual(auth.user, {
    _id: user._id,
    username: "alice",
    displayName: "Alice",
    role: "spieler",
    profileImageUrl: undefined,
  });
});

test("rotates refresh secrets atomically and keeps a short concurrency grace", async (t) => {
  const originalUpdate = AuthSession.findOneAndUpdate;
  const originalDays = process.env.AUTH_SESSION_DAYS;
  process.env.AUTH_SESSION_DAYS = "90";
  let receivedFilter;
  let receivedUpdate;

  AuthSession.findOneAndUpdate = async (filter, update) => {
    receivedFilter = filter;
    receivedUpdate = update;
    return {
      _id: filter._id,
      previousTokenHash: update.$set.previousTokenHash,
      previousTokenValidUntil: update.$set.previousTokenValidUntil,
    };
  };
  t.after(() => {
    AuthSession.findOneAndUpdate = originalUpdate;
    if (originalDays === undefined) delete process.env.AUTH_SESSION_DAYS;
    else process.env.AUTH_SESSION_DAYS = originalDays;
  });

  const now = new Date("2026-08-31T10:00:00.000Z");
  const session = { _id: "session-doc", sessionId: "public-session-id" };
  const presentedHash = hashToken("old-secret");
  const res = createResponse();
  const rotated = await rotateAuthSession({
    session,
    presentedHash,
    res,
    now,
  });

  assert.deepEqual(receivedFilter, {
    _id: session._id,
    tokenHash: presentedHash,
  });
  assert.equal(receivedUpdate.$set.previousTokenHash, presentedHash);
  assert.equal(
    receivedUpdate.$set.previousTokenValidUntil.getTime(),
    now.getTime() + 30_000,
  );
  assert.equal(rotated.previousTokenHash, presentedHash);
  assert.equal(res.cookies[0].value.startsWith("public-session-id."), true);
  assert.equal(
    receivedUpdate.$set.tokenHash,
    hashToken(parseRefreshToken(res.cookies[0].value).secret),
  );
});

test("rejects credentialed auth requests from an unexpected browser origin", (t) => {
  const originalOrigin = process.env.CLIENT_ORIGIN;
  process.env.CLIENT_ORIGIN = "https://app.example.com";
  t.after(() => {
    if (originalOrigin === undefined) delete process.env.CLIENT_ORIGIN;
    else process.env.CLIENT_ORIGIN = originalOrigin;
  });

  let nextCalled = false;
  const req = { get: () => "https://attacker.example" };
  const res = createResponse();
  checkAuthOrigin(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});
