// backend/routes/statsRoutes.js
const express = require("express");
const router = express.Router();
const {
  getLeaderboard,
  getUserStats,
  getEveningStats,
  getGameStats,
} = require("../controllers/statsController");

// Optional: Middleware (z. B. checkAuth) einfügen
// const checkAuth = require("../middleware/checkAuth");
// router.use(checkAuth);

router.get("/leaderboard", getLeaderboard);
router.get("/user/:userId", getUserStats);
router.get("/evenings", getEveningStats);
router.get("/games", getGameStats);

module.exports = router;
