const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// Get all sync queue items (limit 200 for performance)
router.get('/', (req, res) => {
  db.all('SELECT * FROM sync_queue ORDER BY created_at DESC LIMIT 200', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Parse payloads for better frontend rendering
    const queue = rows.map(r => {
      try {
        r.payload = JSON.parse(r.payload);
      } catch (e) { }
      return r;
    });
    res.json(queue);
  });
});

// Get sync queue statistics
router.get('/stats', (req, res) => {
  db.all('SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const stats = { pending: 0, processing: 0, failed: 0, completed: 0 };
    rows.forEach(r => {
      if (stats[r.status] !== undefined) {
        stats[r.status] = r.count;
      }
    });
    res.json(stats);
  });
});

// Retry a specific failed sync task
router.post('/:id/retry', (req, res) => {
  const { id } = req.params;
  db.run("UPDATE sync_queue SET status = 'pending', attempts = 0 WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Task queued for retry' });
  });
});

// Delete a specific sync task
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM sync_queue WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Task deleted successfully' });
  });
});

// Clear all tasks (or filter by status)
router.delete('/', (req, res) => {
  const status = req.query.status; // optional: ?status=completed
  let query = "DELETE FROM sync_queue";
  let params = [];
  
  if (status) {
    query += " WHERE status = ?";
    params.push(status);
  }

  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: `Deleted ${this.changes} tasks` });
  });
});

module.exports = router;
