// backend/controllers/authController.js
const bcrypt = require("bcrypt");
const User = require("../models/User");
const AuthSession = require("../models/AuthSession");
const {
  clearRefreshCookie,
  createAccessToken,
  createAuthSession,
  hashToken,
  parseRefreshToken,
  readRefreshToken,
  revokePresentedSession,
  rotateAuthSession,
  safeHashEquals,
  serializeUser,
} = require("../services/authSessionService");

function noStore(res) {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
}

async function getRefreshSession(req, res) {
  const parsed = parseRefreshToken(readRefreshToken(req));
  if (!parsed) return null;

  const session = await AuthSession.findOne({ sessionId: parsed.sessionId });
  if (!session) return null;

  const now = new Date();
  if (session.expiresAt <= now) {
    await AuthSession.deleteOne({ _id: session._id });
    return null;
  }

  const presentedHash = hashToken(parsed.secret);
  const currentToken = safeHashEquals(session.tokenHash, presentedHash);
  const previousToken =
    session.previousTokenValidUntil > now &&
    safeHashEquals(session.previousTokenHash, presentedHash);

  if (!currentToken && !previousToken) {
    // A valid session identifier with an unknown secret indicates token reuse.
    await AuthSession.deleteOne({ _id: session._id });
    return null;
  }

  return { session, presentedHash, currentToken, now };
}

// Login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Eingabe prüfen
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Benutzername & Passwort erforderlich" });
    }

    // Benutzer finden
    const user = await User.findOne({
      username,
      active: true,
      isTestData: { $ne: true },
    });
    if (!user) {
      return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }

    // Passwort prüfen
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }

    const auth = await createAuthSession({ user, req, res });
    noStore(res);
    res.status(200).json(auth);
  } catch (err) {
    console.error("Login-Fehler:", err.message);
    res.status(500).json({ error: "Serverfehler beim Login" });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refresh = await getRefreshSession(req, res);
    if (!refresh) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: "Sitzung abgelaufen" });
    }

    const user = await User.findOne({
      _id: refresh.session.userId,
      active: true,
      isTestData: { $ne: true },
    });
    if (
      !user ||
      (user.tokenVersion ?? 0) !== (refresh.session.tokenVersion ?? 0)
    ) {
      await AuthSession.deleteOne({ _id: refresh.session._id });
      clearRefreshCookie(res);
      return res.status(401).json({ error: "Sitzung nicht mehr gültig" });
    }

    if (refresh.currentToken) {
      const rotated = await rotateAuthSession({
        session: refresh.session,
        presentedHash: refresh.presentedHash,
        res,
        now: refresh.now,
      });
      const previousStillValid =
        rotated?.previousTokenValidUntil > refresh.now &&
        safeHashEquals(rotated?.previousTokenHash, refresh.presentedHash);
      if (!rotated || !previousStillValid) {
        clearRefreshCookie(res);
        return res.status(401).json({ error: "Sitzung konnte nicht erneuert werden" });
      }
    } else {
      await AuthSession.updateOne(
        { _id: refresh.session._id },
        { $set: { lastUsedAt: refresh.now } },
      );
    }

    noStore(res);
    return res.json(createSessionResponse(user));
  } catch (err) {
    console.error("Sitzung konnte nicht erneuert werden:", err.message);
    return res.status(500).json({ error: "Sitzung konnte nicht erneuert werden" });
  }
};

function createSessionResponse(user) {
  return { token: createAccessToken(user), user: serializeUser(user) };
}

exports.bootstrapSession = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user._id,
      active: true,
      isTestData: { $ne: true },
    });
    if (!user) return res.status(401).json({ error: "Benutzer nicht gefunden" });

    const auth = await createAuthSession({ user, req, res });
    noStore(res);
    return res.status(201).json(auth);
  } catch (err) {
    console.error("Sitzungsmigration fehlgeschlagen:", err.message);
    return res.status(500).json({ error: "Sitzung konnte nicht erstellt werden" });
  }
};

exports.logout = async (req, res) => {
  try {
    await revokePresentedSession(req, res);
    noStore(res);
    return res.status(204).send();
  } catch (err) {
    console.error("Logout-Fehler:", err.message);
    clearRefreshCookie(res);
    return res.status(204).send();
  }
};
