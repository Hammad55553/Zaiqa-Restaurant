require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pbhfxcjdupukgdpbeusc.supabase.co';
// Use service role key to bypass RLS and delete data
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_cqyt1JDiEdiZGLwkRfH2Vw_d4XaJ1Vv'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// These are transaction tables. 
const tablesToClear = [
  'order_items', 'orders', 'delivery_order_items', 'delivery_orders',
  'cancel_requests', 'voided_items', 'prepared_waste', 'prepared_waste_outflow',
  'stock_logs', 'supplier_ledger', 'customer_ledger', 'expenses', 'messages', 'sync_queue'
];

async function wipeSupabaseData() {
  console.log('=== Wiping Data from Supabase ===');
  
  for (const table of tablesToClear) {
    console.log(`Clearing ${table}...`);
    // Delete all records
    const { data, error } = await supabase
      .from(table)
      .delete()
      .not('id', 'is', null); // This deletes all rows where 'id' is not null
      
    if (error) {
      console.error(`❌ Failed to clear ${table}:`, error.message);
    } else {
      console.log(`✅ Cleared ${table}`);
    }
  }
}

function wipeLocalSQLite() {
  console.log('\n=== Wiping Local SQLite Database ===');
  const dbPaths = [
    path.join(__dirname, 'database', 'pos.db'),
    path.join(__dirname, 'database', 'pos.db-shm'),
    path.join(__dirname, 'database', 'pos.db-wal')
  ];
  
  dbPaths.forEach(dbPath => {
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
        console.log(`✅ Deleted ${path.basename(dbPath)}`);
      } catch (err) {
        console.error(`❌ Failed to delete ${path.basename(dbPath)}:`, err.message);
      }
    }
  });
}

async function run() {
  await wipeSupabaseData();
  wipeLocalSQLite();
  console.log('\n🎉 All old transaction data has been cleared from Supabase and Local DB! Please restart your server.');
}

run();
