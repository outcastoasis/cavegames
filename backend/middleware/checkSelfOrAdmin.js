module.exports = function checkSelfOrAdmin(req, res, next) {
  const loggedInUserId = req.user._id?.toString();
  const targetUserId = req.params.id;

  // Admin darf alles
  if (req.user.role === "admin") return next();

  // Spieler darf nur sich selbst ändern
  if (loggedInUserId === targetUserId) return next();

  return res.status(403).json({ error: "Keine Berechtigung" });
};
