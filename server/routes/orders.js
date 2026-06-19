const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { queueOrderChange, queueTableChange, queueCancelRequestChange } = require('../services/syncHelper');

// @route   POST /api/orders
// @desc    Create a new order (from POS)
router.post('/', (req, res) => {
  const { table_number, area, customer_name, remarks, items, subtotal, tax, total_amount, created_by } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order must have items' });
  }

  // Insert main order
  const orderSql = `INSERT INTO orders (table_number, area, customer_name, remarks, status, subtotal, tax, total_amount, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const orderParams = [table_number, area, customer_name, remarks, 'pending', subtotal, tax, total_amount, created_by || null];

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

      // ONLY decrement from prepared_waste immediately, do NOT deduct ingredients for pending orders
      if (item.isFromPreparedWaste) {
        db.get(`SELECT id, quantity FROM prepared_waste WHERE item_name = ? LIMIT 1`, [item.name], (errW, rowW) => {
          if (!errW && rowW) {
            const newQty = rowW.quantity - item.qty;
            if (newQty <= 0) {
              db.run(`DELETE FROM prepared_waste WHERE id = ?`, [rowW.id]);
            } else {
              db.run(`UPDATE prepared_waste SET quantity = ? WHERE id = ?`, [newQty, rowW.id]);
            }
          }
        });
      }
    });

    // Update table status to dining if this is a dine-in order
    if (table_number && area !== 'Delivery') {
      db.run(`UPDATE tables SET status = 'dining' WHERE table_number = ?`, [table_number], (errT) => {
        if (errT) console.error("Error updating table status:", errT);
        db.get(`SELECT id FROM tables WHERE table_number = ?`, [table_number], (errG, row) => {
          if (!errG && row) {
            queueTableChange(row.id, 'update');
          }
        });
      });
    }

    // Sync order to Supabase
    queueOrderChange(orderId, 'insert');

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

  db.get(`SELECT status, table_number, area FROM orders WHERE id = ?`, [id], (errOrd, orderRow) => {
    if (errOrd || !orderRow) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let targetStatus = status;
    // Dine-in table orders can only be marked 'completed' from the POS checkout (which sends checkout: true)
    if (orderRow.table_number && orderRow.area !== 'Delivery' && status === 'completed' && !req.body.checkout) {
      targetStatus = 'ready';
    }

    const wasPending = orderRow.status === 'pending';
    const becameActive = ['preparing', 'ready', 'completed'].includes(targetStatus);

    let query = `UPDATE orders SET status = ?`;
    let params = [targetStatus];

    if (targetStatus === 'completed') {
      const now = new Date();
      const dateStr = now.getFullYear() + 
                      String(now.getMonth() + 1).padStart(2, '0') + 
                      String(now.getDate()).padStart(2, '0');
      const randomStr = Math.floor(1000 + Math.random() * 9000);
      const generatedInvoice = `INV-${dateStr}-${randomStr}`;
      
      query += `, invoice_number = COALESCE(invoice_number, ?)`;
      params.push(generatedInvoice);
    }

    if (clear_updates) {
      query += `, has_new_updates = 0`;
    }
    if (req.body.delivered_by) {
      query += `, delivered_by = ?`;
      params.push(req.body.delivered_by);
    }
    if (req.body.payment_status) {
      query += `, payment_status = ?`;
      params.push(req.body.payment_status);
    }
    query += ` WHERE id = ?`;
    params.push(id);

    db.run(query, params, function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update order status' });
      }

      // If order is completed, set table to available
      if (orderRow.table_number && orderRow.area !== 'Delivery' && targetStatus === 'completed') {
        db.run(`UPDATE tables SET status = 'available' WHERE table_number = ?`, [orderRow.table_number], (errT) => {
          if (errT) console.error("Error updating table status on complete:", errT);
          db.get(`SELECT id FROM tables WHERE table_number = ?`, [orderRow.table_number], (errG, row) => {
            if (!errG && row) {
              queueTableChange(row.id, 'update');
            }
          });
        });
      }

      // If transitioning from pending to active (preparing or later), deduct stock for all items
      if (wasPending && becameActive) {
        db.all(`SELECT * FROM order_items WHERE order_id = ?`, [id], (errItems, orderItems) => {
          if (!errItems && orderItems) {
            orderItems.forEach(item => {
              if (item.item_id && !item.isFromPreparedWaste) {
                db.all(`SELECT stock_item_id, quantity_required FROM item_ingredients WHERE menu_item_id = ?`, [item.item_id], (errIng, ingredients) => {
                  if (!errIng && ingredients) {
                    ingredients.forEach(ing => {
                      const totalRequired = ing.quantity_required * item.quantity;
                      db.run(`UPDATE stock_items SET quantity = quantity - ? WHERE id = ?`, [totalRequired, ing.stock_item_id], (err2) => {
                        if (!err2) {
                          db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, 'remove', ?, ?)`, 
                            [ing.stock_item_id, totalRequired, `Preparing started for Order #${id} (${item.item_name} x${item.quantity})`]);
                        }
                      });
                    });
                  }
                });
              }
            });
          }
        });
      }

      // Sync order update to Supabase
      queueOrderChange(id, 'update');

      db.get(`SELECT invoice_number, payment_status FROM orders WHERE id = ?`, [id], (errInv, orderRowFinal) => {
        res.json({ 
          success: true, 
          id, 
          status: targetStatus,
          invoice_number: orderRowFinal ? orderRowFinal.invoice_number : null,
          payment_status: orderRowFinal ? orderRowFinal.payment_status : null
        });
      });
    });
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
    // Sync order update to Supabase
    queueOrderChange(id, 'update');

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
        if (!item.isFromPreparedWaste) {
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
        } else {
          // Decrement prepared_waste
          db.get(`SELECT id, quantity FROM prepared_waste WHERE item_name = ? LIMIT 1`, [item.item_name || item.name], (errW, rowW) => {
            if (!errW && rowW) {
              const newQty = rowW.quantity - (item.quantity || item.qty);
              if (newQty <= 0) {
                db.run(`DELETE FROM prepared_waste WHERE id = ?`, [rowW.id]);
              } else {
                db.run(`UPDATE prepared_waste SET quantity = ? WHERE id = ?`, [newQty, rowW.id]);
              }
            }
          });
        }

        db.run(itemSql, [id, item.item_id || item.id, item.item_name || item.name, item.price, item.quantity || item.qty, item.notes || '', 'preparing'], (err) => {
          if (err) console.error("Error inserting appended item:", err);
        });
      });

      // Sync order update to Supabase
      queueOrderChange(id, 'update');

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
            existingMap[item.item_id] = { qty: 0, name: item.item_name, price: item.price, ids: [] };
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
              notes: item.notes || '',
              isFromPreparedWaste: item.isFromPreparedWaste
            };
          }
          incomingMap[itemId].qty += (item.quantity || item.qty);
          if (item.notes) {
             incomingMap[itemId].notes = incomingMap[itemId].notes ? incomingMap[itemId].notes + ' | ' + item.notes : item.notes;
          }
        });

        // 1. Process Updates & Deletions
        const isPreparingOrLater = order && ['preparing', 'ready', 'completed'].includes(order.status);
        const batchTimestamp = new Date().toISOString();

        Object.keys(existingMap).forEach(itemIdStr => {
          const existing = existingMap[itemIdStr];
          const incoming = incomingMap[itemIdStr];
          const itemId = parseInt(itemIdStr, 10);
          const isCustom = isNaN(itemId);
          
          if (!incoming) {
            // Item was DELETED completely
            db.run(`INSERT INTO voided_items (order_id, item_name, price, quantity, admin_remark) VALUES (?, ?, ?, ?, ?)`,
              [id, existing.name, existing.price, existing.qty, admin_edit_remark || 'Removed from Order']);

            if (isPreparingOrLater && !isCustom) {
              db.all(`SELECT stock_item_id, quantity_required FROM item_ingredients WHERE menu_item_id = ?`, [itemId], (err, ingredients) => {
                if (!err && ingredients) {
                  ingredients.forEach(ing => {
                    const totalRequired = ing.quantity_required * existing.qty;
                    db.run(`UPDATE stock_items SET quantity = quantity + ? WHERE id = ?`, [totalRequired, ing.stock_item_id]);
                    db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, 'add', ?, ?)`, [ing.stock_item_id, totalRequired, `Refund from Order #${id} (Deleted)`]);
                  });
                }
              });
            }
            existing.ids.forEach(orderItemId => {
              db.run(`DELETE FROM order_items WHERE id = ?`, [orderItemId]);
            });
          } else {
            // Item exists in both, check for qty changes
            const diff = incoming.qty - existing.qty;
            
            if (diff !== 0) {
              if (diff < 0) {
                // Quantity was decreased
                db.run(`INSERT INTO voided_items (order_id, item_name, price, quantity, admin_remark) VALUES (?, ?, ?, ?, ?)`,
                  [id, incoming.name, incoming.price, Math.abs(diff), admin_edit_remark || 'Quantity Reduced']);

                // Reduce starting from newest rows
                db.all(`SELECT id, quantity FROM order_items WHERE order_id = ? AND item_id = ? ORDER BY id DESC`, [id, itemIdStr], (errRows, rows) => {
                  if (!errRows && rows) {
                    let toRemove = Math.abs(diff);
                    for (const row of rows) {
                      if (toRemove <= 0) break;
                      if (row.quantity <= toRemove) {
                        toRemove -= row.quantity;
                        db.run(`DELETE FROM order_items WHERE id = ?`, [row.id]);
                      } else {
                        db.run(`UPDATE order_items SET quantity = quantity - ? WHERE id = ?`, [toRemove, row.id]);
                        toRemove = 0;
                      }
                    }
                  }
                });
              } else {
                // Quantity was increased! Insert a new row for the delta.
                db.run(`INSERT INTO order_items (order_id, item_id, item_name, price, quantity, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [id, itemIdStr, incoming.name, incoming.price, diff, incoming.notes, 'preparing', batchTimestamp]);
              }

              if (isPreparingOrLater && !isCustom) {
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
            } else {
              // No qty change, update notes on the primary/first item row
              db.run(`UPDATE order_items SET notes = ? WHERE id = ?`, [incoming.notes, existing.ids[0]]);
            }
          }
        });

        // 2. Process Additions (Brand New Items)
        Object.keys(incomingMap).forEach(itemIdStr => {
          const incoming = incomingMap[itemIdStr];
          const itemId = parseInt(itemIdStr, 10);
          const isCustom = isNaN(itemId);
          
          if (!existingMap[itemIdStr]) {
            // NEW ITEM
            if (!incoming.isFromPreparedWaste) {
              if (isPreparingOrLater && !isCustom) {
                db.all(`SELECT stock_item_id, quantity_required FROM item_ingredients WHERE menu_item_id = ?`, [itemId], (err, ingredients) => {
                  if (!err && ingredients) {
                    ingredients.forEach(ing => {
                      const totalRequired = ing.quantity_required * incoming.qty;
                      db.run(`UPDATE stock_items SET quantity = quantity - ? WHERE id = ?`, [totalRequired, ing.stock_item_id]);
                      db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, 'remove', ?, ?)`, [ing.stock_item_id, totalRequired, `Added to Order #${id}`]);
                    });
                  }
                });
              }
            } else {
              // Decrement prepared_waste
              db.get(`SELECT id, quantity FROM prepared_waste WHERE item_name = ? LIMIT 1`, [incoming.name], (errW, rowW) => {
                if (!errW && rowW) {
                  const newQty = rowW.quantity - incoming.qty;
                  if (newQty <= 0) {
                    db.run(`DELETE FROM prepared_waste WHERE id = ?`, [rowW.id]);
                  } else {
                    db.run(`UPDATE prepared_waste SET quantity = ? WHERE id = ?`, [newQty, rowW.id]);
                  }
                }
              });
            }
            db.run(`INSERT INTO order_items (order_id, item_id, item_name, price, quantity, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
              [id, itemIdStr, incoming.name, incoming.price, incoming.qty, incoming.notes, 'preparing', batchTimestamp]);
          }
        });

        // Sync order update to Supabase
        queueOrderChange(id, 'update');

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

// @route   GET /api/orders/all
// @desc    Get ALL orders (active + completed + trashed) — admin only
router.get('/all', (req, res) => {
  const { include_trash, status } = req.query;
  let sql = `SELECT * FROM orders WHERE 1=1`;
  const params = [];

  if (include_trash !== 'true') {
    sql += ` AND deleted_at IS NULL`;
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY created_at DESC`;

  db.all(sql, params, (err, orders) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch orders' });
    if (!orders.length) return res.json([]);

    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => '?').join(',');
    db.all(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`, orderIds, (err2, items) => {
      if (err2) return res.status(500).json({ error: 'Failed to fetch order items' });
      res.json(orders.map(o => ({ ...o, items: (items || []).filter(i => i.order_id === o.id) })));
    });
  });
});

// @route   PATCH /api/orders/:id/trash
// @desc    Soft-delete (move to trash)
router.patch('/:id/trash', (req, res) => {
  const { id } = req.params;
  db.run(`UPDATE orders SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`, [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to trash order' });
    if (this.changes === 0) return res.status(404).json({ error: 'Order not found or already trashed' });
    res.json({ success: true, id, trashed: true });
  });
});

// @route   PATCH /api/orders/:id/restore
// @desc    Restore from trash
router.patch('/:id/restore', (req, res) => {
  const { id } = req.params;
  db.run(`UPDATE orders SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL`, [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to restore order' });
    if (this.changes === 0) return res.status(404).json({ error: 'Order not found or not in trash' });
    res.json({ success: true, id, restored: true });
  });
});

// @route   DELETE /api/orders/:id
// @desc    Permanently delete an order (admin only — must be in trash first)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  // Permanently delete (cascade handles order_items)
  runWithRetry(`DELETE FROM orders WHERE id = ?`, [id], 5, 300, function(err) {
    if (err) {
      console.error('Error deleting order:', err.message);
      return res.status(500).json({ error: 'Failed to delete order: ' + err.message });
    }
    if (this.changes === 0) return res.status(404).json({ error: 'Order not found' });
    queueOrderChange(id, 'delete');
    res.json({ success: true, deletedId: id });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL REQUEST WORKFLOW — Role-based approval system
// ─────────────────────────────────────────────────────────────────────────────

// @route   POST /api/orders/:id/cancel-request
// @desc    Waiter submits a cancel request for a preparing/ready order
router.post('/:id/cancel-request', (req, res) => {
  const { id } = req.params;
  const { requested_by, requested_role, reason } = req.body;
  if (!requested_by || !requested_role) {
    return res.status(400).json({ error: 'requested_by and requested_role are required' });
  }
  // Check order exists and is cancellable via request
  db.get(`SELECT * FROM orders WHERE id = ?`, [id], (err, order) => {
    if (err || !order) return res.status(404).json({ error: 'Order not found' });
    if (['cancelled', 'completed'].includes(order.status)) {
      return res.status(400).json({ error: `Cannot request cancel for a ${order.status} order` });
    }
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Remarks (Reason) is required to request cancellation' });
    }
    // Check no duplicate pending request
    db.get(`SELECT id FROM cancel_requests WHERE order_id = ? AND status = 'pending'`, [id], (err2, existing) => {
      if (existing) return res.status(409).json({ error: 'A cancel request is already pending for this order' });
      db.run(
        `INSERT INTO cancel_requests (order_id, requested_by, requested_role, reason) VALUES (?, ?, ?, ?)`,
        [id, requested_by, requested_role, reason],
        function(err3) {
          if (err3) return res.status(500).json({ error: 'Failed to create cancel request' });
          queueOrderChange(id, 'update');
          queueCancelRequestChange(this.lastID, 'insert');
          res.json({ success: true, requestId: this.lastID, message: 'Cancel request submitted successfully' });
        }
      );
    });
  });
});

// @route   GET /api/orders/cancel-requests
// @desc    Get all cancel requests (optionally filter by status)
router.get('/cancel-requests', (req, res) => {
  const { status } = req.query; // 'pending', 'approved', 'rejected', or omit for all
  const sql = status
    ? `SELECT cr.*, o.table_number, o.area, o.status as order_status, o.total_amount, u.name as requester_name, ru.name as resolver_name
       FROM cancel_requests cr
       JOIN orders o ON cr.order_id = o.id
       LEFT JOIN users u ON cr.requested_by = u.username
       LEFT JOIN users ru ON cr.resolved_by = ru.username
       WHERE cr.status = ?
       ORDER BY cr.created_at DESC`
    : `SELECT cr.*, o.table_number, o.area, o.status as order_status, o.total_amount, u.name as requester_name, ru.name as resolver_name
       FROM cancel_requests cr
       JOIN orders o ON cr.order_id = o.id
       LEFT JOIN users u ON cr.requested_by = u.username
       LEFT JOIN users ru ON cr.resolved_by = ru.username
       ORDER BY cr.created_at DESC`;
  const params = status ? [status] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch cancel requests' });
    // Attach order items to each request
    if (!rows || rows.length === 0) return res.json([]);
    const orderIds = [...new Set(rows.map(r => r.order_id))];
    const placeholders = orderIds.map(() => '?').join(',');
    db.all(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`, orderIds, (err2, items) => {
      const itemsMap = {};
      (items || []).forEach(item => {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        itemsMap[item.order_id].push(item);
      });
      const result = rows.map(r => ({ ...r, items: itemsMap[r.order_id] || [] }));
      res.json(result);
    });
  });
});

// @route   PATCH /api/orders/cancel-requests/:reqId/approve
// @desc    Cashier or Admin approves a cancel request — triggers actual cancellation
router.patch('/cancel-requests/:reqId/approve', (req, res) => {
  const { reqId } = req.params;
  const { resolved_by, resolved_role, refund_raw, log_waste, resolve_remark } = req.body;
  if (!resolved_by || !resolved_role) {
    return res.status(400).json({ error: 'resolved_by and resolved_role are required' });
  }
  if (!resolve_remark || resolve_remark.trim() === '') {
    return res.status(400).json({ error: 'Remarks (Reason) is required to approve cancellation' });
  }
  db.get(`SELECT * FROM cancel_requests WHERE id = ?`, [reqId], (err, cancelReq) => {
    if (err || !cancelReq) return res.status(404).json({ error: 'Cancel request not found' });
    if (cancelReq.status !== 'pending') {
      if (cancelReq.status === 'rejected' && resolved_role === 'admin') {
        // Admin can override rejected requests
      } else {
        return res.status(400).json({ error: `Request already ${cancelReq.status}` });
      }
    }

    // Role permission check
    db.get(`SELECT * FROM orders WHERE id = ?`, [cancelReq.order_id], (err2, order) => {
      if (err2 || !order) return res.status(404).json({ error: 'Order not found' });

      const isPreparing = order.status === 'preparing';
      const isReady = order.status === 'ready';
      const isCompleted = order.status === 'completed';

      // Only admin can cancel ready or completed orders
      if ((isReady || isCompleted) && resolved_role !== 'admin') {
        return res.status(403).json({ error: 'Only admin can approve cancellation of ready or completed orders' });
      }

      // 24-hour restriction for completed orders
      if (isCompleted) {
        const completedAt = new Date(order.created_at);
        const hoursSince = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince > 24) {
          return res.status(403).json({ error: 'Cannot cancel completed orders older than 24 hours' });
        }
      }

      // Mark request approved
      db.run(
        `UPDATE cancel_requests SET status = 'approved', resolved_by = ?, resolved_role = ?, resolve_remark = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [resolved_by, resolved_role, resolve_remark, reqId],
        (err3) => {
          if (err3) return res.status(500).json({ error: 'Failed to approve request' });

          // Fetch items and execute cancellation
          db.all(`SELECT * FROM order_items WHERE order_id = ?`, [cancelReq.order_id], (err4, orderItems) => {
            db.run(`UPDATE orders SET status = 'cancelled' WHERE id = ?`, [cancelReq.order_id], (err5) => {
              if (err5) return res.status(500).json({ error: 'Failed to cancel order' });

              // Free the table
              if (order.table_number && order.area !== 'Delivery') {
                db.run(`UPDATE tables SET status = 'available' WHERE table_number = ?`, [order.table_number], () => {
                  db.get(`SELECT id FROM tables WHERE table_number = ?`, [order.table_number], (e, row) => {
                    if (!e && row) queueTableChange(row.id, 'update');
                  });
                });
              }

              const wasDeducted = ['preparing', 'ready', 'completed'].includes(order.status);
              const doRefund = refund_raw !== false && wasDeducted;
              const doWaste = log_waste !== false && wasDeducted;

              // Refund raw stock
              if (doRefund && orderItems && orderItems.length > 0) {
                orderItems.forEach(item => {
                  if (item.item_id) {
                    db.all(`SELECT stock_item_id, quantity_required FROM item_ingredients WHERE menu_item_id = ?`, [item.item_id], (e2, ingredients) => {
                      if (!e2 && ingredients) {
                        ingredients.forEach(ing => {
                          const total = ing.quantity_required * item.quantity;
                          db.run(`UPDATE stock_items SET quantity = quantity + ? WHERE id = ?`, [total, ing.stock_item_id]);
                          db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, 'add', ?, ?)`,
                            [ing.stock_item_id, total, `Refund — Approved Cancel Request #${reqId} Order #${cancelReq.order_id} (${item.item_name} x${item.quantity})`]);
                        });
                      }
                    });
                  }
                });
              }

              // Log prepared waste
              if (doWaste && orderItems && orderItems.length > 0) {
                orderItems.forEach(item => {
                  if (item.item_name !== 'Service Charges') {
                    db.run(`INSERT INTO prepared_waste (item_name, quantity, reason) VALUES (?, ?, ?)`,
                      [item.item_name, item.quantity, `Approved Cancel Request #${reqId} — Order #${cancelReq.order_id} (by ${resolved_by})`]);
                  }
                });
              }

              queueOrderChange(cancelReq.order_id, 'update');
              queueCancelRequestChange(reqId, 'update');
              res.json({ success: true, message: 'Cancel request approved and order cancelled' });
            });
          });
        }
      );
    });
  });
});

// @route   PATCH /api/orders/cancel-requests/:reqId/reject
// @desc    Cashier or Admin rejects a cancel request
router.patch('/cancel-requests/:reqId/reject', (req, res) => {
  const { reqId } = req.params;
  const { resolved_by, reject_reason } = req.body;
  if (!resolved_by) return res.status(400).json({ error: 'resolved_by is required' });
  if (!reject_reason || reject_reason.trim() === '') {
    return res.status(400).json({ error: 'Remarks (Rejection Reason) is required to reject' });
  }
  db.get(`SELECT * FROM cancel_requests WHERE id = ?`, [reqId], (err, cancelReq) => {
    if (err || !cancelReq) return res.status(404).json({ error: 'Cancel request not found' });
    if (cancelReq.status !== 'pending') return res.status(400).json({ error: `Request already ${cancelReq.status}` });
    db.run(
      `UPDATE cancel_requests SET status = 'rejected', resolved_by = ?, reject_reason = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [resolved_by, reject_reason, reqId],
      (err2) => {
        if (err2) return res.status(500).json({ error: 'Failed to reject request' });
        queueOrderChange(cancelReq.order_id, 'update');
        queueCancelRequestChange(reqId, 'update');
        res.json({ success: true, message: 'Cancel request rejected' });
      }
    );
  });
});

// @route   PATCH /api/orders/:id/cancel
// @desc    Cancel an order, refund stock if selected, and log waste if selected
router.patch('/:id/cancel', (req, res) => {

  const { id } = req.params;
  const { refund_raw, log_waste, reason = 'Customer Cancelled' } = req.body;

  // Get the order first to know the items and table number
  db.get(`SELECT * FROM orders WHERE id = ?`, [id], (err, order) => {
    if (err || !order) {
      return res.status(500).json({ error: 'Order not found' });
    }

    db.all(`SELECT * FROM order_items WHERE order_id = ?`, [id], (err, orderItems) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch order items' });
      }

      // Update order status to 'cancelled'
      db.run(`UPDATE orders SET status = 'cancelled' WHERE id = ?`, [id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to cancel order' });
        }

        // Set table to available if it is a table
        if (order.table_number && order.area !== 'Delivery') {
          db.run(`UPDATE tables SET status = 'available' WHERE table_number = ?`, [order.table_number], (errT) => {
            if (!errT) {
              db.get(`SELECT id FROM tables WHERE table_number = ?`, [order.table_number], (errG, row) => {
                if (!errG && row) {
                  queueTableChange(row.id, 'update');
                }
              });
            }
          });
        }

        // 1. If refund raw is true, refund ingredient stock only if it was previously deducted (status preparing or later)
        const wasDeducted = order && ['preparing', 'ready', 'completed'].includes(order.status);
        if (refund_raw && wasDeducted && orderItems.length > 0) {
          orderItems.forEach(item => {
            if (item.item_id) {
              db.all(`SELECT stock_item_id, quantity_required FROM item_ingredients WHERE menu_item_id = ?`, [item.item_id], (err2, ingredients) => {
                if (!err2 && ingredients) {
                  ingredients.forEach(ing => {
                    const totalRequired = ing.quantity_required * item.quantity;
                    db.run(`UPDATE stock_items SET quantity = quantity + ? WHERE id = ?`, [totalRequired, ing.stock_item_id]);
                    db.run(`INSERT INTO stock_logs (item_id, action, qty_changed, remarks) VALUES (?, 'add', ?, ?)`, 
                      [ing.stock_item_id, totalRequired, `Refund from Cancelled Order #${id} (${item.item_name} x${item.quantity})`]);
                  });
                }
              });
            }
          });
        }

        // 2. If log waste is true, insert into prepared_waste
        if (log_waste && orderItems.length > 0) {
          const wasteSql = `INSERT INTO prepared_waste (item_name, quantity, reason) VALUES (?, ?, ?)`;
          orderItems.forEach(item => {
            // Ignore Service Charges virtual item when logging prepared food waste
            if (item.item_name !== 'Service Charges') {
              db.run(wasteSql, [item.item_name, item.quantity, `Order #${id} - ${reason}`]);
            }
          });
        }

        // Sync order status to Supabase
        queueOrderChange(id, 'update');

        res.json({ success: true, message: 'Order cancelled successfully' });
      });
    });
  });
});

// @route   GET /api/orders/returns-pending
// @desc    Get all pending, cancelled, and returned orders, and prepared waste logs & outflows
router.get('/returns-pending', (req, res) => {
  const sql = `SELECT * FROM orders WHERE status IN ('pending', 'preparing', 'ready', 'cancelled', 'returned') ORDER BY created_at DESC`;
  db.all(sql, [], (err, orders) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch returns/pending orders' });

    const fetchWasteAndOutflows = (mappedOrders) => {
      db.all(`SELECT * FROM prepared_waste ORDER BY created_at DESC`, [], (errW, waste) => {
        if (errW) return res.status(500).json({ error: 'Failed to fetch prepared waste' });
        
        db.all(`SELECT * FROM prepared_waste_outflow ORDER BY created_at DESC LIMIT 100`, [], (errO, outflows) => {
          if (errO) return res.status(500).json({ error: 'Failed to fetch waste outflows' });
          
          res.json({ 
            orders: mappedOrders, 
            waste: waste || [], 
            outflows: outflows || [] 
          });
        });
      });
    };

    if (orders.length === 0) {
      fetchWasteAndOutflows([]);
      return;
    }

    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => '?').join(',');
    db.all(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`, orderIds, (err2, items) => {
      if (err2) return res.status(500).json({ error: 'Failed to fetch order items' });

      const mappedOrders = orders.map(o => ({
        ...o,
        items: items.filter(i => i.order_id === o.id)
      }));

      fetchWasteAndOutflows(mappedOrders);
    });
  });
});

// @route   POST /api/orders/prepared-waste/:id/outflow
// @desc    Record where a prepared waste item went (Staff, Owner, Spoiled, etc.) and decrement it
router.post('/prepared-waste/:id/outflow', (req, res) => {
  const { id } = req.params;
  const { quantity, destination, notes = '' } = req.body;

  db.get(`SELECT * FROM prepared_waste WHERE id = ?`, [id], (err, waste) => {
    if (err || !waste) return res.status(404).json({ error: 'Waste log not found' });

    const qtyToOutflow = Math.min(quantity, waste.quantity);
    const newQty = waste.quantity - qtyToOutflow;

    db.serialize(() => {
      // 1. Insert record into prepared_waste_outflow
      db.run(
        `INSERT INTO prepared_waste_outflow (item_name, quantity, destination, notes) VALUES (?, ?, ?, ?)`,
        [waste.item_name, qtyToOutflow, destination, notes]
      );

      // 2. Decrement or delete from prepared_waste
      if (newQty <= 0) {
        db.run(`DELETE FROM prepared_waste WHERE id = ?`, [id]);
      } else {
        db.run(`UPDATE prepared_waste SET quantity = ? WHERE id = ?`, [newQty, id]);
      }

      res.json({ success: true, message: 'Outflow recorded successfully' });
    });
  });
});

// @route   DELETE /api/orders/prepared-waste/:id
// @desc    Delete a prepared waste entry
router.delete('/prepared-waste/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM prepared_waste WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete waste log' });
    res.json({ success: true, id });
  });
});

// @route   DELETE /api/orders/prepared-waste-outflow/:id
// @desc    Delete a prepared waste outflow entry
router.delete('/prepared-waste-outflow/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM prepared_waste_outflow WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete waste outflow log' });
    res.json({ success: true, id });
  });
});

// @route   GET /api/orders/rider/:username
// @desc    Get all completed orders delivered by a specific rider (for rider dashboard history)
router.get('/rider/:username', (req, res) => {
  const { username } = req.params;
  const sql = `
    SELECT * FROM orders 
    WHERE status = 'completed' AND delivered_by = ?
    ORDER BY created_at DESC
  `;

  db.all(sql, [username], (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch rider report' });
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

// @route   GET /api/orders/voided-items
// @desc    Get all voided items (removed from orders after being sent)
router.get('/voided-items', (req, res) => {
  db.all(`SELECT * FROM voided_items ORDER BY voided_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch voided items: ' + err.message });
    res.json(rows || []);
  });
});

// @route   DELETE /api/orders/voided-items/:id
// @desc    Delete a voided item log entry
router.delete('/voided-items/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM voided_items WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete voided item log' });
    res.json({ success: true, id });
  });
});

// @route   PATCH /api/orders/items/:itemId/status
// @desc    Update status of a specific order item (e.g. mark ready or served)
router.patch('/items/:itemId/status', (req, res) => {
  const { itemId } = req.params;
  const { status } = req.body; // 'preparing', 'ready', 'served'

  if (!['preparing', 'ready', 'served'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Get order_id first
  db.get(`SELECT order_id FROM order_items WHERE id = ?`, [itemId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Order item not found' });
    const orderId = row.order_id;

    db.run(`UPDATE order_items SET status = ? WHERE id = ?`, [status, itemId], function(err2) {
      if (err2) return res.status(500).json({ error: 'Failed to update item status' });

      // Check overall order status: if all items are now served, we could leave it or let cashier finish.
      // But if all items are at least 'ready' (or 'served'), we can automatically update the order status to 'ready'!
      db.all(`SELECT status FROM order_items WHERE order_id = ?`, [orderId], (err3, items) => {
        if (!err3 && items) {
          const allReadyOrServed = items.every(item => ['ready', 'served'].includes(item.status));
          if (allReadyOrServed) {
            db.run(`UPDATE orders SET status = 'ready', has_new_updates = 1 WHERE id = ?`, [orderId]);
          } else {
            // If at least one is cooking/preparing, make sure order is marked 'preparing'
            const hasCooking = items.some(item => item.status === 'preparing');
            if (hasCooking) {
              db.run(`UPDATE orders SET status = 'preparing', has_new_updates = 1 WHERE id = ?`, [orderId]);
            }
          }
        }
        queueOrderChange(orderId, 'update');
        res.json({ success: true, itemId, status });
      });
    });
  });
});

// @route   POST /api/orders/:id/serve-all
// @desc    Mark all ready items in the order as served
router.post('/:id/serve-all', (req, res) => {
  const { id } = req.params;

  db.run(`UPDATE order_items SET status = 'served' WHERE order_id = ? AND status = 'ready'`, [id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to serve all ready items' });
    queueOrderChange(id, 'update');
    res.json({ success: true, orderId: id, changes: this.changes });
  });
});

module.exports = router;
