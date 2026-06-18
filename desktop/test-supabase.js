const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pbhfxcjdupukgdpbeusc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cqyt1JDiEdiZGLwkRfH2Vw_d4XaJ1Vv'; // wait, is this key valid? Let's test

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log('Querying admin user from Supabase...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .single();
    
    if (error) {
      console.error('❌ Supabase error:', error);
    } else {
      console.log('✅ Supabase success! Admin user:', data);
    }
  } catch (err) {
    console.error('❌ Connection exception:', err);
  }
}

test();
