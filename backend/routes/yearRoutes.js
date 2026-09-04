const express = require("express");
const router = express.Router();
const {
  getYears,
  getCurrentYear,
  createYear,
  activateYear,
  getYearDetails,
  getYearClosePreview,
  closeYear,
  deleteYear,
} = require("../controllers/yearController");

const checkAuth = require("../middleware/checkAuth");
const checkRole = require("../middleware/checkRole");

router.use(checkAuth);

// 🔓 Für alle Spieler sichtbar
router.get("/", getYears);
router.get("/current", getCurrentYear);
router.get("/:year", getYearDetails);

// 🔒 Nur Admin
router.post("/", checkRole("admin"), createYear);
router.post("/:year/activate", checkRole("admin"), activateYear);
router.get("/:year/close-preview", checkRole("admin"), getYearClosePreview);
router.post("/:year/close", checkRole("admin"), closeYear);
router.delete("/:year", checkRole("admin"), deleteYear);

module.exports = router;
