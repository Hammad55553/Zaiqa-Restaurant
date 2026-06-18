const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const SUPABASE_URL = 'https://pbhfxcjdupukgdpbeusc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cqyt1JDiEdiZGLwkRfH2Vw_d4XaJ1Vv';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: ws,
  }
});

console.log('✅ Supabase Client initialized successfully.');

module.exports = { supabase };
