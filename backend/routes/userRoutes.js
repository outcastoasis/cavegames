const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const checkAuth = require("../middleware/checkAuth");
const checkRole = require("../middleware/checkRole");
const checkSelfOrAdmin = require("../middleware/checkSelfOrAdmin");

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  uploadUserAvatar,
  removeUserAvatar,
} = require("../controllers/userController");

// Alle Routen benötigen Login
router.use(checkAuth);

// ==============================
//      ADMIN-Routen
// ==============================
router.get("/", checkRole("admin"), getAllUsers);
router.get("/:id", checkRole("admin"), getUserById);
router.post("/", checkRole("admin"), createUser);
router.patch("/:id", checkRole("admin"), updateUser);
router.delete("/:id", checkRole("admin"), deleteUser);
router.delete("/:id/avatar", checkRole("admin"), removeUserAvatar);

// ==============================
//      Avatar Upload (Admin + User selbst)
// ==============================
router.patch(
  "/:id/avatar",
  checkSelfOrAdmin,
  upload.single("file"),
  uploadUserAvatar
);

module.exports = router;
