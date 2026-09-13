import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tyqtfqlvqkznvjntemdg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bXvpm9vSu8WCevEIlQrNSg_XhhTGu2-';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export default supabase;