const { randomUUID } = require("crypto");
const cloudinary = require("../config/cloudinary");

const EVENING_PHOTO_WIDTHS = [480, 960, 1600];

function buildOptimizedPhotoUrl({ publicId, version, width }) {
  if (!publicId) return null;

  return cloudinary.url(publicId, {
    secure: true,
    resource_type: "image",
    type: "upload",
    version: version || undefined,
    transformation: [
      { width, height: width, crop: "limit" },
      { quality: "auto:good" },
      { fetch_format: "auto" },
    ],
  });
}

function buildOriginalPhotoUrl({ publicId, version, format }) {
  if (!publicId) return null;

  return cloudinary.url(publicId, {
    secure: true,
    resource_type: "image",
    type: "upload",
    version: version || undefined,
    format: format || undefined,
  });
}

function buildEveningPhotoPresentation(photo) {
  if (!photo?.publicId) return null;

  const sources = EVENING_PHOTO_WIDTHS.map((width) => ({
    width,
    url: buildOptimizedPhotoUrl({ ...photo, width }),
  }));

  return {
    url: sources.at(-1).url,
    srcSet: sources.map(({ width, url }) => `${url} ${width}w`).join(", "),
    width: photo.width || null,
    height: photo.height || null,
  };
}

async function uploadEveningPhotoOriginal(filePath, eveningId) {
  const randomId = randomUUID().replaceAll("-", "");

  return cloudinary.uploader.upload(filePath, {
    folder: `spielabend/evenings/${eveningId}`,
    public_id: `group-photo-${randomId}`,
    overwrite: false,
    resource_type: "image",
  });
}

async function deleteEveningPhoto(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}

module.exports = {
  EVENING_PHOTO_WIDTHS,
  buildEveningPhotoPresentation,
  buildOptimizedPhotoUrl,
  buildOriginalPhotoUrl,
  deleteEveningPhoto,
  uploadEveningPhotoOriginal,
};
