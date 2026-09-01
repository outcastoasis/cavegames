const multer = require("multer");
const path = require("path");
const os = require("os");

const MAX_EVENING_PHOTO_BYTES = 10 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
]);

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  ".avif",
]);

const eveningPhotoUpload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: MAX_EVENING_PHOTO_BYTES,
    files: 1,
  },
  fileFilter(req, file, cb) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const isAllowed =
      allowedMimeTypes.has(file.mimetype) || allowedExtensions.has(extension);

    if (isAllowed) return cb(null, true);
    return cb(new Error("UNSUPPORTED_IMAGE_TYPE"));
  },
});

module.exports = { eveningPhotoUpload, MAX_EVENING_PHOTO_BYTES };
