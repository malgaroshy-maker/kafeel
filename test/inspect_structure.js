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

  // Query columns via RPC or from information_schema if possible?
  // Wait, does Supabase have a way to fetch schema? Let's check with standard select on a view or table if we can.
  // Wait, PostgREST doesn't expose information_schema directly unless it's in the API schema list.
  // Let's check if we can call an RPC or if we can run a postgres inspect via fetch.
  // Wait, let's check what tables are in the information_schema using fetch:
  const { data: cols, error: err } = await supabase
    .from('transactions')
    .select('*')
    .limit(1);
    
  if (err) {
    console.error('Transactions query error:', err);
  } else {
    console.log('Columns fetched:', Object.keys(cols[0] || {}));
  }

  // Let's fetch one row from transactions_raw if we have access
  const { data: raw, error: rawErr } = await supabase
    .from('transactions_raw')
    .select('*')
    .limit(1);

  if (rawErr) {
    console.log('Transactions_raw fetch error:', rawErr.message);
  } else {
    console.log('Transactions_raw keys:', Object.keys(raw[0] || {}));
  }
}

main();
