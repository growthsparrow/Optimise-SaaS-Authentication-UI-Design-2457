import {createClient} from '@supabase/supabase-js';

const SUPABASE_URL='https://tyqtfqlvqkznvjntemdg.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_bXvpm9vSu8WCevEIlQrNSg_XhhTGu2-';

const adminSupabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'optimise-admin-auth'
  }
});

export default adminSupabase;