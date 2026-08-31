const { rateLimit } = require("express-rate-limit");

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 10;

function createLoginRateLimit(overrides = {}) {
  return rateLimit({
    windowMs: LOGIN_WINDOW_MS,
    limit: LOGIN_ATTEMPT_LIMIT,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error:
        "Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuche es in 15 Minuten erneut.",
    },
    ...overrides,
  });
}

const loginRateLimit = createLoginRateLimit();

module.exports = {
  LOGIN_ATTEMPT_LIMIT,
  LOGIN_WINDOW_MS,
  createLoginRateLimit,
  loginRateLimit,
};
