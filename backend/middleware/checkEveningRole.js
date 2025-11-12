// middleware/checkEveningRole.js
const Evening = require("../models/Evening");
const Poll = require("../models/Poll");

function checkEveningRole(allowedRoles) {
  return async (req, res, next) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const eveningId = req.body?.eveningId || req.params.id;

    if (!eveningId) {
      return res.status(400).json({ error: "Abend-ID fehlt" });
    }

    try {
      const abend = await Evening.findById(eveningId);
      if (!abend)
        return res.status(404).json({ error: "Abend nicht gefunden" });

      const userId = req.user._id?.toString();
      const isSpielleiter = abend.spielleiterId?.toString() === userId;
      const isAdmin = req.user.role === "admin";

      const authorized =
        (roles.includes("spielleiter") && isSpielleiter) ||
        (roles.includes("admin") && isAdmin);

      if (!authorized) {
        return res
          .status(403)
          .json({ error: "Keine Berechtigung für diese Aktion" });
      }

      req.evening = abend;
      next();
    } catch (err) {
      console.error("Fehler in checkEveningRole:", err);
      res
        .status(500)
        .json({ error: "Middleware-Fehler", details: err.message });
    }
  };
}

function checkPollRole(role) {
  return async (req, res, next) => {
    try {
      const poll = await Poll.findById(req.params.id);
      if (!poll) return res.status(404).json({ error: "Poll nicht gefunden" });

      const abend = await Evening.findById(poll.eveningId);
      if (!abend)
        return res.status(404).json({ error: "Abend nicht gefunden" });

      const isSpielleiter =
        abend.spielleiterId?.toString() === req.user._id?.toString();
      const isAdmin = req.user.role === "admin";

      if (role === "spielleiter" && !(isSpielleiter || isAdmin)) {
        return res
          .status(403)
          .json({ error: "Nur Spielleiter oder Admin dürfen das" });
      }

      req.evening = abend;
      req.poll = poll;
      next();
    } catch (err) {
      console.error("Fehler in checkPollRole:", err);
      res
        .status(500)
        .json({ error: "Middleware-Fehler", details: err.message });
    }
  };
}

module.exports = { checkEveningRole, checkPollRole };
