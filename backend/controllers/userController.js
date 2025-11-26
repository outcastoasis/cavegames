const User = require("../models/User");
const bcrypt = require("bcrypt");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/uploadService");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-passwordHash").sort({ displayName: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Benutzer konnten nicht geladen werden" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id, "-passwordHash");
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
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });

    if (displayName) user.displayName = displayName;
    if (role) user.role = role;
    if (typeof active === "boolean") user.active = active;
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json({ message: "Benutzer aktualisiert" });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );

    if (!user)
      return res.status(404).json({ error: "Benutzer nicht gefunden" });

    res.json({ message: "Benutzer deaktiviert" });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Deaktivieren" });
  }
};

exports.uploadUserAvatar = async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "No file uploaded" });

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const folder = `spielabend/users/${id}`;
  const publicId = "avatar";

  // altes Bild löschen
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
};
