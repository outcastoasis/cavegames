const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/checkAuth");
const checkRole = require("../middleware/checkRole");

const {
  getEvenings,
  createEvening,
  getEveningById,
  updateEvening,
  deleteEvening,
  changeEveningStatus,
  addParticipant,
  removeParticipant,
} = require("../controllers/eveningController");

router.use(checkAuth);

// Admin kann alle abende sehen/anlegen/löschen
router.get("/", getEvenings);
router.post("/", checkRole("admin"), createEvening);
router.get("/:id", getEveningById);
router.patch("/:id", updateEvening);
router.delete("/:id", checkRole("admin"), deleteEvening);
router.patch("/:id/status", checkRole("admin"), changeEveningStatus);
router.post("/:id/participants", addParticipant);
router.delete("/:id/participants/:userId", removeParticipant);

module.exports = router;
