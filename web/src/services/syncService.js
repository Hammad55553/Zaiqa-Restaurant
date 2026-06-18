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
    this.ws = null;
  }

  /**
   * Connect to the WebSocket server for instant changes and notifications
   */
  connectWebSocket() {
    if (this.ws) {
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try { this.ws.close(); } catch(e){}
    }

    const wsUrl = API_BASE.replace(/^http/, 'ws').replace(/\/api$/, '');
    console.log(`🔌 Connecting to WebSocket sync server at: ${wsUrl}`);
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 WS Message received:', data);
        
        if (data.type === 'SYNC_TRIGGER') {
          // Trigger local state refreshes instantly!
          if (data.url.includes('/orders')) {
            this.syncOrders();
          } else if (data.url.includes('/tables')) {
            this.syncTables();
          } else if (data.url.includes('/inventory')) {
            this.syncInventory();
          } else if (data.url.includes('/customers')) {
            this.syncCustomers();
          } else if (data.url.includes('/stock')) {
            this.syncStock();
          }
        } else if (data.type === 'NOTIFICATION') {
          // Broadcast notification to all listeners
          this.emit('notification', data);
        } else if (data.type === 'CHAT_MESSAGE') {
          this.emit('chat_message', data);
        } else if (data.type === 'CHAT_RECEIPT_UPDATE') {
          this.emit('chat_receipt_update', data);
        } else if (data.type === 'CHAT_REACTION_UPDATE') {
          this.emit('chat_reaction_update', data);
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    };

    this.ws.onopen = () => {
      console.log('🔌 WebSocket connection established.');
      this.emit('connection_status', { online: true });
    };

    this.ws.onclose = (event) => {
      // Only reconnect if this is still the active socket instance and we haven't stopped sync
      if (this.ws && event.target === this.ws) {
        console.warn('🔌 WebSocket connection closed. Reconnecting in 3s...');
        this.emit('connection_status', { online: false });
        setTimeout(() => {
          if (this.ws && event.target === this.ws) {
            this.connectWebSocket();
          }
        }, 3000);
      }
    };

    this.ws.onerror = (err) => {
      console.error('🔌 WebSocket connection error:', err);
      this.emit('connection_status', { online: false });
    };
  }

  /**
   * Send a chat message over WebSocket
   */
  sendChatMessage(sender_username, sender_role, text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        sender_username,
        sender_role,
        text
      }));
      return true;
    }
    return false;
  }

  /**
   * Send delivery/read receipt over WebSocket
   */
  sendChatReceipt(message_id, username, status) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: status === 'read' ? 'CHAT_MESSAGE_READ' : 'CHAT_MESSAGE_DELIVERED',
        message_id,
        username
      }));
    }
  }

  /**
   * Send a chat reaction over WebSocket
   */
  sendChatReaction(message_id, username, reaction) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'CHAT_MESSAGE_REACTION',
        message_id,
        username,
        reaction
      }));
    }
  }

  /**
   * Send a custom notification to other devices
   */
  sendNotification(title, desc) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'NOTIFICATION',
        title,
        desc,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        id: `notif-${Date.now()}`
      }));
    }
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
    
    // Connect WebSocket first
    this.connectWebSocket();

    // Sync orders periodically
    this.syncOrders();
    this.orderSyncInterval = setInterval(() => this.syncOrders(), this.pollInterval * 2);

    // Sync tables periodically
    this.syncTables();
    this.tableSyncInterval = setInterval(() => this.syncTables(), this.pollInterval * 2);

    // Sync inventory periodically
    this.syncInventory();
    this.inventorySyncInterval = setInterval(() => this.syncInventory(), this.pollInterval * 4); // Less frequent

    // Sync customers periodically
    this.syncCustomers();
    this.customerSyncInterval = setInterval(() => this.syncCustomers(), this.pollInterval * 4);
  }

  /**
   * Stop all sync operations
   */
  stopSync() {
    console.log('⛔ Stopping real-time sync');
    if (this.ws) {
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try { this.ws.close(); } catch(e){}
      this.ws = null;
    }
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
