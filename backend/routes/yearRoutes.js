const express = require("express");
const router = express.Router();
const {
  getYears,
  createYear,
  getYearDetails,
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
router.post("/:year/close", checkRole("admin"), closeYear);

module.exports = router;
