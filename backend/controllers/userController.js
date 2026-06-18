const User = require("../models/User");
const bcrypt = require("bcrypt");
const fs = require("fs");

const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/uploadService");
const { scopedFilter } = require("../utils/testMode");
const { ensureTestUsers } = require("../utils/testUsers");

exports.getAllUsers = async (req, res) => {
  try {
    if (req.isTestMode) {
      await ensureTestUsers();

      const [currentUser, testUsers] = await Promise.all([
        User.findById(req.user._id, "-passwordHash"),
        User.find({ isTestData: true }, "-passwordHash").sort({
          displayName: 1,
        }),
      ]);

      return res.json(currentUser ? [currentUser, ...testUsers] : testUsers);
    }

    const users = await User.find(scopedFilter(req), "-passwordHash").sort({
      displayName: 1,
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Benutzer konnten nicht geladen werden" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne(
      scopedFilter(req, { _id: req.params.id }),
      "-passwordHash",
    );
    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden des Benutzers" });
  }
};

exports.createUser = async (req, res) => {
  const { username, displayName, password, role } = req.body;
  if (!username || !displayName || !password || !role) {
    return res.status(400).json({ error: "Alle Felder sind erforderlich" });
  }

  try {
    const existing = await User.findOne({ username });
    if (existing)
      return res.status(409).json({ error: "Benutzername bereits vergeben" });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      displayName,
      passwordHash,
      role,
      active: true,
      isTestData: req.isTestMode,
    });

    await newUser.save();
    res.status(201).json({ message: "Benutzer erstellt" });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Erstellen des Benutzers" });
  }
};

exports.updateUser = async (req, res) => {
  const { displayName, role, active, password } = req.body;

  try {
    const user = await User.findOne(scopedFilter(req, { _id: req.params.id }));
    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });

    if (
      typeof active === "boolean" &&
      active === false &&
      req.params.id.toString() === req.user._id.toString()
    ) {
      return res
        .status(400)
        .json({ error: "Du kannst dich nicht selbst deaktivieren" });
    }

    if (displayName) user.displayName = displayName;
    if (role) user.role = role;
    if (typeof active === "boolean") user.active = active;
    if (password) user.passwordHash = await bcrypt.hash(password, 10);

    await user.save();
    res.json({ message: "Benutzer aktualisiert" });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id.toString() === req.user._id.toString()) {
      return resö
        .status(400)
        .json({ error: "Du kannst dich nicht selbst löschen" });
    }

    const user = await User.findOneAndDelete(
      scopedFilter(req, { _id: req.params.id }),
    );

    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });

    if (user.profileImagePublicId) {
      await deleteFromCloudinary(user.profileImagePublicId);
    }

    res.json({ message: "Benutzer gelöscht" });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
};

exports.removeUserAvatar = async (req, res) => {
  try {
    const user = await User.findOne(scopedFilter(req, { _id: req.params.id }));
    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });

    if (user.profileImagePublicId) {
      await deleteFromCloudinary(user.profileImagePublicId);
    }

    user.profileImageUrl = undefined;
    user.profileImagePublicId = undefined;
    await user.save();

    res.json({ message: "Profilbild entfernt" });
  } catch (err) {
    res.status(500).json({ error: "Profilbild konnte nicht entfernt werden" });
  }
};

exports.uploadUserAvatar = async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const user = await User.findOne(scopedFilter(req, { _id: id }));
    if (!user) return res.status(404).json({ error: "User not found" });

    const folder = `spielabend/users/${id}`;
    const publicId = "avatar";

    if (user.profileImagePublicId) {
      await deleteFromCloudinary(user.profileImagePublicId);
    }

    const result = await uploadToCloudinary(file.path, folder, publicId);

    user.profileImageUrl = result.secure_url;
    user.profileImagePublicId = result.public_id;
    await user.save();

    res.json({
      message: "Profile image updated",
      url: result.secure_url,
    });
  } catch (err) {
    const msg = err?.message?.toLowerCase() || "";

    if (msg.includes("file too large")) {
      return res.status(413).json({ error: "Bild ist zu gross" });
    }

    if (msg.includes("unsupported image type")) {
      return res.status(415).json({ error: "Bildformat nicht unterstützt" });
    }

    console.error("uploadUserAvatar error:", err);
    res.status(500).json({ error: "Fehler beim Hochladen" });
  } finally {
    // temporäre Datei entfernen
    if (file?.path) {
      fs.unlink(file.path, () => {});
    }
  }
};
