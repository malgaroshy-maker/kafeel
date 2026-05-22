import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@kafeel.ly',
    password: 'KafeelAdmin2026'
  });
  if (authError) {
    console.error('Admin Sign in failed:', authError);
    return;
  }
  
  // Try using admin client to list users
  // Wait, let's look at auth users using supabase.rpc or public tables since auth.users isn't exposed unless we use service_role.
  // Wait, does user_profiles have the managers?
  const { data: profiles, error: pError } = await supabase
    .from('user_profiles')
    .select('*');
  
  console.log('Profiles:', profiles);
}

run();
