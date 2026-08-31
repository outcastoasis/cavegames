const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");

const TEST_USERS = [
  { username: "test_alex", displayName: "Test Alex" },
  { username: "test_ben", displayName: "Test Ben" },
  { username: "test_chris", displayName: "Test Chris" },
  { username: "test_dana", displayName: "Test Dana" },
];

async function ensureTestUsers() {
  const randomPassword = crypto.randomBytes(32).toString("base64url");
  const passwordHash = await bcrypt.hash(randomPassword, 10);
  await Promise.all(
    TEST_USERS.map((testUser) =>
      User.updateOne(
        { username: testUser.username },
        {
          $set: { passwordHash },
          $setOnInsert: {
            ...testUser,
            role: "spieler",
            active: true,
            isTestData: true,
          },
        },
        { upsert: true }
      )
    )
  );
}

module.exports = { ensureTestUsers, TEST_USERS };
