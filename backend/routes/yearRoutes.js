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
router.use(checkRole("admin"));

router.get("/", getYears);
router.post("/", createYear);
router.get("/:year", getYearDetails);
router.post("/:year/close", closeYear);

module.exports = router;
