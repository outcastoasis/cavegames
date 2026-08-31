// backend/controllers/authController.js
const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

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

    // Token generieren (gültig für 12h)
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0,
      },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      },
    });
  } catch (err) {
    console.error("Login-Fehler:", err.message);
    res.status(500).json({ error: "Serverfehler beim Login" });
  }
};
