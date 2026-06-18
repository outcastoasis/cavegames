const Evening = require("../models/Evening");
const Game = require("../models/Game");
const Poll = require("../models/Poll");
const User = require("../models/User");
const UserStat = require("../models/UserStat");
const { ensureTestUsers } = require("../utils/testUsers");

exports.resetTestEveningData = async (req, res) => {
  try {
    await Promise.all([
      Poll.deleteMany({ isTestData: true }),
      Evening.deleteMany({ isTestData: true }),
      UserStat.deleteMany({ isTestData: true }),
    ]);

    res.json({ message: "Testabend-Daten wurden gelöscht" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Testabend-Daten konnten nicht gelöscht werden" });
  }
};

exports.resetAllTestData = async (req, res) => {
  try {
    await Promise.all([
      Poll.deleteMany({ isTestData: true }),
      Evening.deleteMany({ isTestData: true }),
      UserStat.deleteMany({ isTestData: true }),
      Game.deleteMany({ isTestData: true }),
      User.deleteMany({ isTestData: true }),
    ]);

    res.json({ message: "Alle Testdaten wurden gelöscht" });
  } catch (err) {
    res.status(500).json({ error: "Testdaten konnten nicht gelöscht werden" });
  }
};

exports.regenerateTestUsers = async (req, res) => {
  try {
    await ensureTestUsers();
    const users = await User.find({ isTestData: true }, "-passwordHash").sort({
      displayName: 1,
    });
    res.json({ message: "Testspieler wurden erzeugt", users });
  } catch (err) {
    res.status(500).json({ error: "Testspieler konnten nicht erzeugt werden" });
  }
};
