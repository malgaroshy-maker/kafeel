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

  // Check Customers
  console.log('--- Checking Test Customers ---');
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .in('national_id', ['120061234567', '119971234567']);
  if (custErr) console.error('Error fetching customers:', custErr);
  else console.log('Customers:', customers);

  // Check Transaction
  console.log('--- Checking Test Transaction ---');
  const { data: txs, error: txsErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2');
  if (txsErr) console.error('Error fetching transaction:', txsErr);
  else console.log('Transaction:', txs);

  // Check Guarantor Linkage
  console.log('--- Checking Guarantor Linkage ---');
  const { data: guarantors, error: guarErr } = await supabase
    .from('transaction_guarantors')
    .select('*')
    .eq('transaction_id', 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2');
  if (guarErr) console.error('Error fetching guarantors:', guarErr);
  else console.log('Guarantors Linked:', guarantors);

  // Check Settlements
  console.log('--- Checking Settlements ---');
  const { data: settlements, error: setErr } = await supabase
    .from('settlements')
    .select('*')
    .eq('transaction_id', 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2');
  if (setErr) console.error('Error fetching settlements:', setErr);
  else console.log('Settlements:', settlements);
}

main();
