const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { queueStockChange } = require('../services/syncHelper');

// ── GET all stock items ──────────────────────────────
router.get('/', (req, res) => {
  db.all(`SELECT * FROM stock_items ORDER BY name`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ── POST create stock item ───────────────────────────
router.post('/', (req, res) => {
  const { name, unit, quantity, unit_price, min_alert } = req.body;
  if (!name || !unit) return res.status(400).json({ error: 'Name and unit required' });
  
  db.run(
    `INSERT INTO stock_items (name, unit, quantity, unit_price, min_alert) VALUES (?, ?, ?, ?, ?)`,
    [name, unit, quantity || 0, unit_price || 0, min_alert || 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const newItemId = this.lastID;
      // Log initial creation
      db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, 'set', ?, 'Initial stock setup')`, [newItemId, quantity || 0]);
      
      // Sync new stock item to Supabase
      queueStockChange(newItemId, 'insert');

      res.json({ id: newItemId, name, unit, quantity, unit_price, min_alert });
    }
  );
});

// ── PATCH update stock item (Edit Details) ───────────
router.patch('/:id', (req, res) => {
  const { name, unit, unit_price, min_alert } = req.body;
  db.run(
    `UPDATE stock_items SET name = ?, unit = ?, unit_price = ?, min_alert = ? WHERE id = ?`,
    [name, unit, unit_price, min_alert, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      // Sync updated stock details to Supabase
      queueStockChange(req.params.id, 'update');
      res.json({ success: true });
    }
  );
});

// ── POST adjust stock quantity (In / Out) ────────────
router.post('/:id/adjust', (req, res) => {
  const { action, qty, remarks } = req.body; // action: 'add' or 'remove'
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Valid quantity required' });
  if (action !== 'add' && action !== 'remove') return res.status(400).json({ error: 'Action must be add or remove' });

  // First get current quantity
  db.get(`SELECT quantity FROM stock_items WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Item not found' });

    const newQty = action === 'add' ? row.quantity + parseFloat(qty) : Math.max(0, row.quantity - parseFloat(qty));
    
    // Update stock_items
    db.run(`UPDATE stock_items SET quantity = ? WHERE id = ?`, [newQty, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Log the adjustment
      db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, ?, ?, ?)`, [req.params.id, action, parseFloat(qty), remarks || '']);
      
      // Sync updated stock quantity to Supabase
      queueStockChange(req.params.id, 'update');

      res.json({ success: true, newQuantity: newQty });
    });
  });
});

// ─── Helper: retry on SQLITE_BUSY ───────────────────────────────────────────
function runStockRetry(sql, params, retries, delay, callback) {
  db.run(sql, params, function(err) {
    if (err && err.message && err.message.includes('SQLITE_BUSY') && retries > 0) {
      setTimeout(() => runStockRetry(sql, params, retries - 1, delay * 2, callback.bind(this)), delay);
    } else {
      callback.call(this, err);
    }
  });
}

// ── DELETE stock item (cascade-safe: items → logs → item) ────────────────────
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Step 1: Remove from item_ingredients (FK ref) so item can be deleted
  runStockRetry(`DELETE FROM item_ingredients WHERE stock_item_id = ?`, [id], 4, 200, (err) => {
    if (err) return res.status(500).json({ error: 'Failed removing ingredients ref: ' + err.message });

    // Step 2: Delete stock logs
    runStockRetry(`DELETE FROM stock_logs WHERE item_id = ?`, [id], 4, 200, (err) => {
      if (err) return res.status(500).json({ error: 'Failed removing stock logs: ' + err.message });

      // Step 3: Delete the stock item itself
      runStockRetry(`DELETE FROM stock_items WHERE id = ?`, [id], 4, 200, function(err) {
        if (err) return res.status(500).json({ error: 'Failed deleting stock item: ' + err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Stock item not found' });
        // Sync deleted stock item from Supabase
        queueStockChange(id, 'delete');
        res.json({ success: true, deletedId: id });
      });
    });
  });
});


// ── GET all stock history (Global) ───────────────────
router.get('/history', (req, res) => {
  db.all(`
    SELECT sl.*, si.name as item_name, si.unit as item_unit
    FROM stock_logs sl
    JOIN stock_items si ON sl.item_id = si.id
    ORDER BY sl.created_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ── GET stock logs (History for single item) ─────────
router.get('/logs/:id', (req, res) => {
  db.all(`SELECT * FROM stock_logs WHERE item_id = ? ORDER BY created_at DESC LIMIT 50`, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
