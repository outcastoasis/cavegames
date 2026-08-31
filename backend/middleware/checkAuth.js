// backend/middleware/checkAuth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Token prüfen
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Kein gültiges Token übermittelt" });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error("Token ungültig:", err.message);
    return res.status(401).json({ error: "Token ungültig oder abgelaufen" });
  }

  try {
    const currentUser = await User.findOne(
      {
        _id: decoded.userId,
        active: true,
        isTestData: { $ne: true },
      },
      "_id username role tokenVersion",
    );

    if (!currentUser) {
      return res.status(401).json({
        error: "Benutzer nicht mehr aktiv oder vorhanden",
      });
    }

    const tokenVersion = decoded.tokenVersion ?? 0;
    const currentTokenVersion = currentUser.tokenVersion ?? 0;
    if (tokenVersion !== currentTokenVersion) {
      return res.status(401).json({
        error: "Sitzung nicht mehr gültig. Bitte erneut anmelden",
      });
    }

    req.user = {
      _id: currentUser._id,
      username: currentUser.username,
      role: currentUser.role,
    };
    return next();
  } catch (err) {
    console.error("Benutzerstatus konnte nicht geprüft werden:", err.message);
    return res.status(500).json({
      error: "Authentifizierung konnte nicht geprüft werden",
    });
  }
};
