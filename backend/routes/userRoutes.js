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

module.exports = router;
