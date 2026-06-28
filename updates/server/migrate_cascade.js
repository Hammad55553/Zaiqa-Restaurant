/**
 * Migration: Add ON DELETE CASCADE to order_items.order_id
 * Run once: node migrate_cascade.js
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database/pos.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Disable FK checks during migration
  db.run('PRAGMA foreign_keys = OFF');
  db.run('PRAGMA journal_mode = WAL');

  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='order_items'", (err, row) => {
    if (err) { console.error('Error reading schema:', err.message); return; }
    console.log('Current order_items schema:\n', row?.sql, '\n');
  });

  db.run('BEGIN TRANSACTION');

  // 1. Create new table with ON DELETE CASCADE
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items_new (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      item_id     INTEGER,
      item_name   TEXT,
      price       REAL,
      quantity    INTEGER DEFAULT 1,
      notes       TEXT DEFAULT '',
      status      TEXT DEFAULT 'preparing',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => { if (err) console.error('Create table error:', err.message); else console.log('New table created'); });

  // 2. Copy all data
  db.run(`INSERT INTO order_items_new SELECT id, order_id, item_id, item_name, price, quantity, notes, status, created_at FROM order_items`,
    (err) => { if (err) console.error('Copy data error:', err.message); else console.log('Data copied'); });

  // 3. Drop old table
  db.run(`DROP TABLE order_items`,
    (err) => { if (err) console.error('Drop table error:', err.message); else console.log('Old table dropped'); });

  // 4. Rename new table
  db.run(`ALTER TABLE order_items_new RENAME TO order_items`,
    (err) => { if (err) console.error('Rename error:', err.message); else console.log('Table renamed to order_items'); });

  db.run('COMMIT');

  // Re-enable FK
  db.run('PRAGMA foreign_keys = ON');

  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='order_items'", (err, row) => {
    if (err) { console.error(err.message); return; }
    console.log('\nNew order_items schema:\n', row?.sql);
    console.log('\n✅ Migration complete! ON DELETE CASCADE is now active.');
    db.close();
  });
});
