const EDITABLE_EVENING_PHOTO_STATUSES = new Set([
  "fixiert",
  "abgeschlossen",
]);

function canModifyEveningPhoto(evening, user) {
  if (!evening || !user) return false;
  if (evening.status === "gesperrt") return user.role === "admin";
  return EDITABLE_EVENING_PHOTO_STATUSES.has(evening.status);
}

function isEveningPhotoParticipant(evening, user) {
  if (!evening || !user) return false;
  if (user.role === "admin") return true;

  const userId = user._id?.toString();
  return (evening.participantIds || []).some(
    (participantId) =>
      participantId?._id?.toString() === userId ||
      participantId?.toString() === userId,
  );
}

function getEveningPhotoData(evening) {
  if (!evening?.groupPhotoPublicId) return null;
  return {
    publicId: evening.groupPhotoPublicId,
    version: evening.groupPhotoVersion,
    format: evening.groupPhotoFormat,
    width: evening.groupPhotoWidth,
    height: evening.groupPhotoHeight,
  };
}

module.exports = {
  EDITABLE_EVENING_PHOTO_STATUSES,
  canModifyEveningPhoto,
  getEveningPhotoData,
  isEveningPhotoParticipant,
};
