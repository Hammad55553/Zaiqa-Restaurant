import { API_BASE } from '../config';

/**
 * Real-time Sync Service for Multi-Device POS
 * Syncs orders, tables, inventory, and other data across all connected devices
 */

class SyncService {
  constructor() {
    this.listeners = {}; // Event listeners
    this.syncInterval = null;
    this.lastSyncTime = {};
    this.pollInterval = 5000; // Poll every 5 seconds
  }

  /**
   * Subscribe to sync events (orders, inventory, tables, etc)
   */
  subscribe(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of an event
   */
  emit(eventType, data) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in ${eventType} listener:`, err);
        }
      });
    }
  }

  /**
   * Start real-time sync for all entities
   */
  startSync() {
    console.log('🔄 Starting real-time sync...');
    
    // Sync orders periodically
    this.syncOrders();
    this.orderSyncInterval = setInterval(() => this.syncOrders(), this.pollInterval);

    // Sync tables periodically
    this.syncTables();
    this.tableSyncInterval = setInterval(() => this.syncTables(), this.pollInterval);

    // Sync inventory periodically
    this.syncInventory();
    this.inventorySyncInterval = setInterval(() => this.syncInventory(), this.pollInterval * 2); // Less frequent

    // Sync customers periodically
    this.syncCustomers();
    this.customerSyncInterval = setInterval(() => this.syncCustomers(), this.pollInterval * 2);
  }

  /**
   * Stop all sync operations
   */
  stopSync() {
    console.log('⛔ Stopping real-time sync');
    clearInterval(this.orderSyncInterval);
    clearInterval(this.tableSyncInterval);
    clearInterval(this.inventorySyncInterval);
    clearInterval(this.customerSyncInterval);
  }

  /**
   * Fetch and emit orders updates
   */
  async syncOrders() {
    try {
      const response = await fetch(`${API_BASE}/orders`);
      if (response.ok) {
        const orders = await response.json();
        this.emit('orders:update', orders);
      }
    } catch (err) {
      console.error('Error syncing orders:', err);
    }
  }

  /**
   * Fetch and emit table updates
   */
  async syncTables() {
    try {
      const response = await fetch(`${API_BASE}/tables`);
      if (response.ok) {
        const tables = await response.json();
        this.emit('tables:update', tables);
      }
    } catch (err) {
      console.error('Error syncing tables:', err);
    }
  }

  /**
   * Fetch and emit inventory updates
   */
  async syncInventory() {
    try {
      const response = await fetch(`${API_BASE}/inventory`);
      if (response.ok) {
        const items = await response.json();
        this.emit('inventory:update', items);
      }
    } catch (err) {
      console.error('Error syncing inventory:', err);
    }
  }

  /**
   * Fetch and emit customer updates
   */
  async syncCustomers() {
    try {
      const response = await fetch(`${API_BASE}/customers`);
      if (response.ok) {
        const customers = await response.json();
        this.emit('customers:update', customers);
      }
    } catch (err) {
      console.error('Error syncing customers:', err);
    }
  }

  /**
   * Sync stock levels (ingredient tracking)
   */
  async syncStock() {
    try {
      const response = await fetch(`${API_BASE}/stock`);
      if (response.ok) {
        const stock = await response.json();
        this.emit('stock:update', stock);
      }
    } catch (err) {
      console.error('Error syncing stock:', err);
    }
  }

  /**
   * Notify other devices when an order is placed
   */
  notifyOrderPlaced(order) {
    this.emit('orders:new', order);
    // Trigger sync to ensure all devices get latest
    setTimeout(() => this.syncOrders(), 500);
  }

  /**
   * Notify other devices when table status changes
   */
  notifyTableStatusChange(table) {
    this.emit('tables:status-change', table);
    // Trigger sync to ensure all devices get latest
    setTimeout(() => this.syncTables(), 500);
  }

  /**
   * Notify other devices when inventory changes
   */
  notifyInventoryChange(item) {
    this.emit('inventory:change', item);
    // Trigger sync to ensure all devices get latest
    setTimeout(() => this.syncInventory(), 500);
  }

  /**
   * Get current device ID (for tracking which device made changes)
   */
  getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }
}

// Export singleton instance
export const syncService = new SyncService();
