// routes/pollRoutes.js
const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/checkAuth");
const checkRole = require("../middleware/checkRole");

const {
  createPoll,
  getPoll,
  getAllPolls,
  votePoll,
  finalizePoll,
  deletePoll,
  reopenPoll,
} = require("../controllers/pollController");
const {
  checkEveningRole,
  checkPollRole,
} = require("../middleware/checkEveningRole");

// 🔒 Auth gilt für alle Poll-Routen
router.use(checkAuth);

// Routen
router.post("/", checkEveningRole(["spielleiter", "admin"]), createPoll); // Umfrage anlegen
router.get("/:id", getPoll); // Umfrage anzeigen
router.patch("/:id/vote", votePoll); // Stimme abgeben
router.patch("/:id/finalize", checkPollRole("spielleiter"), finalizePoll);
router.patch("/:id/reopen", checkRole("admin"), reopenPoll);
router.delete("/:id", checkRole("admin"), deletePoll); // Löschen (Admin-only)
router.get("/", getAllPolls);

module.exports = router;
