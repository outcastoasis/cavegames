const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const AuthSession = require("../models/AuthSession");

const REFRESH_COOKIE_NAME = "cavegames_refresh";
const DEFAULT_ACCESS_TOKEN_TTL = "15m";
const DEFAULT_SESSION_DAYS = 90;
const ROTATION_GRACE_MS = 30 * 1000;

function getSessionDays() {
  const configured = Number(process.env.AUTH_SESSION_DAYS);
  return Number.isInteger(configured) && configured >= 1 && configured <= 365
    ? configured
    : DEFAULT_SESSION_DAYS;
}

function getAccessTokenTtl() {
  return process.env.AUTH_ACCESS_TOKEN_TTL || DEFAULT_ACCESS_TOKEN_TTL;
}

function getCookieSameSite() {
  const configured = process.env.AUTH_COOKIE_SAME_SITE?.toLowerCase();
  if (["lax", "strict", "none"].includes(configured)) return configured;
  return process.env.NODE_ENV === "production" ||
    process.env.CLIENT_ORIGIN?.startsWith("https://")
    ? "none"
    : "lax";
}

function getCookieOptions({ includeMaxAge = true } = {}) {
  const sameSite = getCookieSameSite();
  const options = {
    httpOnly: true,
    secure:
      process.env.AUTH_COOKIE_SECURE === "true" ||
      process.env.NODE_ENV === "production" ||
      sameSite === "none",
    sameSite,
    path: "/api/auth",
  };

  if (process.env.AUTH_COOKIE_DOMAIN) {
    options.domain = process.env.AUTH_COOKIE_DOMAIN;
  }
  if (includeMaxAge) {
    options.maxAge = getSessionDays() * 24 * 60 * 60 * 1000;
  }
  return options;
}

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, part) => {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0) return cookies;
    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (!name) return cookies;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
    return cookies;
  }, {});
}

function readRefreshToken(req) {
  return parseCookies(req.headers?.cookie)[REFRESH_COOKIE_NAME] || "";
}

function parseRefreshToken(rawToken) {
  const separatorIndex = rawToken.indexOf(".");
  if (separatorIndex <= 0 || separatorIndex === rawToken.length - 1) return null;
  return {
    sessionId: rawToken.slice(0, separatorIndex),
    secret: rawToken.slice(separatorIndex + 1),
  };
}

function hashToken(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeHashEquals(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: getAccessTokenTtl() },
  );
}

function serializeUser(user) {
  return {
    _id: user._id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    profileImageUrl: user.profileImageUrl,
  };
}

function createOpaqueToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function getExpiry(now = new Date()) {
  return new Date(now.getTime() + getSessionDays() * 24 * 60 * 60 * 1000);
}

function setRefreshCookie(res, sessionId, secret) {
  res.cookie(
    REFRESH_COOKIE_NAME,
    `${sessionId}.${secret}`,
    getCookieOptions(),
  );
}

function clearRefreshCookie(res) {
  res.clearCookie(
    REFRESH_COOKIE_NAME,
    getCookieOptions({ includeMaxAge: false }),
  );
}

async function createAuthSession({ user, req, res, now = new Date() }) {
  const sessionId = createOpaqueToken();
  const secret = createOpaqueToken();
  await AuthSession.create({
    sessionId,
    userId: user._id,
    tokenHash: hashToken(secret),
    tokenVersion: user.tokenVersion ?? 0,
    expiresAt: getExpiry(now),
    lastUsedAt: now,
    userAgent: req.get?.("user-agent")?.slice(0, 500),
    ipAddress: req.ip?.slice(0, 100),
  });
  setRefreshCookie(res, sessionId, secret);
  return {
    token: createAccessToken(user),
    user: serializeUser(user),
  };
}

async function rotateAuthSession({ session, presentedHash, res, now }) {
  const nextSecret = createOpaqueToken();
  const updatedSession = await AuthSession.findOneAndUpdate(
    { _id: session._id, tokenHash: presentedHash },
    {
      $set: {
        tokenHash: hashToken(nextSecret),
        previousTokenHash: presentedHash,
        previousTokenValidUntil: new Date(now.getTime() + ROTATION_GRACE_MS),
        lastUsedAt: now,
        expiresAt: getExpiry(now),
      },
    },
    { new: true },
  );

  if (updatedSession) {
    setRefreshCookie(res, session.sessionId, nextSecret);
    return updatedSession;
  }

  // A second tab may have refreshed the same cookie concurrently. The first
  // rotation remains authoritative and its Set-Cookie response updates all tabs.
  return AuthSession.findById(session._id);
}

async function revokePresentedSession(req, res) {
  const parsed = parseRefreshToken(readRefreshToken(req));
  clearRefreshCookie(res);
  if (!parsed) return;

  const session = await AuthSession.findOne({ sessionId: parsed.sessionId });
  if (!session) return;
  const presentedHash = hashToken(parsed.secret);
  const validCurrent = safeHashEquals(session.tokenHash, presentedHash);
  const validPrevious =
    session.previousTokenValidUntil > new Date() &&
    safeHashEquals(session.previousTokenHash, presentedHash);
  if (validCurrent || validPrevious) {
    await AuthSession.deleteOne({ _id: session._id });
  }
}

module.exports = {
  REFRESH_COOKIE_NAME,
  ROTATION_GRACE_MS,
  clearRefreshCookie,
  createAccessToken,
  createAuthSession,
  getCookieOptions,
  getSessionDays,
  hashToken,
  parseCookies,
  parseRefreshToken,
  readRefreshToken,
  revokePresentedSession,
  rotateAuthSession,
  safeHashEquals,
  serializeUser,
};
