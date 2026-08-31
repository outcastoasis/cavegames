const express = require("express");
const checkAuth = require("../middleware/checkAuth");
const {
  getPublicKey,
  removeSubscription,
  saveSubscription,
} = require("../controllers/notificationController");

const router = express.Router();

router.use(checkAuth);
router.get("/vapid-public-key", getPublicKey);
router.post("/subscriptions", saveSubscription);
router.delete("/subscriptions", removeSubscription);

module.exports = router;
