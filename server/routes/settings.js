const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// GET all settings
router.get('/', (req, res) => {
  db.all('SELECT * FROM settings', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  });
});

// POST to update settings
router.post('/', (req, res) => {
  const { global_gst_rate, global_service_charges } = req.body;

  db.serialize(() => {
    if (global_gst_rate !== undefined) {
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('global_gst_rate', ?)", [String(global_gst_rate)]);
    }
    if (global_service_charges !== undefined) {
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('global_service_charges', ?)", [String(global_service_charges)]);
    }
  });

  res.json({ success: true, message: 'Settings updated successfully' });
});

module.exports = router;
