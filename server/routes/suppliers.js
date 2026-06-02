const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// @route   GET /api/suppliers
// @desc    Get all active suppliers with their ledger history
router.get('/', (req, res) => {
  db.all(`SELECT * FROM suppliers WHERE deleted_at IS NULL ORDER BY created_at DESC`, [], (err, suppliers) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch suppliers' });

    // Fetch ledger history for all active suppliers
    const supplierIds = suppliers.map(s => s.id);
    if (supplierIds.length === 0) return res.json([]);

    const placeholders = supplierIds.map(() => '?').join(',');
    db.all(`SELECT * FROM supplier_ledger WHERE supplier_id IN (${placeholders}) ORDER BY date DESC`, supplierIds, (err, ledgers) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch ledger history' });

      // Group ledgers by supplier
      const historyMap = {};
      ledgers.forEach(l => {
        if (!historyMap[l.supplier_id]) historyMap[l.supplier_id] = [];
        historyMap[l.supplier_id].push({
          id: l.id,
          date: l.date,
          type: l.type,
          amount: l.amount,
          note: l.note
        });
      });

      const result = suppliers.map(s => ({
        ...s,
        history: historyMap[s.id] || []
      }));

      res.json(result);
    });
  });
});

// @route   POST /api/suppliers
// @desc    Create a new supplier
router.post('/', (req, res) => {
  const { id, name, company, contact, balance, history } = req.body;
  if (!name || !company) return res.status(400).json({ error: 'Name and Company are required' });

  const newId = id || `SUP-${Date.now()}`;
  const startBalance = balance || 0;

  db.run(`INSERT INTO suppliers (id, name, company, contact, balance) VALUES (?, ?, ?, ?, ?)`,
    [newId, name, company, contact || '', startBalance],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to create supplier' });

      // Insert opening balance history if provided
      if (history && history.length > 0) {
        const opening = history[0];
        db.run(`INSERT INTO supplier_ledger (supplier_id, type, amount, note, date) VALUES (?, ?, ?, ?, ?)`,
          [newId, opening.type, opening.amount, opening.note || '', opening.date || new Date().toISOString()]);
      }

      res.status(201).json({ success: true, id: newId });
    }
  );
});

// @route   POST /api/suppliers/:id/ledger
// @desc    Add a ledger entry (Purchase/Payment) and optionally update inventory
router.post('/:id/ledger', (req, res) => {
  const { id } = req.params;
  const { type, amount, note, date, stock_item_id, quantity } = req.body;

  if (!amount) return res.status(400).json({ error: 'Amount is required' });

  // Determine balance change:
  // Stock Purchase -> Balance increases (We owe them more)
  // Payment Made -> Balance decreases (We owe them less)
  const isPurchase = type === 'Stock Purchase';
  
  db.get(`SELECT balance FROM suppliers WHERE id = ?`, [id], (err, supplier) => {
    if (err || !supplier) return res.status(404).json({ error: 'Supplier not found' });

    const newBalance = isPurchase ? supplier.balance + parseFloat(amount) : supplier.balance - parseFloat(amount);

    db.run(`UPDATE suppliers SET balance = ? WHERE id = ?`, [newBalance, id], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update balance' });

      db.run(`INSERT INTO supplier_ledger (supplier_id, type, amount, note, date) VALUES (?, ?, ?, ?, ?)`,
        [id, type, parseFloat(amount), note || '', date || new Date().toISOString()],
        function(err) {
          if (err) console.error("Failed to insert ledger:", err);

          // Inventory Integration:
          // If this is a purchase AND stock details are provided, update inventory
          if (isPurchase && stock_item_id && quantity) {
            db.run(`UPDATE stock_items SET quantity = quantity + ? WHERE id = ?`, [parseFloat(quantity), stock_item_id], function(err) {
              if (!err) {
                db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, 'add', ?, ?)`,
                  [stock_item_id, parseFloat(quantity), `Purchase from Supplier (Amount: Rs ${amount}) ${note ? '- ' + note : ''}`]);
              }
            });
          }

          res.json({ success: true, newBalance });
        }
      );
    });
  });
});

// @route   DELETE /api/suppliers/:id
// @desc    Soft delete a supplier
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run(`UPDATE suppliers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete supplier' });
    res.json({ success: true });
  });
});

module.exports = router;
