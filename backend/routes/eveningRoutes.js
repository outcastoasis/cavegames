const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/checkAuth");
const checkRole = require("../middleware/checkRole");
const { checkEveningRole } = require("../middleware/checkEveningRole");
const eveningController = require("../controllers/eveningController");
const { eveningPhotoUpload } = require("../middleware/eveningPhotoUpload");

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
  getEligibleUsers,
  deleteGroupPhoto,
  getGroupPhotoOriginal,
  uploadGroupPhoto,
} = require("../controllers/eveningController");

router.use(checkAuth);

router.get("/", getEvenings);
router.get("/archived", getArchivedEvenings);
router.post("/", checkRole("admin"), createEvening);
router.get("/:id", getEveningById);
router.get("/:id/eligible-users", getEligibleUsers);

// *** WICHTIG: Recalculate ZUERST ***
router.patch(
  "/:id/recalculate",
  checkEveningRole(["spielleiter", "admin"]),
  eveningController.recalculateEveningStats
);

router.patch(
  "/:id/status",
  checkEveningRole(["spielleiter", "admin"]),
  changeEveningStatus
);

router.post("/:id/participants", addParticipant);
router.delete("/:id/participants/:userId", removeParticipant);

router.get("/:id/games", getEveningGames);

router.post(
  "/:id/games",
  checkEveningRole(["spielleiter", "admin"]),
  addEveningGame
);

router.patch(
  "/:id/games/:gameEntryId",
  checkEveningRole(["spielleiter", "admin"]),
  updateEveningGame
);

router.delete(
  "/:id/games/:gameEntryId",
  checkEveningRole(["spielleiter", "admin"]),
  deleteEveningGame
);

// Abendfoto: Original-Download für Teilnehmer, Bearbeitung für Spielleiter/Admin.
router.get("/:id/group-photo/original", getGroupPhotoOriginal);

router.patch(
  "/:id/group-photo",
  checkEveningRole(["spielleiter", "admin"]),
  eveningPhotoUpload.single("file"),
  uploadGroupPhoto
);

router.delete(
  "/:id/group-photo",
  checkEveningRole(["spielleiter", "admin"]),
  deleteGroupPhoto,
);

// *** GENERISCHE UPDATE-ROUTE GANZ ZULETZT ***
router.patch("/:id", checkRole("admin"), updateEvening);

router.delete("/:id", checkRole("admin"), deleteEvening);

module.exports = router;
