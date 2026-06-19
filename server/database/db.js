const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const fs = require('fs');

// Connect to SQLite database (it will create pos.db if it doesn't exist)
const dbPath = process.env.ELECTRON_USER_DATA_PATH 
  ? path.join(process.env.ELECTRON_USER_DATA_PATH, 'pos.db')
  : path.resolve(__dirname, 'pos.db');

// Check if an OTA update included a fresh database to overwrite the local one
const overwriteDbPath = path.resolve(__dirname, 'overwrite_pos.db');
if (fs.existsSync(overwriteDbPath)) {
  console.log('🔄 Found overwrite_pos.db. Overwriting local database with fresh data...');
  try {
    fs.copyFileSync(overwriteDbPath, dbPath);
    fs.unlinkSync(overwriteDbPath);
    console.log('✅ Successfully overwritten local database.');
  } catch (e) {
    console.error('❌ Failed to overwrite database:', e);
  }
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');

    // ── Performance Tuning ─────────────────────────────────────────────
    db.configure('busyTimeout', 15000);            // wait up to 15s on lock
    db.serialize(() => {
      db.run('PRAGMA journal_mode = WAL;');         // concurrent reads + writes
      db.run('PRAGMA foreign_keys = ON;');          // enforce FK constraints
      db.run('PRAGMA synchronous = NORMAL;');       // safe + faster than FULL
      db.run('PRAGMA cache_size = -65536;');        // 64 MB query cache
      db.run('PRAGMA mmap_size = 268435456;');      // 256 MB memory-mapped I/O
      db.run('PRAGMA temp_store = MEMORY;');        // temp tables in RAM
      db.run('PRAGMA optimize;');                   // auto-analyze query planner
    });
  }
});

db.on('error', (err) => {
  console.error("SQLite Error:", err.message);
});

// Initialize database tables
const initDb = () => {
  db.serialize(() => {
    // Sync Queue Table
    db.run(`CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Settings Table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`, () => {
      db.get("SELECT COUNT(*) as count FROM settings WHERE key = 'global_gst_rate'", [], (err, row) => {
        if (row && row.count === 0) {
          db.run("INSERT INTO settings (key, value) VALUES ('global_gst_rate', '0')");
        }
      });
      db.get("SELECT COUNT(*) as count FROM settings WHERE key = 'global_service_charges'", [], (err, row) => {
        if (row && row.count === 0) {
          db.run("INSERT INTO settings (key, value) VALUES ('global_service_charges', '0')");
        }
      });
    });

    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions TEXT,
      name TEXT
    )`, () => {
      // Add permissions column in case of existing installations
      db.run(`ALTER TABLE users ADD COLUMN permissions TEXT`, () => {
        // Add name column in case of existing installations
        db.run(`ALTER TABLE users ADD COLUMN name TEXT`, () => {
          // Seed default admin user if the table is empty
          db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
            if (row && row.count === 0) {
              const defaultPerms = JSON.stringify([
                'pos', 'delivery', 'tables', 'kds', 'inventory', 'stock', 
                'suppliers', 'khata', 'expenses', 'reports', 'settings', 'users'
              ]);
              db.run(
                `INSERT INTO users (username, password, role, permissions, name) VALUES (?, ?, ?, ?, ?)`,
                ['admin', 'admin123', 'admin', defaultPerms, 'Administrator'],
                (err2) => {
                  if (err2) console.error('Admin seeding error:', err2.message);
                  else console.log('🌱 Seeded default admin user.');
                }
              );
            }
          });
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

    // Chat Messages Table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_username TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Chat Message Receipts Table
    db.run(`CREATE TABLE IF NOT EXISTS message_receipts (
      message_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      status TEXT NOT NULL, -- 'delivered', 'read'
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (message_id, username),
      FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
    )`);

    // Chat Message Reactions Table
    db.run(`CREATE TABLE IF NOT EXISTS message_reactions (
      message_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      reaction TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (message_id, username),
      FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
    )`);

    // Menu Items Table
    db.run(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
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
        deleted_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Add columns if they don't exist (for existing DBs)
      db.run(`ALTER TABLE orders ADD COLUMN admin_edit_remark TEXT`, (err) => {});
      db.run(`ALTER TABLE orders ADD COLUMN has_new_updates BOOLEAN DEFAULT 0`, (err) => {});
      db.run(`ALTER TABLE orders ADD COLUMN deleted_at DATETIME DEFAULT NULL`, (err) => {});
      db.run(`ALTER TABLE orders ADD COLUMN created_by TEXT`, (err) => {});
      db.run(`ALTER TABLE orders ADD COLUMN delivered_by TEXT`, (err) => {});
      db.run(`ALTER TABLE orders ADD COLUMN invoice_number TEXT`, (err) => {});
      db.run(`ALTER TABLE orders ADD COLUMN payment_status TEXT`, (err) => {});
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
    )`);
    db.run(`ALTER TABLE order_items ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {});
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
        FOREIGN KEY (item_id) REFERENCES stock_items (id) ON DELETE CASCADE
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
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE
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

      // Prepared Waste Table (cooked but not served/cancelled items)
      db.run(`CREATE TABLE IF NOT EXISTS prepared_waste (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Prepared Waste Outflow Table (records where the returned/wasted food went)
      db.run(`CREATE TABLE IF NOT EXISTS prepared_waste_outflow (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        destination TEXT NOT NULL, -- 'Staff Consumed', 'Owner Consumed', 'Spoiled/Discarded', 'Other'
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Voided Items Table (audit log for items deleted or reduced after sending)
      db.run(`CREATE TABLE IF NOT EXISTS voided_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        item_name TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        admin_remark TEXT,
        voided_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
      )`);

      // Cancel Requests Table — role-based approval workflow
      db.run(`CREATE TABLE IF NOT EXISTS cancel_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        requested_by TEXT NOT NULL,
        requested_role TEXT NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        resolved_by TEXT,
        resolved_role TEXT,
        resolve_remark TEXT,
        reject_reason TEXT,
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
      )`);
      // Add columns dynamically for existing databases
      db.run("ALTER TABLE cancel_requests ADD COLUMN resolved_role TEXT", () => {});
      db.run("ALTER TABLE cancel_requests ADD COLUMN resolve_remark TEXT", () => {});

      db.run(`CREATE INDEX IF NOT EXISTS idx_cancel_req_order ON cancel_requests(order_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_cancel_req_status ON cancel_requests(status)`);


      // ── Performance Indexes ────────────────────────────────────────────
      // Orders — most frequently queried columns
      db.run(`CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_orders_table         ON orders(table_number)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_orders_created       ON orders(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_orders_status_date   ON orders(status, created_at)`);

      // Order Items — always joined by order_id
      db.run(`CREATE INDEX IF NOT EXISTS idx_oi_order_id          ON order_items(order_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_oi_item_id           ON order_items(item_id)`);

      // Inventory
      db.run(`CREATE INDEX IF NOT EXISTS idx_items_cat            ON items(category_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_items_name           ON items(name)`);

      // Stock
      db.run(`CREATE INDEX IF NOT EXISTS idx_stock_logs_item      ON stock_logs(item_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_stock_logs_date      ON stock_logs(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_ingredients_menu     ON item_ingredients(menu_item_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_ingredients_stock    ON item_ingredients(stock_item_id)`);

      // Customers & Suppliers
      db.run(`CREATE INDEX IF NOT EXISTS idx_cust_ledger          ON customer_ledger(customer_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_sup_ledger           ON supplier_ledger(supplier_id)`);

      // Delivery
      db.run(`CREATE INDEX IF NOT EXISTS idx_delivery_status      ON delivery_orders(delivery_status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_delivery_date        ON delivery_orders(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_delivery_items       ON delivery_order_items(delivery_order_id)`);

      // Chat / Messages
      db.run(`CREATE INDEX IF NOT EXISTS idx_messages_date        ON messages(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_receipts_msg         ON message_receipts(message_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_reactions_msg        ON message_reactions(message_id)`);

      // Sync Queue
      db.run(`CREATE INDEX IF NOT EXISTS idx_sync_status          ON sync_queue(status)`);

      // Expenses
      db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_date        ON expenses(date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_cat         ON expenses(category)`);

      console.log('✅ DB indexes verified/created.');
    });
};

module.exports = { db, initDb };
