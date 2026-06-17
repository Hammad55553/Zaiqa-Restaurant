/**
 * Migration: Fix all missing ON DELETE CASCADE constraints
 * Tables: items, stock_logs, supplier_ledger
 */
const sqlite3 = require('@vscode/sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.resolve(__dirname, 'database/pos.db'));

function runSql(sql, label) {
  return new Promise((resolve, reject) => {
    db.run(sql, function(err) {
      if (err) { console.error(`❌ ${label}:`, err.message); reject(err); }
      else { console.log(`✅ ${label}`); resolve(this); }
    });
  });
}

async function migrate() {
  console.log('\n=== Starting CASCADE Migration ===\n');

  await runSql('PRAGMA foreign_keys = OFF', 'FK off');
  await runSql('BEGIN TRANSACTION', 'Transaction start');

  try {
    // ── 1. items: category_id → SET NULL on delete (so items stay if cat deleted) ──
    console.log('\n[1] Fixing items table...');
    await runSql(`
      CREATE TABLE items_new (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        name        TEXT NOT NULL,
        price       REAL NOT NULL,
        image       TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `, 'items_new created');
    await runSql(`INSERT INTO items_new SELECT id, category_id, name, price, image FROM items`, 'items data copied');
    await runSql(`DROP TABLE items`, 'items old dropped');
    await runSql(`ALTER TABLE items_new RENAME TO items`, 'items renamed');

    // ── 2. stock_logs: CASCADE delete when stock item deleted ──
    console.log('\n[2] Fixing stock_logs table...');
    await runSql(`
      CREATE TABLE stock_logs_new (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id     INTEGER,
        action      TEXT,
        qty_changed REAL,
        remarks     TEXT,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES stock_items(id) ON DELETE CASCADE
      )
    `, 'stock_logs_new created');
    await runSql(`INSERT INTO stock_logs_new SELECT id, item_id, action, qty_changed, remarks, created_at FROM stock_logs`, 'stock_logs data copied');
    await runSql(`DROP TABLE stock_logs`, 'stock_logs old dropped');
    await runSql(`ALTER TABLE stock_logs_new RENAME TO stock_logs`, 'stock_logs renamed');

    // ── 3. supplier_ledger: CASCADE delete when supplier deleted ──
    console.log('\n[3] Fixing supplier_ledger table...');
    await runSql(`
      CREATE TABLE supplier_ledger_new (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id TEXT NOT NULL,
        type        TEXT NOT NULL,
        amount      REAL NOT NULL,
        note        TEXT,
        date        DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
      )
    `, 'supplier_ledger_new created');
    await runSql(`INSERT INTO supplier_ledger_new SELECT id, supplier_id, type, amount, note, date FROM supplier_ledger`, 'supplier_ledger data copied');
    await runSql(`DROP TABLE supplier_ledger`, 'supplier_ledger old dropped');
    await runSql(`ALTER TABLE supplier_ledger_new RENAME TO supplier_ledger`, 'supplier_ledger renamed');

    await runSql('COMMIT', 'Transaction committed');
    await runSql('PRAGMA foreign_keys = ON', 'FK re-enabled');

    // Re-create indexes lost by table recreate
    console.log('\n[4] Re-creating indexes...');
    await runSql(`CREATE INDEX IF NOT EXISTS idx_items_cat       ON items(category_id)`,       'idx items cat');
    await runSql(`CREATE INDEX IF NOT EXISTS idx_items_name      ON items(name)`,               'idx items name');
    await runSql(`CREATE INDEX IF NOT EXISTS idx_stock_logs_item ON stock_logs(item_id)`,       'idx stock logs item');
    await runSql(`CREATE INDEX IF NOT EXISTS idx_stock_logs_date ON stock_logs(created_at)`,    'idx stock logs date');
    await runSql(`CREATE INDEX IF NOT EXISTS idx_sup_ledger      ON supplier_ledger(supplier_id)`, 'idx supplier ledger');

    console.log('\n🎉 All CASCADE migrations done! Deletes will now work for menu items, stock, and suppliers.\n');
    db.close();
  } catch (err) {
    console.error('\n💥 Migration failed, rolling back...', err.message);
    db.run('ROLLBACK', () => {
      db.run('PRAGMA foreign_keys = ON');
      db.close();
    });
  }
}

migrate();
