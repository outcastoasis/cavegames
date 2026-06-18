const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/checkAuth");
const checkRole = require("../middleware/checkRole");
const {
  getGames,
  createGame,
  getGameById,
  updateGame,
  deleteGame,
} = require("../controllers/gameController");

// alle benötigen Auth
router.use(checkAuth);

router.get("/", getGames);
router.post("/", createGame);
router.get("/:id", getGameById);
router.patch("/:id", checkRole("admin"), updateGame);
router.delete("/:id", checkRole("admin"), deleteGame);

module.exports = router;
