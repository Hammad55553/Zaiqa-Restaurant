// Supabase Client Configuration
// This file initializes the Supabase client using the credentials provided by the user.

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
