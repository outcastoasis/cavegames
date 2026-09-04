// backend/config/db.js
const mongoose = require("mongoose");
const { migrateYearScopes } = require("../utils/yearMigration");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await migrateYearScopes();
    console.log("✅ MongoDB verbunden");
  } catch (err) {
    console.error("❌ MongoDB-Verbindung fehlgeschlagen", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
