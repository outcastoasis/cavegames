// backend/server.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/auth");
const pollRoutes = require("./routes/pollRoutes");
const multer = require("multer");
const { testModeMiddleware } = require("./utils/testMode");

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.TRUST_PROXY_HOPS) {
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 1) {
    throw new Error("TRUST_PROXY_HOPS must be a positive integer");
  }
  app.set("trust proxy", trustProxyHops);
}

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true, // <— WICHTIG!
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Test-Mode"],
  })
);
app.use(express.json());
app.use(testModeMiddleware);

// MongoDB verbinden
connectDB();

// Test-Route
app.get("/api/test", (req, res) => {
  res.json({ message: "API läuft korrekt" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Auth-Routen
app.use("/api/auth", authRoutes);

// Admin-Routen
app.use("/api/users", userRoutes);
app.use("/api/years", require("./routes/yearRoutes"));

//User Routen
app.use("/api/evenings", require("./routes/eveningRoutes"));
app.use("/api/polls", pollRoutes);
app.use("/api/notifications", require("./routes/notificationRoutes"));

app.use("/api/games", require("./routes/gameRoutes"));

app.use("/api/stats", require("./routes/statsRoutes"));

app.use("/api/test-mode", require("./routes/testModeRoutes"));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err.message === "Only JPG/PNG are allowed") {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
