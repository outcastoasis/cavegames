const express = require("express");
const router = express.Router();
const {
  getYears,
  createYear,
  getYearDetails,
  getYearClosePreview,
  closeYear,
} = require("../controllers/yearController");

const checkAuth = require("../middleware/checkAuth");
const checkRole = require("../middleware/checkRole");

router.use(checkAuth);

// 🔓 Für alle Spieler sichtbar
router.get("/", getYears);
router.get("/:year", getYearDetails);

// 🔒 Nur Admin
router.post("/", checkRole("admin"), createYear);
router.get("/:year/close-preview", checkRole("admin"), getYearClosePreview);
router.post("/:year/close", checkRole("admin"), closeYear);

module.exports = router;
