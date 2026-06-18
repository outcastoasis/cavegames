const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/checkAuth");
const checkRole = require("../middleware/checkRole");
const {
  regenerateTestUsers,
  resetAllTestData,
  resetTestEveningData,
} = require("../controllers/testModeController");

router.use(checkAuth);
router.use(checkRole("admin"));

router.delete("/evenings", resetTestEveningData);
router.delete("/all", resetAllTestData);
router.post("/users", regenerateTestUsers);

module.exports = router;
