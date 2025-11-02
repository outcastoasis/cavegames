const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
} = require("../controllers/userController");

const checkAuth = require("../middleware/checkAuth");
const checkRole = require("../middleware/checkRole");

router.use(checkAuth);
router.use(checkRole("admin"));

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.patch("/:id", updateUser);
router.delete("/:id", deactivateUser);

module.exports = router;
