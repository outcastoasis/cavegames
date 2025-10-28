// backend/controllers/authController.js
const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { username, displayName, password } = req.body;

    // 1. Eingaben prüfen
    if (!username || !displayName || !password) {
      return res.status(400).json({ error: "Alle Felder sind erforderlich" });
    }

    // 2. Existiert Benutzer bereits?
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Benutzername bereits vergeben" });
    }

    // 3. Passwort hashen
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Benutzer speichern
    const newUser = await User.create({
      username,
      displayName,
      passwordHash,
    });

    // 5. Erfolg
    res.status(201).json({
      message: "Benutzer erfolgreich registriert",
      user: {
        _id: newUser._id,
        username: newUser.username,
        displayName: newUser.displayName,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("Fehler bei Registrierung:", err.message);
    res.status(500).json({ error: "Serverfehler bei Registrierung" });
  }
};

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
    const user = await User.findOne({ username, active: true });
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
      },
    });
  } catch (err) {
    console.error("Login-Fehler:", err.message);
    res.status(500).json({ error: "Serverfehler beim Login" });
  }
};
