const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/checkAuth");
const checkRole = require("../middleware/checkRole");
const { checkEveningRole } = require("../middleware/checkEveningRole");
const eveningController = require("../controllers/eveningController");

const {
  getEvenings,
  createEvening,
  getEveningById,
  updateEvening,
  deleteEvening,
  changeEveningStatus,
  addParticipant,
  removeParticipant,
  getEveningGames,
  addEveningGame,
  updateEveningGame,
  deleteEveningGame,
  getArchivedEvenings,
} = require("../controllers/eveningController");

router.use(checkAuth);

router.get("/", getEvenings);
router.get("/archived", getArchivedEvenings);
router.post("/", checkRole("admin"), createEvening);
router.get("/:id", getEveningById);
router.patch("/:id", updateEvening);
router.delete("/:id", checkRole("admin"), deleteEvening);
router.patch("/:id/status", checkRole("admin"), changeEveningStatus);
router.post("/:id/participants", addParticipant);
router.delete("/:id/participants/:userId", removeParticipant);
router.patch("/:id/recalculate", eveningController.recalculateEveningStats);

router.get("/:id/games", getEveningGames);
router.post("/:id/games", checkEveningRole("spielleiter"), addEveningGame);
router.patch(
  "/:id/games/:gameEntryId",
  checkEveningRole("spielleiter"),
  updateEveningGame
);
router.delete(
  "/:id/games/:gameEntryId",
  checkEveningRole("spielleiter"),
  deleteEveningGame
);

module.exports = router;
