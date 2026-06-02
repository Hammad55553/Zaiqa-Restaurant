const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// @route   POST /api/orders
// @desc    Create a new order (from POS)
router.post('/', (req, res) => {
  const { table_number, area, customer_name, remarks, items, subtotal, tax, total_amount } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order must have items' });
  }

  // Insert main order
  const orderSql = `INSERT INTO orders (table_number, area, customer_name, remarks, status, subtotal, tax, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const orderParams = [table_number, area, customer_name, remarks, 'pending', subtotal, tax, total_amount];

  db.run(orderSql, orderParams, function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    const orderId = this.lastID;

    // Insert order items
    const itemSql = `INSERT INTO order_items (order_id, item_id, item_name, price, quantity, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    // We run them in a simple loop for SQLite
    items.forEach((item) => {
      db.run(itemSql, [orderId, item.id || null, item.name, item.price, item.qty, item.notes || '', 'preparing'], (err) => {
        if (err) console.error("Error inserting item:", err);
      });

      // Auto-deduct ingredients (BOM / Recipe)
      if (item.id) {
        db.all(`SELECT stock_item_id, quantity_required FROM item_ingredients WHERE menu_item_id = ?`, [item.id], (err, ingredients) => {
          if (!err && ingredients && ingredients.length > 0) {
            ingredients.forEach(ing => {
              const totalRequired = ing.quantity_required * item.qty;
              db.run(`UPDATE stock_items SET quantity = quantity - ? WHERE id = ?`, [totalRequired, ing.stock_item_id], (err2) => {
                if (!err2) {
                  db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, ?, ?, ?)`, 
                    [ing.stock_item_id, 'remove', totalRequired, `Used in Order #${orderId} (${item.name} x${item.qty})`]);
                }
              });
            });
          }
        });
      }
    });

    res.status(201).json({ success: true, orderId });
  });
});

// @route   GET /api/orders/active
// @desc    Get all active orders for Kitchen Display
router.get('/active', (req, res) => {
  const sql = `
    SELECT * FROM orders 
    WHERE status IN ('pending', 'preparing', 'ready')
    ORDER BY created_at DESC
  `;

  db.all(sql, [], (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    if (orders.length === 0) {
      return res.json([]);
    }

    // Now fetch all items for these orders
    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => '?').join(',');
    
    const itemsSql = `SELECT * FROM order_items WHERE order_id IN (${placeholders})`;
    
    db.all(itemsSql, orderIds, (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch order items' });
      }

      // Group items into their respective orders
      const ordersWithItems = orders.map(order => {
        return {
          ...order,
          time: new Date(order.created_at).toISOString(),
          items: items.filter(item => item.order_id === order.id)
        };
      });

      res.json(ordersWithItems);
    });
  });
});

// @route   PATCH /api/orders/:id/status
// @desc    Update order status
router.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, clear_updates } = req.body;

  let query = `UPDATE orders SET status = ?`;
  let params = [status];

  if (clear_updates) {
    query += `, has_new_updates = 0`;
  }
  query += ` WHERE id = ?`;
  params.push(id);

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update order status' });
    }
    res.json({ success: true, id, status });
  });
});

// @route   PATCH /api/orders/:id/customer
// @desc    Update order's customer name
router.patch('/:id/customer', (req, res) => {
  const { id } = req.params;
  const { customer_name } = req.body;

  db.run(`UPDATE orders SET customer_name = ? WHERE id = ?`, [customer_name, id], function(err) {
    if (err) {
      console.error('Error updating order customer name:', err.message);
      return res.status(500).json({ error: 'Failed to update customer name' });
    }
    res.json({ success: true, id, customer_name });
  });
});

// @route   GET /api/orders/table/:table_number
// @desc    Get active order for a specific table
router.get('/table/:table_number', (req, res) => {
  const { table_number } = req.params;
  const sql = `SELECT * FROM orders WHERE table_number = ? AND status IN ('pending', 'preparing', 'ready') ORDER BY created_at DESC LIMIT 1`;
  
  db.get(sql, [table_number], (err, order) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch order' });
    if (!order) return res.json(null); // No active order

    // Fetch items
    db.all(`SELECT * FROM order_items WHERE order_id = ?`, [order.id], (err, items) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch order items' });
      res.json({ ...order, items });
    });
  });
});

// @route   PATCH /api/orders/:id/items
// @desc    Append new items to an existing order and update totals
router.patch('/:id/items', (req, res) => {
  const { id } = req.params;
  const { newItems, subtotal, tax, total_amount, remarks, admin_edit_remark } = req.body;

  if (!newItems || newItems.length === 0) {
    return res.status(400).json({ error: 'No new items provided' });
  }

  // Check current status
  db.get(`SELECT status FROM orders WHERE id = ?`, [id], (err, order) => {
    if (err || !order) return res.status(500).json({ error: 'Order not found' });

    if (order.status !== 'pending' && !admin_edit_remark) {
      // Actually, appending should be allowed by anyone. We'll skip the admin_edit_remark check for pure appending.
    }

    // Set has_new_updates = 1 so KDS gets alerted
    const updateOrderSql = `UPDATE orders SET subtotal = ?, tax = ?, total_amount = ?, remarks = ?, has_new_updates = 1 ${admin_edit_remark ? ', admin_edit_remark = ?' : ''} WHERE id = ?`;
    const params = admin_edit_remark ? [subtotal, tax, total_amount, remarks, admin_edit_remark, id] : [subtotal, tax, total_amount, remarks, id];

    db.run(updateOrderSql, params, function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to update order totals' });
      }

      // Insert new items
      const itemSql = `INSERT INTO order_items (order_id, item_id, item_name, price, quantity, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      
      newItems.forEach((item) => {
        // Automatically deduct stock for NEW appended items
        db.all(`SELECT stock_item_id, quantity_required FROM item_ingredients WHERE menu_item_id = ?`, [item.item_id || item.id], (err, ingredients) => {
          if (!err && ingredients && ingredients.length > 0) {
            ingredients.forEach(ing => {
              const totalRequired = ing.quantity_required * (item.quantity || item.qty);
              db.run(`UPDATE stock_items SET quantity = quantity - ? WHERE id = ?`, [totalRequired, ing.stock_item_id]);
              db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, 'remove', ?, ?)`,
                [ing.stock_item_id, totalRequired, `Appended to Order #${id} (${item.item_name || item.name})`]
              );
            });
          }
        });

        db.run(itemSql, [id, item.item_id || item.id, item.item_name || item.name, item.price, item.quantity || item.qty, item.notes || '', 'preparing'], (err) => {
          if (err) console.error("Error inserting appended item:", err);
        });
      });

      res.json({ success: true, orderId: id });
    });
  });
});

// @route   PUT /api/orders/:id/sync
// @desc    Full cart synchronization (allows editing/deleting sent items if admin remark is provided)
router.put('/:id/sync', (req, res) => {
  const { id } = req.params;
  const { items, subtotal, tax, total_amount, remarks, admin_edit_remark } = req.body;

  db.get(`SELECT status FROM orders WHERE id = ?`, [id], (err, order) => {
    if (err || !order) return res.status(500).json({ error: 'Order not found' });

    // Update order totals and remarks. Set has_new_updates = 1 since order is changing.
    const updateOrderSql = `UPDATE orders SET subtotal = ?, tax = ?, total_amount = ?, remarks = ?, has_new_updates = 1 ${admin_edit_remark ? ', admin_edit_remark = ?' : ''} WHERE id = ?`;
    const params = admin_edit_remark ? [subtotal, tax, total_amount, remarks, admin_edit_remark, id] : [subtotal, tax, total_amount, remarks, id];

    db.run(updateOrderSql, params, function(err) {
      if (err) return res.status(500).json({ error: 'Failed to update order' });

      // Fetch existing items to compare
      db.all(`SELECT * FROM order_items WHERE order_id = ?`, [id], (err, existingItems) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch existing items' });

        const existingMap = {};
        existingItems.forEach(item => {
          if (!existingMap[item.item_id]) {
            existingMap[item.item_id] = { qty: 0, ids: [] };
          }
          existingMap[item.item_id].qty += item.quantity;
          existingMap[item.item_id].ids.push(item.id);
        });

        const incomingMap = {};
        items.forEach(item => {
          const itemId = item.item_id || item.id;
          if (!incomingMap[itemId]) {
            incomingMap[itemId] = { 
              qty: 0, 
              name: item.item_name || item.name, 
              price: item.price, 
              notes: item.notes || '' 
            };
          }
          incomingMap[itemId].qty += (item.quantity || item.qty);
          if (item.notes) {
             incomingMap[itemId].notes = incomingMap[itemId].notes ? incomingMap[itemId].notes + ' | ' + item.notes : item.notes;
          }
        });

        // 1. Process Updates & Deletions
        Object.keys(existingMap).forEach(itemIdStr => {
          const itemId = parseInt(itemIdStr, 10);
          const existing = existingMap[itemId];
          const incoming = incomingMap[itemId];
          
          if (!incoming) {
            // Item was DELETED completely
            db.all(`SELECT stock_item_id, quantity_required FROM item_ingredients WHERE menu_item_id = ?`, [itemId], (err, ingredients) => {
              if (!err && ingredients) {
                ingredients.forEach(ing => {
                  const totalRequired = ing.quantity_required * existing.qty;
                  db.run(`UPDATE stock_items SET quantity = quantity + ? WHERE id = ?`, [totalRequired, ing.stock_item_id]);
                  db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, 'add', ?, ?)`, [ing.stock_item_id, totalRequired, `Refund from Order #${id} (Deleted)`]);
                });
              }
            });
            existing.ids.forEach(orderItemId => {
              db.run(`DELETE FROM order_items WHERE id = ?`, [orderItemId]);
            });
          } else {
            // Item exists in both, check for qty changes
            const diff = incoming.qty - existing.qty;
            
            if (diff !== 0) {
              db.all(`SELECT stock_item_id, quantity_required FROM item_ingredients WHERE menu_item_id = ?`, [itemId], (err, ingredients) => {
                if (!err && ingredients) {
                  ingredients.forEach(ing => {
                    const totalDiff = ing.quantity_required * Math.abs(diff);
                    if (diff > 0) {
                      db.run(`UPDATE stock_items SET quantity = quantity - ? WHERE id = ?`, [totalDiff, ing.stock_item_id]);
                      db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, 'remove', ?, ?)`, [ing.stock_item_id, totalDiff, `Increased qty in Order #${id}`]);
                    } else {
                      db.run(`UPDATE stock_items SET quantity = quantity + ? WHERE id = ?`, [totalDiff, ing.stock_item_id]);
                      db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, 'add', ?, ?)`, [ing.stock_item_id, totalDiff, `Decreased qty in Order #${id}`]);
                    }
                  });
                }
              });
            }

            // Consolidate into a single row in order_items
            const primaryId = existing.ids[0];
            db.run(`UPDATE order_items SET quantity = ?, price = ?, notes = ? WHERE id = ?`, [incoming.qty, incoming.price, incoming.notes, primaryId]);
            
            // Delete any duplicate rows for this item
            for (let i = 1; i < existing.ids.length; i++) {
              db.run(`DELETE FROM order_items WHERE id = ?`, [existing.ids[i]]);
            }
          }
        });

        // 2. Process Additions (Brand New Items)
        Object.keys(incomingMap).forEach(itemIdStr => {
          const itemId = parseInt(itemIdStr, 10);
          const incoming = incomingMap[itemId];
          
          if (!existingMap[itemId]) {
            // NEW ITEM
            db.all(`SELECT stock_item_id, quantity_required FROM item_ingredients WHERE menu_item_id = ?`, [itemId], (err, ingredients) => {
              if (!err && ingredients) {
                ingredients.forEach(ing => {
                  const totalRequired = ing.quantity_required * incoming.qty;
                  db.run(`UPDATE stock_items SET quantity = quantity - ? WHERE id = ?`, [totalRequired, ing.stock_item_id]);
                  db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, 'remove', ?, ?)`, [ing.stock_item_id, totalRequired, `Added to Order #${id}`]);
                });
              }
            });
            db.run(`INSERT INTO order_items (order_id, item_id, item_name, price, quantity, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
              [id, itemId, incoming.name, incoming.price, incoming.qty, incoming.notes, 'preparing']);
          }
        });

        res.json({ success: true, orderId: id });
      });
    });
  });
});

// @route   GET /api/orders/completed
// @desc    Get completed orders history (for KDS history tab)
router.get('/completed', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const sql = `
    SELECT * FROM orders 
    WHERE status = 'completed'
    ORDER BY created_at DESC
    LIMIT ?
  `;

  db.all(sql, [limit], (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch completed orders' });
    }

    if (orders.length === 0) {
      return res.json([]);
    }

    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => '?').join(',');
    const itemsSql = `SELECT * FROM order_items WHERE order_id IN (${placeholders})`;

    db.all(itemsSql, orderIds, (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch order items' });
      }

      const ordersWithItems = orders.map(order => ({
        ...order,
        time: new Date(order.created_at).toISOString(),
        items: items.filter(item => item.order_id === order.id)
      }));

      res.json(ordersWithItems);
    });
  });
});

// ─── Helper: run SQL with retry on SQLITE_BUSY ───────────────────────────────
function runWithRetry(sql, params, retries, delay, callback) {
  db.run(sql, params, function(err) {
    if (err && err.message && err.message.includes('SQLITE_BUSY') && retries > 0) {
      console.log(`[SQLite] BUSY – retrying in ${delay}ms (${retries} left)`);
      setTimeout(() => runWithRetry(sql, params, retries - 1, delay * 2, callback.bind(this)), delay);
    } else {
      callback.call(this, err);
    }
  });
}

// @route   DELETE /api/orders/:id
// @desc    Delete an order and all its items (cascade safe, BUSY-retry)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Step 1: Delete child items first (avoids FK constraint error)
  runWithRetry(`DELETE FROM order_items WHERE order_id = ?`, [id], 5, 300, (err) => {
    if (err) {
      console.error('Error deleting order items:', err.message);
      return res.status(500).json({ error: 'Failed to delete order items: ' + err.message });
    }

    // Step 2: Delete the parent order
    runWithRetry(`DELETE FROM orders WHERE id = ?`, [id], 5, 300, function(err) {
      if (err) {
        console.error('Error deleting order:', err.message);
        return res.status(500).json({ error: 'Failed to delete order: ' + err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ success: true, deletedId: id });
    });
  });
});

module.exports = router;
