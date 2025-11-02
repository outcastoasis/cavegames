const Evening = require("../models/Evening");

exports.getEvenings = async (req, res) => {
  try {
    const evenings = await Evening.find().sort({ date: -1 });
    res.json(evenings);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Abende" });
  }
};

exports.createEvening = async (req, res) => {
  try {
    const evening = new Evening(req.body);
    await evening.save();
    res.status(201).json(evening);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Erstellen des Abends" });
  }
};

exports.getEveningById = async (req, res) => {
  try {
    const evening = await Evening.findById(req.params.id);
    if (!evening)
      return res.status(404).json({ error: "Abend nicht gefunden" });
    res.json(evening);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden des Abends" });
  }
};

exports.updateEvening = async (req, res) => {
  try {
    const updated = await Evening.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated)
      return res.status(404).json({ error: "Abend nicht gefunden" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
};

exports.deleteEvening = async (req, res) => {
  try {
    const deleted = await Evening.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ error: "Abend nicht gefunden" });
    res.json({ message: "Abend gelöscht" });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
};

exports.changeEveningStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const evening = await Evening.findById(req.params.id);
    if (!evening)
      return res.status(404).json({ error: "Abend nicht gefunden" });

    evening.status = status;
    await evening.save();
    res.json({ message: "Status geändert", evening });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Statuswechsel" });
  }
};
