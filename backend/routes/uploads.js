const express = require("express");
const router = express.Router();
const cloudinary = require("../config/cloudinary");

router.get("/signature", (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder: "spielabend/direct-upload",
    },
    cloudinary.config().api_secret
  );

  res.json({
    timestamp,
    signature,
    cloudName: cloudinary.config().cloud_name,
    apiKey: cloudinary.config().api_key,
  });
});

module.exports = router;
