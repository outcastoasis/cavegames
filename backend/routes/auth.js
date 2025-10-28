// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const checkAuth = require("../middleware/checkAuth");

// Registrierung
router.post("/register", register);
router.post("/login", login);

router.get("/me", checkAuth, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Abrufen des Profils" });
  }
});

module.exports = router;
