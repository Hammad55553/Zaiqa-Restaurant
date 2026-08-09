const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// Supabase project URL. Can be overridden via env for dev/prod projects.
const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://pbhfxcjdupukgdpbeusc.supabase.co';

// IMPORTANT: This server runs inside the trusted desktop admin app only.
// Use the SERVICE_ROLE key so writes bypass Row Level Security (RLS).
// The service_role key must NEVER be shipped in the mobile app or any client
// that runs on a customer device — keep it in the desktop server's .env only.
//
// Priority:
//   1. SUPABASE_SERVICE_ROLE_KEY  (correct choice for this backend)
//   2. SUPABASE_KEY               (generic override)
//   3. publishable/anon fallback  (will FAIL to write if RLS is enabled)
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const PUBLISHABLE_FALLBACK = 'sb_publishable_cqyt1JDiEdiZGLwkRfH2Vw_d4XaJ1Vv';

const SUPABASE_KEY = SERVICE_ROLE_KEY || PUBLISHABLE_FALLBACK;

if (!SERVICE_ROLE_KEY) {
  console.warn(
    '⚠️ SUPABASE_SERVICE_ROLE_KEY not set — falling back to the publishable (anon) key.\n' +
    '   If your tables have Row Level Security enabled, all sync writes will be rejected.\n' +
    '   Add SUPABASE_SERVICE_ROLE_KEY to server/.env to fix syncing.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: ws,
  },
});

console.log(
  `✅ Supabase Client initialized (${SERVICE_ROLE_KEY ? 'service_role' : 'publishable/anon'} key).`
);

module.exports = { supabase };
