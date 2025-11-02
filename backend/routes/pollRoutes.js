// routes/pollRoutes.js
const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/checkAuth");
const checkRole = require("../middleware/checkRole");

const {
  createPoll,
  getPoll,
  votePoll,
  finalizePoll,
  deletePoll,
} = require("../controllers/pollController");
const {
  checkEveningRole,
  checkPollRole,
} = require("../middleware/checkEveningRole");

// 🔒 Auth gilt für alle Poll-Routen
router.use(checkAuth);

// Routen
router.post("/", checkEveningRole("spielleiter"), createPoll); // Umfrage anlegen
router.get("/:id", getPoll); // Umfrage anzeigen
router.patch("/:id/vote", votePoll); // Stimme abgeben
router.patch("/:id/finalize", checkPollRole("spielleiter"), finalizePoll);
router.delete("/:id", checkRole("admin"), deletePoll); // Löschen (Admin-only)

module.exports = router;
