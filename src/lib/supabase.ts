import { createClient } from '@supabase/supabase-js';

// ✅ Pull from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ✅ Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// ✅ TEST: Supabase Connection
supabase
  .from('profiles')
  .select('*')
  .limit(1)
  .then((res) => {
    console.log('✅ Supabase Connected:', res);
  })
  .catch((err) => {
    console.error('❌ Supabase Connection Error:', err);
  });

// --- Optional connection test ---
// supabase.from('profiles').select('*').limit(1)
//   .then(res => console.log('✅ Supabase Connected:', res))
//   .catch(err => console.error('❌ Supabase Error:', err));
