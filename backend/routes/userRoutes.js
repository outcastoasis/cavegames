const express = require("express");
const router = express.Router();

const User = require("../models/User");
const checkAuth = require("../middleware/checkAuth");
const checkRole = require("../middleware/checkRole");

// GET /api/users → nur für Admins
router.get("/", checkAuth, checkRole("admin"), async (req, res) => {
  try {
    const users = await User.find({}, "-passwordHash").sort({ displayName: 1 });
    res.json(users);
  } catch (err) {
    console.error("Fehler beim Abrufen der Benutzer:", err.message);
    res.status(500).json({ error: "Benutzer konnten nicht geladen werden" });
  }
});

// GET /api/users/:id – Einzelner Benutzer
router.get("/:id", checkAuth, checkRole("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id, "-passwordHash");
    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden des Benutzers" });
  }
});

// POST /api/users – Benutzer erstellen
router.post("/", checkAuth, checkRole("admin"), async (req, res) => {
  const { username, displayName, password, role } = req.body;
  if (!username || !displayName || !password || !role) {
    return res.status(400).json({ error: "Alle Felder sind erforderlich" });
  }

  try {
    const existing = await User.findOne({ username });
    if (existing)
      return res.status(409).json({ error: "Benutzername bereits vergeben" });

    const bcrypt = require("bcrypt");
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      displayName,
      passwordHash,
      role,
      active: true,
    });

    await newUser.save();
    res.status(201).json({ message: "Benutzer erstellt" });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Erstellen des Benutzers" });
  }
});

// PATCH /api/users/:id – Benutzer bearbeiten
router.patch("/:id", checkAuth, checkRole("admin"), async (req, res) => {
  const { displayName, role, active, password } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });

    if (displayName) user.displayName = displayName;
    if (role) user.role = role;
    if (typeof active === "boolean") user.active = active;
    if (password) {
      const bcrypt = require("bcrypt");
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json({ message: "Benutzer aktualisiert" });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

// DELETE /api/users/:id – Benutzer deaktivieren
router.delete("/:id", checkAuth, checkRole("admin"), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );

    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });

    res.json({ message: "Benutzer deaktiviert" });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Deaktivieren" });
  }
});

module.exports = router;
