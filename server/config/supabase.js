// Supabase client for background sync.
// This must NEVER crash the whole server — the POS has to keep working even if
// Supabase/ws fail to load. So everything here is wrapped in try/catch and we
// export a client that may be null; callers already handle sync errors.

let createClient = null;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch (e) {
  console.error('⚠️ @supabase/supabase-js not available — sync disabled:', e.message);
}

// ws is optional; if it isn't resolvable, let supabase-js use its default transport.
let ws = null;
try {
  ws = require('ws');
} catch (e) {
  console.warn('⚠️ ws module not available — using default realtime transport.');
}

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://pbhfxcjdupukgdpbeusc.supabase.co';

// Prefer the service_role key (bypasses RLS). Desktop server only.
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const PUBLISHABLE_FALLBACK = 'sb_publishable_cqyt1JDiEdiZGLwkRfH2Vw_d4XaJ1Vv';
const SUPABASE_KEY = SERVICE_ROLE_KEY || PUBLISHABLE_FALLBACK;

if (!SERVICE_ROLE_KEY) {
  console.warn(
    '⚠️ SUPABASE_SERVICE_ROLE_KEY not set — falling back to the publishable key.\n' +
    '   Sync writes may be rejected by RLS. Add the key to server/.env.'
  );
}

let supabase = null;
try {
  if (createClient) {
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
    };
    // Only set a custom transport if ws loaded successfully.
    if (ws) options.realtime = { transport: ws };

    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, options);
    console.log(
      `✅ Supabase Client initialized (${SERVICE_ROLE_KEY ? 'service_role' : 'publishable/anon'} key).`
    );
  }
} catch (e) {
  console.error('⚠️ Failed to initialize Supabase client — sync disabled:', e.message);
  supabase = null;
}

module.exports = { supabase };
