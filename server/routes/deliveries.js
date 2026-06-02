const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// @route   GET /api/deliveries
// @desc    Get all delivery orders
router.get('/', (req, res) => {
  const sql = `SELECT * FROM delivery_orders ORDER BY created_at DESC LIMIT 200`;
  db.all(sql, [], (err, orders) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch delivery orders' });

    if (orders.length === 0) return res.json([]);

    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => '?').join(',');
    db.all(`SELECT * FROM delivery_order_items WHERE delivery_order_id IN (${placeholders})`, orderIds, (err2, items) => {
      if (err2) return res.status(500).json({ error: 'Failed to fetch delivery items' });
      const result = orders.map(o => ({
        ...o,
        items: items.filter(i => i.delivery_order_id === o.id)
      }));
      res.json(result);
    });
  });
});

// @route   POST /api/deliveries
// @desc    Create a new delivery order
router.post('/', (req, res) => {
  const {
    order_ref_id, backend_order_id, customer_name, phone, address,
    rider_name, payment_method, transaction_id, remarks,
    delivery_status, khata_charged, khata_customer_id,
    subtotal, tax, total, items
  } = req.body;

  const sql = `INSERT INTO delivery_orders 
    (order_ref_id, backend_order_id, customer_name, phone, address, rider_name, payment_method, 
     transaction_id, remarks, delivery_status, khata_charged, khata_customer_id, subtotal, tax, total, is_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`;

  const params = [
    order_ref_id, backend_order_id, customer_name, phone, address,
    rider_name, payment_method || 'cod', transaction_id, remarks,
    delivery_status || 'pending', khata_charged || 0, khata_customer_id,
    subtotal || 0, tax || 0, total || 0
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error creating delivery order:', err.message);
      return res.status(500).json({ error: 'Failed to create delivery order' });
    }
    const deliveryId = this.lastID;

    if (items && items.length > 0) {
      const itemSql = `INSERT INTO delivery_order_items (delivery_order_id, item_name, price, quantity) VALUES (?, ?, ?, ?)`;
      items.forEach(item => {
        db.run(itemSql, [deliveryId, item.item_name || item.name, item.price, item.quantity || item.qty || 1]);
      });
    }

    res.status(201).json({ success: true, deliveryId });
  });
});

// @route   PATCH /api/deliveries/:id/status
// @desc    Update delivery status
router.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  const { delivery_status, is_completed } = req.body;

  let fields = [];
  let params = [];

  if (delivery_status !== undefined) { fields.push('delivery_status = ?'); params.push(delivery_status); }
  if (is_completed !== undefined) {
    fields.push('is_completed = ?'); params.push(is_completed);
    if (is_completed) { fields.push('completed_at = CURRENT_TIMESTAMP'); }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(id);
  db.run(`UPDATE delivery_orders SET ${fields.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update delivery status' });
    res.json({ success: true, id, delivery_status, is_completed });
  });
});

// @route   DELETE /api/deliveries/:id
// @desc    Delete a delivery order (cascade to items via FK)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('PRAGMA foreign_keys = ON;', [], () => {
    db.run(`DELETE FROM delivery_order_items WHERE delivery_order_id = ?`, [id], (err) => {
      if (err) return res.status(500).json({ error: 'Failed to delete delivery items' });
      db.run(`DELETE FROM delivery_orders WHERE id = ?`, [id], function(err2) {
        if (err2) return res.status(500).json({ error: 'Failed to delete delivery order' });
        res.json({ success: true, deletedId: id });
      });
    });
  });
});

module.exports = router;
