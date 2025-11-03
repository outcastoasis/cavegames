// middleware/checkEveningRole.js
const Evening = require("../models/Evening");
const Poll = require("../models/Poll");

// middleware/checkEveningRole.js
function checkEveningRole(role) {
  return async (req, res, next) => {
    // Abend-ID entweder aus Body oder URL-Param
    const eveningId = req.body?.eveningId || req.params.id;

    if (!eveningId) {
      return res.status(400).json({
        error: "Abend-ID fehlt",
        details:
          "Für diese Aktion muss ein eveningId im Body oder URL-Parameter übermittelt werden.",
      });
    }

    try {
      const abend = await Evening.findById(eveningId);
      if (!abend) {
        return res.status(404).json({ error: "Abend nicht gefunden" });
      }

      if (role === "spielleiter") {
        if (abend.spielleiterId.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            error: "Zugriff verweigert",
            details: "Nur der Spielleiter dieses Abends darf das.",
          });
        }
      }

      req.evening = abend;
      next();
    } catch (err) {
      console.error("❌ Fehler in checkEveningRole:", err);
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
      if (!poll) {
        return res.status(404).json({
          error: "Poll nicht gefunden",
          details: `ID: ${req.params.id}`,
        });
      }

      const abend = await Evening.findById(poll.eveningId);
      if (!abend) {
        return res.status(404).json({
          error: "Abend nicht gefunden",
          details: "Verknüpfter Abend nicht vorhanden.",
        });
      }

      if (role === "spielleiter") {
        if (abend.spielleiterId.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            error: "Nur der Spielleiter darf diese Umfrage finalisieren",
          });
        }
      }

      req.evening = abend;
      req.poll = poll;

      console.log("✅ checkPollRole durchlaufen:", poll._id, req.user);
      next();
    } catch (err) {
      console.error("❌ Fehler in checkPollRole:", err);
      return res.status(500).json({
        error: "Middleware-Fehler",
        details: err.message,
      });
    }
  };
}

module.exports = {
  checkEveningRole,
  checkPollRole,
};
