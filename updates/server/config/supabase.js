// ARCHITECTURE NOTE: Supabase is the primary remote database used for synchronizing all POS data (orders, stock, tables, users, etc.).
// Firebase/FCM is ONLY used for the real-time group chat module and push notifications. Do not use Firebase for main data storage or syncing.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase URL or Key is missing. Sync will not work.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

console.log('✅ Supabase Client initialized successfully.');

module.exports = { supabase };
