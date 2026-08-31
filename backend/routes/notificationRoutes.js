const express = require("express");
const checkAuth = require("../middleware/checkAuth");
const {
  getPublicKey,
  getPreferences,
  removeSubscription,
  saveSubscription,
  updatePreferences,
} = require("../controllers/notificationController");

const router = express.Router();

router.use(checkAuth);
router.get("/vapid-public-key", getPublicKey);
router.get("/preferences", getPreferences);
router.patch("/preferences", updatePreferences);
router.post("/subscriptions", saveSubscription);
router.delete("/subscriptions", removeSubscription);

module.exports = router;
