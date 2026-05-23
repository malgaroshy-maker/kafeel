import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function main() {
  console.log('Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@kafeel.ly',
    password: 'KafeelAdmin2026'
  });
  if (authError) {
    console.error('Sign in failed:', authError);
    return;
  }
  console.log('Signed in successfully!');

  // We can query the system catalogs using a SQL injection or through an RPC if one exists.
  // Wait! Do we have any RPC that lets us query or run SQL?
  // Let's check wait - can we inspect using a POST request or select?
  // Wait, information_schema is exposed in Supabase's REST API sometimes, let's try to query it!
  const { data: info, error: infoErr } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, ordinal_position')
    .eq('table_name', 'transactions')
    .order('ordinal_position');

  if (infoErr) {
    console.log('Error querying information_schema via standard route:', infoErr.message);
  } else {
    console.log('Information Schema for VIEW transactions:');
    info.forEach(c => console.log(`${c.ordinal_position}: ${c.column_name} (${c.data_type})`));
  }
}

main();
