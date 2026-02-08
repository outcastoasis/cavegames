const cloudinary = require("../config/cloudinary");

async function uploadToCloudinary(filePath, folder, publicId = null) {
  return cloudinary.uploader.upload(filePath, {
    folder,
    public_id: publicId ?? undefined,
    overwrite: true,
    resource_type: "image",

    // Einheitliches, UI-taugliches Profilbild
    transformation: [
      { width: 1024, height: 1024, crop: "limit" }, // nur verkleinern, kein Upscale
      { quality: "auto:good" },
      { fetch_format: "auto" },
    ],
  });
}

async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary deletion failed:", err);
  }
}

module.exports = { uploadToCloudinary, deleteFromCloudinary };
