const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { queueOrderChange, queueTableChange } = require('../services/syncHelper');

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

    const targetStatus = status || orderRow.status;
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

      // If order is completed, set table to available (optional release_table parameter)
      const releaseTable = req.body.release_table !== false;
      if (orderRow.table_number && orderRow.area !== 'Delivery' && targetStatus === 'completed' && releaseTable) {
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
          status,
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

        // 1. Process Updates & Deletions
        Object.keys(existingMap).forEach(itemIdStr => {
          const itemId = parseInt(itemIdStr, 10);
          const existing = existingMap[itemId];
          const incoming = incomingMap[itemId];
          
          if (!incoming) {
            // Item was DELETED completely
            if (isPreparingOrLater) {
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
            
            if (diff !== 0 && isPreparingOrLater) {
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
            if (!incoming.isFromPreparedWaste) {
              if (isPreparingOrLater) {
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
            db.run(`INSERT INTO order_items (order_id, item_id, item_name, price, quantity, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
              [id, itemId, incoming.name, incoming.price, incoming.qty, incoming.notes, 'preparing']);
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
      // Sync deleted order from Supabase
      queueOrderChange(id, 'delete');
      res.json({ success: true, deletedId: id });
    });
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

module.exports = router;
