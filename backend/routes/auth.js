// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const {
  bootstrapSession,
  login,
  logout,
  refresh,
} = require("../controllers/authController");
const checkAuth = require("../middleware/checkAuth");
const checkAuthOrigin = require("../middleware/checkAuthOrigin");
const { loginRateLimit } = require("../middleware/loginRateLimit");
const User = require("../models/User");

router.post("/login", loginRateLimit, login);
router.post("/refresh", checkAuthOrigin, refresh);
router.post("/logout", checkAuthOrigin, logout);
// Migrates still-valid 12-hour tokens from deployments before refresh sessions.
router.post("/session", checkAuthOrigin, checkAuth, bootstrapSession);

router.get("/me", checkAuth, async (req, res) => {
  try {
    const fullUser = await User.findById(req.user._id).select("-passwordHash");
    res.json({ user: fullUser });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Abrufen des Profils" });
  }
});

module.exports = router;
