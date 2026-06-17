const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { queueInventoryChange } = require('../services/syncHelper');

// ── GET all categories ──────────────────────────────
router.get('/categories', (req, res) => {
  db.all(`SELECT * FROM categories ORDER BY name`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ── POST create category ────────────────────────────
router.post('/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name required' });
  db.run(`INSERT INTO categories (name) VALUES (?)`, [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name });
  });
});

// ── DELETE category ─────────────────────────────────
router.delete('/categories/:id', (req, res) => {
  db.run(`DELETE FROM categories WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ── GET all items (with category name) ─────────────
router.get('/', (req, res) => {
  db.all(
    `SELECT items.*, categories.name AS category_name
     FROM items
     LEFT JOIN categories ON items.category_id = categories.id
     ORDER BY categories.name, items.name`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.all(
        `SELECT ii.*, si.name as stock_item_name, si.unit as stock_item_unit
         FROM item_ingredients ii
         JOIN stock_items si ON ii.stock_item_id = si.id`,
        [],
        (err2, ingredients) => {
          if (err2) return res.status(500).json({ error: err2.message });
          
          const itemsWithIngredients = rows.map(item => ({
            ...item,
            ingredients: ingredients.filter(ing => ing.menu_item_id === item.id)
          }));
          res.json(itemsWithIngredients);
        }
      );
    }
  );
});

// ── POST create item ────────────────────────────────
router.post('/', (req, res) => {
  const { category_id, name, price, image, ingredients } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'Name and price required' });
  db.run(
    `INSERT INTO items (category_id, name, price, image) VALUES (?, ?, ?, ?)`,
    [category_id || null, name, price, image || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const itemId = this.lastID;
      
      if (ingredients && ingredients.length > 0) {
        const stmt = db.prepare(`INSERT INTO item_ingredients (menu_item_id, stock_item_id, quantity_required) VALUES (?, ?, ?)`);
        ingredients.forEach(ing => {
          stmt.run([itemId, ing.stock_item_id, ing.quantity_required]);
        });
        stmt.finalize();
      }
      // Sync new menu item to Supabase
      queueInventoryChange(itemId, 'insert');

      res.json({ id: itemId, category_id, name, price, image });
    }
  );
});

// ── PATCH update item ───────────────────────────────
router.patch('/:id', (req, res) => {
  const { category_id, name, price, image, ingredients } = req.body;
  const itemId = req.params.id;
  db.run(
    `UPDATE items SET category_id = ?, name = ?, price = ?, image = ? WHERE id = ?`,
    [category_id || null, name, price, image || null, itemId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      if (ingredients) {
        db.run(`DELETE FROM item_ingredients WHERE menu_item_id = ?`, [itemId], (err2) => {
          if (!err2 && ingredients.length > 0) {
            const stmt = db.prepare(`INSERT INTO item_ingredients (menu_item_id, stock_item_id, quantity_required) VALUES (?, ?, ?)`);
            ingredients.forEach(ing => {
              stmt.run([itemId, ing.stock_item_id, ing.quantity_required]);
            });
            stmt.finalize();
          }
          // Sync updated item to Supabase
          queueInventoryChange(itemId, 'update');
          res.json({ success: true });
        });
      } else {
        // Sync updated item to Supabase
        queueInventoryChange(itemId, 'update');
        res.json({ success: true });
      }
    }
  );
});

// ── DELETE item ─────────────────────────────────────
router.delete('/:id', (req, res) => {
  db.run(`DELETE FROM items WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    // Sync deleted item from Supabase
    queueInventoryChange(req.params.id, 'delete');
    res.json({ success: true });
  });
});

module.exports = router;
