// Supabase Sync Helpers
// This service serializes SQLite records and enqueues them for background syncing.
// This separates local route handlers from database-specific syncing code.

const { db } = require('../database/db');
const { addToQueue } = require('../database/syncQueue');

/**
 * Queue an order change (with nested order items).
 * @param {number|string} orderId 
 * @param {'insert'|'update'|'delete'} action 
 */
function queueOrderChange(orderId, action) {
  if (action === 'delete') {
    addToQueue('orders', orderId, 'delete', { id: orderId });
    return;
  }

  // Fetch the main order
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) {
      console.warn(`⚠️ Cannot queue sync: Order #${orderId} not found locally.`);
      return;
    }

    // Fetch the order items
    db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId], (err2, items) => {
      if (err2) {
        console.error(`❌ Error fetching items for Order #${orderId} sync:`, err2.message);
        return;
      }

      // Attach items array to the main order payload
      const payload = {
        id: order.id,
        table_number: order.table_number,
        area: order.area,
        customer_name: order.customer_name,
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        total_amount: order.total_amount,
        remarks: order.remarks,
        admin_edit_remark: order.admin_edit_remark,
        created_by: order.created_by,
        created_at: order.created_at,
        items: items || [] // Nested items array
      };

      addToQueue('orders', order.id, action, payload);
    });
  });
}

/**
 * Queue an expense change.
 * @param {number|string} expenseId 
 * @param {'insert'|'update'|'delete'} action 
 */
function queueExpenseChange(expenseId, action) {
  if (action === 'delete') {
    addToQueue('expenses', expenseId, 'delete', { id: expenseId });
    return;
  }

  db.get('SELECT * FROM expenses WHERE id = ?', [expenseId], (err, expense) => {
    if (err || !expense) return;
    addToQueue('expenses', expense.id, action, expense);
  });
}

/**
 * Queue a menu item change.
 * @param {number|string} itemId 
 * @param {'insert'|'update'|'delete'} action 
 */
function queueInventoryChange(itemId, action) {
  if (action === 'delete') {
    addToQueue('items', itemId, 'delete', { id: itemId });
    return;
  }

  db.get('SELECT * FROM items WHERE id = ?', [itemId], (err, item) => {
    if (err || !item) return;
    addToQueue('items', item.id, action, item);
  });
}

/**
 * Queue a user credentials or permissions change.
 * @param {number|string} userId 
 * @param {'insert'|'update'|'delete'} action 
 */
function queueUserChange(userId, action) {
  if (action === 'delete') {
    addToQueue('users', userId, 'delete', { id: userId });
    return;
  }

  db.get('SELECT id, username, password, role, name, permissions FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return;
    addToQueue('users', user.id, action, user);
  });
}

/**
 * Queue a supplier change.
 */
function queueSupplierChange(supplierId, action) {
  if (action === 'delete') {
    addToQueue('suppliers', supplierId, 'delete', { id: supplierId });
    return;
  }
  db.get('SELECT * FROM suppliers WHERE id = ?', [supplierId], (err, supplier) => {
    if (err || !supplier) return;
    addToQueue('suppliers', supplier.id, action, supplier);
  });
}

/**
 * Queue a stock inventory change.
 */
function queueStockChange(stockItemId, action) {
  if (action === 'delete') {
    addToQueue('stock_items', stockItemId, 'delete', { id: stockItemId });
    return;
  }
  db.get('SELECT * FROM stock_items WHERE id = ?', [stockItemId], (err, item) => {
    if (err || !item) return;
    addToQueue('stock_items', item.id, action, item);
  });
}

/**
 * Queue a table layout change.
 */
function queueTableChange(tableId, action) {
  if (action === 'delete') {
    addToQueue('tables', tableId, 'delete', { id: tableId });
    return;
  }
  db.get('SELECT * FROM tables WHERE id = ?', [tableId], (err, table) => {
    if (err || !table) return;
    addToQueue('tables', table.id, action, table);
  });
}

/**
 * Queue a customer profile change.
 */
function queueCustomerChange(customerId, action) {
  if (action === 'delete') {
    addToQueue('customers', customerId, 'delete', { id: customerId });
    return;
  }
  db.get('SELECT * FROM customers WHERE id = ?', [customerId], (err, customer) => {
    if (err || !customer) return;
    addToQueue('customers', customer.id, action, customer);
  });
}

/**
 * Queue a delivery order change.
 */
function queueDeliveryChange(deliveryId, action) {
  if (action === 'delete') {
    addToQueue('delivery_orders', deliveryId, 'delete', { id: deliveryId });
    return;
  }
  db.get('SELECT * FROM delivery_orders WHERE id = ?', [deliveryId], (err, delivery) => {
    if (err || !delivery) return;

    db.all('SELECT * FROM delivery_order_items WHERE delivery_order_id = ?', [deliveryId], (err2, items) => {
      if (err2) {
        console.error(`❌ Error fetching items for delivery #${deliveryId}:`, err2.message);
        return;
      }
      const payload = {
        id: delivery.id,
        order_ref_id: delivery.order_ref_id,
        backend_order_id: delivery.backend_order_id,
        customer_name: delivery.customer_name,
        phone: delivery.phone,
        address: delivery.address,
        rider_name: delivery.rider_name,
        payment_method: delivery.payment_method,
        transaction_id: delivery.transaction_id,
        remarks: delivery.remarks,
        delivery_status: delivery.delivery_status,
        khata_charged: delivery.khata_charged,
        khata_customer_id: delivery.khata_customer_id,
        subtotal: delivery.subtotal,
        tax: delivery.tax,
        total: delivery.total,
        is_completed: delivery.is_completed,
        created_at: delivery.created_at,
        completed_at: delivery.completed_at,
        items: items || []
      };
      addToQueue('delivery_orders', delivery.id, action, payload);
    });
  });
}

module.exports = {
  queueOrderChange,
  queueExpenseChange,
  queueInventoryChange,
  queueUserChange,
  queueSupplierChange,
  queueStockChange,
  queueTableChange,
  queueCustomerChange,
  queueDeliveryChange
};
