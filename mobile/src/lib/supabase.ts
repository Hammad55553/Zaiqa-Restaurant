import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbhfxcjdupukgdpbeusc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cqyt1JDiEdiZGLwkRfH2Vw_d4XaJ1Vv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
