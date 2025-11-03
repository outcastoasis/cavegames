// backend/server.js
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/auth");
const pollRoutes = require("./routes/pollRoutes");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true, // <— WICHTIG!
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// MongoDB verbinden
connectDB();

// Test-Route
app.get("/api/test", (req, res) => {
  res.json({ message: "API läuft korrekt" });
});

// Auth-Routen
app.use("/api/auth", authRoutes);

// Admin-Routen
app.use("/api/users", userRoutes);
app.use("/api/years", require("./routes/yearRoutes"));

//User Routen
app.use("/api/evenings", require("./routes/eveningRoutes"));
app.use("/api/polls", pollRoutes);

app.use("/api/games", require("./routes/gameRoutes"));

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
