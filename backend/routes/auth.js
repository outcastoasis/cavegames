// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const { login } = require("../controllers/authController");
const checkAuth = require("../middleware/checkAuth");
const { loginRateLimit } = require("../middleware/loginRateLimit");
const User = require("../models/User");

router.post("/login", loginRateLimit, login);

router.get("/me", checkAuth, async (req, res) => {
  try {
    const fullUser = await User.findById(req.user._id).select("-passwordHash");
    res.json({ user: fullUser });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Abrufen des Profils" });
  }
});

module.exports = router;
