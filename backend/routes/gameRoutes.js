const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/checkAuth");
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
router.patch("/:id", updateGame);
router.delete("/:id", deleteGame);

module.exports = router;
