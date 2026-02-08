const multer = require("multer");
const path = require("path");
const os = require("os");

const upload = multer({
  dest: os.tmpdir(),

  // Grössere Originale zulassen – Cloudinary verkleinert später
  limits: {
    fileSize: 8 * 1024 * 1024, // 8 MB
  },

  fileFilter(req, file, cb) {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/avif",
    ];

    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".heic",
      ".heif",
      ".avif",
    ];

    const ext = path.extname(file.originalname || "").toLowerCase();

    // Einige Clients senden HEIC als application/octet-stream → Endung prüfen
    if (
      allowedMimeTypes.includes(file.mimetype) ||
      allowedExtensions.includes(ext)
    ) {
      return cb(null, true);
    }

    return cb(new Error("Unsupported image type"));
  },
});

module.exports = upload;
