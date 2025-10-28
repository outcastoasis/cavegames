// backend/middleware/checkAuth.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Token prüfen
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Kein gültiges Token übermittelt" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // enthält userId, username, role
    next();
  } catch (err) {
    console.error("Token ungültig:", err.message);
    res.status(401).json({ error: "Token ungültig oder abgelaufen" });
  }
};
