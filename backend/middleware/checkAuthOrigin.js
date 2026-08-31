module.exports = (req, res, next) => {
  const origin = req.get("origin");
  const allowedOrigin = process.env.CLIENT_ORIGIN?.replace(/\/$/, "");

  // Requests without Origin (for example server-side health tooling) do not
  // carry ambient browser credentials and may proceed.
  if (!origin || !allowedOrigin || origin.replace(/\/$/, "") === allowedOrigin) {
    return next();
  }

  return res.status(403).json({ error: "Nicht vertrauenswürdige Anfrage" });
};
