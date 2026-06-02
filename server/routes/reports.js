const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// ── Today's Summary ──────────────────────────────────────────────────────────
router.get('/summary/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  db.get(
    `SELECT
       COUNT(*)               AS total_orders,
       COALESCE(SUM(total_amount), 0) AS total_revenue,
       COALESCE(SUM(tax), 0)          AS total_tax,
       COALESCE(SUM(subtotal), 0)     AS total_subtotal
     FROM orders
     WHERE DATE(created_at) = ? AND status = 'completed'`,
    [today],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    }
  );
});

// ── Last 7 Days Revenue (for chart) ─────────────────────────────────────────
router.get('/summary/weekly', (req, res) => {
  db.all(
    `SELECT
       DATE(created_at)                AS date,
       COUNT(*)                        AS orders,
       COALESCE(SUM(total_amount), 0) AS revenue
     FROM orders
     WHERE created_at >= DATE('now', '-6 days') AND status = 'completed'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ── All Orders History ────────────────────────────────────────────────────────
router.get('/orders', (req, res) => {
  const { date, status, limit = 100 } = req.query;
  let sql = `SELECT * FROM orders WHERE 1=1`;
  const params = [];
  if (date)   { sql += ` AND DATE(created_at) = ?`; params.push(date); }
  if (status) { sql += ` AND status = ?`;            params.push(status); }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(parseInt(limit));

  db.all(sql, params, (err, orders) => {
    if (err) return res.status(500).json({ error: err.message });
    if (orders.length === 0) return res.json([]);

    const ids = orders.map(o => o.id);
    const placeholders = ids.map(() => '?').join(',');
    db.all(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`, ids, (err, items) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(orders.map(o => ({ ...o, items: items.filter(i => i.order_id === o.id) })));
    });
  });
});

// ── Top Selling Items ─────────────────────────────────────────────────────────
router.get('/top-items', (req, res) => {
  db.all(
    `SELECT
       item_name,
       SUM(quantity)            AS total_qty,
       SUM(price * quantity)    AS total_revenue
     FROM order_items
     JOIN orders ON orders.id = order_items.order_id
     WHERE orders.status = 'completed'
     GROUP BY item_name
     ORDER BY total_qty DESC
     LIMIT 10`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ── Monthly Summary ───────────────────────────────────────────────────────────
router.get('/summary/monthly', (req, res) => {
  db.all(
    `SELECT
       strftime('%Y-%m', created_at) AS month,
       COUNT(*)                      AS orders,
       COALESCE(SUM(total_amount), 0) AS revenue
     FROM orders
     WHERE status = 'completed'
     GROUP BY month
     ORDER BY month DESC
     LIMIT 12`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
