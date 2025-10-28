// backend/server.js
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

// MongoDB verbinden
connectDB();

// Test-Route
app.get("/api/test", (req, res) => {
  res.json({ message: "API läuft korrekt" });
});

// Auth-Routen
app.use("/api/auth", authRoutes);

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
