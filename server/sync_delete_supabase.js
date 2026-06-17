/**
 * Sync delete: Remove dummy test orders from Supabase
 * These were deleted from local SQLite but Supabase still has them.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const DUMMY_NAMES = [
  'Maryam Tariq', 'Sana Malik', 'Hamza Yousuf', 'Fatima Bilal',
  'Ahmed Raza', 'Aisha Khan', 'Bilal Ahmed', 'Muhammad Ali',
  'Zainab Bibi', 'Usman Sheikh', 'Amna Javed', 'Omer Farooq'
];

async function deleteFromSupabase() {
  console.log('\n=== Deleting dummy orders from Supabase ===\n');

  // 1. First check how many are there
  const { data: allOrders, error: fetchErr } = await supabase
    .from('orders')
    .select('id, customer_name, table_number, created_at, total_amount')
    .order('id', { ascending: true });

  if (fetchErr) {
    console.error('❌ Failed to fetch from Supabase:', fetchErr.message);
    process.exit(1);
  }

  console.log(`Total orders in Supabase: ${allOrders.length}`);

  const dummyOrders = allOrders.filter(o => DUMMY_NAMES.includes(o.customer_name));
  const realOrders = allOrders.filter(o => !DUMMY_NAMES.includes(o.customer_name));

  console.log(`Dummy orders to delete: ${dummyOrders.length}`);
  console.log(`Real orders to keep: ${realOrders.length}`);

  if (realOrders.length > 0) {
    console.log('\n✅ Real orders that will be KEPT:');
    realOrders.forEach(o => console.log(`  #${o.id} - ${o.customer_name} - Table ${o.table_number} - Rs.${o.total_amount}`));
  }

  if (dummyOrders.length === 0) {
    console.log('\n✅ No dummy orders found in Supabase. Already clean!');
    return;
  }

  // 2. Delete dummy orders (Supabase cascade will handle order_items)
  const dummyIds = dummyOrders.map(o => o.id);
  console.log(`\nDeleting ${dummyIds.length} dummy orders from Supabase...`);

  // Delete in batches of 50
  const batchSize = 50;
  let totalDeleted = 0;
  for (let i = 0; i < dummyIds.length; i += batchSize) {
    const batch = dummyIds.slice(i, i + batchSize);
    const { error } = await supabase
      .from('orders')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`❌ Batch ${Math.floor(i/batchSize)+1} failed:`, error.message);
    } else {
      totalDeleted += batch.length;
      console.log(`  ✅ Batch ${Math.floor(i/batchSize)+1}: Deleted ${batch.length} orders (total: ${totalDeleted})`);
    }
  }

  // 3. Verify
  const { data: remaining } = await supabase.from('orders').select('id, customer_name, total_amount');
  console.log(`\n🎉 Done! Supabase now has ${remaining?.length ?? '?'} orders.`);
  if (remaining?.length > 0) {
    remaining.forEach(o => console.log(`  #${o.id} - ${o.customer_name} - Rs.${o.total_amount}`));
  }
}

deleteFromSupabase().catch(console.error);
