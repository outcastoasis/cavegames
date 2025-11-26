const multer = require("multer");
const path = require("path");
const os = require("os");

const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
  fileFilter(req, file, cb) {
    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG/PNG are allowed"));
    }
    cb(null, true);
  },
});

module.exports = upload;
