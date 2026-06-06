const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database (it will create pos.db if it doesn't exist)
const dbPath = process.env.ELECTRON_USER_DATA_PATH 
  ? path.join(process.env.ELECTRON_USER_DATA_PATH, 'pos.db')
  : path.resolve(__dirname, 'pos.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Set busy timeout at C-level (most reliable for WAL lock contention)
    db.configure('busyTimeout', 15000);
    
    // Enable WAL mode for concurrent read/write performance
    db.run('PRAGMA journal_mode = WAL;');
    // Enable foreign key enforcement
    db.run('PRAGMA foreign_keys = ON;');
  }
});

db.on('error', (err) => {
  console.error("SQLite Error:", err.message);
});

// Initialize database tables
const initDb = () => {
  db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions TEXT
    )`, () => {
      // Add permissions column in case of existing installations
      db.run(`ALTER TABLE users ADD COLUMN permissions TEXT`, () => {
        // Seed default admin user if the table is empty
        db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
          if (row && row.count === 0) {
            const defaultPerms = JSON.stringify([
              'pos', 'delivery', 'tables', 'kds', 'inventory', 'stock', 
              'suppliers', 'khata', 'expenses', 'reports', 'settings', 'users'
            ]);
            db.run(
              `INSERT INTO users (username, password, role, permissions) VALUES (?, ?, ?, ?)`,
              ['admin', 'admin123', 'admin', defaultPerms],
              (err2) => {
                if (err2) console.error('Admin seeding error:', err2.message);
                else console.log('🌱 Seeded default admin user.');
              }
            );
          }
        });
      });
    });

    // Tables Management Table (Recreating to add area and seats)
    db.serialize(() => {
      // Create new schema
      db.run(`CREATE TABLE IF NOT EXISTS tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number TEXT UNIQUE NOT NULL,
        area TEXT NOT NULL,
        seats INTEGER NOT NULL DEFAULT 4,
        status TEXT DEFAULT 'available' -- available, dining, reserved
      )`);

      // We will check if area column exists, if not, it means old table.
      // But SQLite ALTER TABLE ADD COLUMN is easier if we just try adding them and catch errors.
      db.run(`ALTER TABLE tables ADD COLUMN area TEXT DEFAULT 'Male Area'`, (err) => {});
      db.run(`ALTER TABLE tables ADD COLUMN seats INTEGER DEFAULT 4`, (err) => {});
    });

    // Categories Table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`);

    // Menu Items Table
    db.run(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    )`);

    // Orders Table
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number TEXT NOT NULL,
        area TEXT NOT NULL DEFAULT 'Main',
        customer_name TEXT,
        status TEXT DEFAULT 'pending', -- pending, preparing, ready, completed
        subtotal REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        remarks TEXT,
        admin_edit_remark TEXT,
        has_new_updates BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Add columns if they don't exist (for existing DBs)
      db.run(`ALTER TABLE orders ADD COLUMN admin_edit_remark TEXT`, (err) => {});
      db.run(`ALTER TABLE orders ADD COLUMN has_new_updates BOOLEAN DEFAULT 0`, (err) => {});
    });

    // Order Items (KOT)
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      item_id TEXT,
      item_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'preparing',
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
    )`);
    // Stock Inventory Tables
    db.run(`CREATE TABLE IF NOT EXISTS stock_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      min_alert REAL DEFAULT 0
    )`);

      db.run(`CREATE TABLE IF NOT EXISTS stock_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER,
        action TEXT, -- 'add', 'remove', 'set'
        qty_changed REAL,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES stock_items (id)
      )`);

      // Recipe/BOM (Bill of Materials) Table
      // Links Menu Items (items table) with Raw Materials (stock_items table)
      db.run(`CREATE TABLE IF NOT EXISTS item_ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        menu_item_id INTEGER NOT NULL,
        stock_item_id INTEGER NOT NULL,
        quantity_required REAL NOT NULL,
        FOREIGN KEY (menu_item_id) REFERENCES items (id) ON DELETE CASCADE,
        FOREIGN KEY (stock_item_id) REFERENCES stock_items (id) ON DELETE CASCADE
      )`);

      // Supplier Management Tables
      db.run(`CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT,
        contact TEXT,
        balance REAL DEFAULT 0,
        deleted_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS supplier_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id TEXT NOT NULL,
        type TEXT NOT NULL, -- 'Opening Balance', 'Stock Purchase', 'Payment Made'
        amount REAL NOT NULL,
        note TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
      )`);

      // Expenses Table
      db.run(`CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Khata Hub Customers Table
      db.run(`CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        type TEXT DEFAULT 'Client', -- 'Client' or 'Company'
        balance REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Khata Hub Customer Ledger
      db.run(`CREATE TABLE IF NOT EXISTS customer_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT NOT NULL,
        type TEXT NOT NULL, -- 'credit' or 'payment'
        amount REAL NOT NULL,
        note TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
      )`);

      // Delivery Orders Table
      db.run(`CREATE TABLE IF NOT EXISTS delivery_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_ref_id TEXT UNIQUE,          -- e.g. DEL-1779981518918
        backend_order_id TEXT,             -- KOT/backend order id
        customer_name TEXT,
        phone TEXT,
        address TEXT,
        rider_name TEXT,
        payment_method TEXT DEFAULT 'cod', -- 'cod', 'online', 'khata'
        transaction_id TEXT,
        remarks TEXT,
        delivery_status TEXT DEFAULT 'pending', -- pending, out-for-delivery, delivered, cancelled
        khata_charged INTEGER DEFAULT 0,   -- 0 or 1
        khata_customer_id TEXT,
        subtotal REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        total REAL DEFAULT 0,
        is_completed INTEGER DEFAULT 0,    -- 0 = active, 1 = completed invoice
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )`);

      // Add columns for existing DBs (safe to ignore errors)
      db.run(`ALTER TABLE delivery_orders ADD COLUMN backend_order_id TEXT`, () => {});
      db.run(`ALTER TABLE delivery_orders ADD COLUMN rider_name TEXT`, () => {});
      db.run(`ALTER TABLE delivery_orders ADD COLUMN transaction_id TEXT`, () => {});
      db.run(`ALTER TABLE delivery_orders ADD COLUMN khata_charged INTEGER DEFAULT 0`, () => {});
      db.run(`ALTER TABLE delivery_orders ADD COLUMN khata_customer_id TEXT`, () => {});
      db.run(`ALTER TABLE delivery_orders ADD COLUMN is_completed INTEGER DEFAULT 0`, () => {});
      db.run(`ALTER TABLE delivery_orders ADD COLUMN completed_at DATETIME`, () => {});

      // Delivery Order Items Table
      db.run(`CREATE TABLE IF NOT EXISTS delivery_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        delivery_order_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders (id) ON DELETE CASCADE
      )`);
    });
};

module.exports = { db, initDb };
