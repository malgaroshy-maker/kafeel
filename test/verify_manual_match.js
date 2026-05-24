import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables
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
  console.log('=== Starting Backend Manual Matchmaking Verification ===');
  
  // 1. Sign in as admin to emulate full permissions
  console.log('Signing in as admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@kafeel.ly',
    password: 'KafeelAdmin2026'
  });
  if (authError) {
    console.error('Sign in failed:', authError);
    return;
  }
  console.log('Signed in successfully!');

  // 2. Fetch Jamal and Mustafa transactions
  console.log('Fetching seeded transactions for Jamal and Mustafa...');
  const { data: txs, error: fetchErr } = await supabase
    .from('transactions')
    .select(`
      id,
      status,
      customers (
        id,
        name,
        national_id,
        workplace_id,
        salary
      )
    `)
    .in('status', ['WAITING_MATCH', 'MATCHED']);

  if (fetchErr) {
    console.error('Error fetching transactions:', fetchErr);
    return;
  }

  const jamalTx = txs.find(t => t.customers && (t.customers.name === 'جمال جمال' || t.customers.name.includes('جمال')));
  const mustafaTx = txs.find(t => t.customers && (t.customers.name === 'مصطفى مصطفى' || t.customers.name.includes('مصطفى')));

  if (!jamalTx || !mustafaTx) {
    console.error('Could not find both Jamal and Mustafa transactions in DB! Did you seed them?', { jamalTx, mustafaTx });
    return;
  }

  console.log(`Found Jamal Tx: ${jamalTx.id} (status: ${jamalTx.status})`);
  console.log(`Found Mustafa Tx: ${mustafaTx.id} (status: ${mustafaTx.status})`);

  // Reset statuses first to ensure we test clean WAITING_MATCH transition
  console.log('Resetting transactions to WAITING_MATCH and clearing guarantors for clean test...');
  await supabase.from('transaction_guarantors').delete().in('transaction_id', [jamalTx.id, mustafaTx.id]);
  await supabase.from('transactions_raw').update({ status: 'WAITING_MATCH' }).in('id', [jamalTx.id, mustafaTx.id]);

  // Verify they are WAITING_MATCH
  const { data: txsBefore } = await supabase
    .from('transactions_raw')
    .select('id, status')
    .in('id', [jamalTx.id, mustafaTx.id]);
  console.log('Transactions status before manual matchmaking:', txsBefore);

  // 3. Emulate manual circular linking:
  // Jamal guarantees Mustafa, Mustafa guarantees Jamal
  console.log('Executing manual circular matchmaking...');

  // Match 1: Mustafa guarantees Jamal
  console.log(`Linking Mustafa as guarantor for Jamal's transaction...`);
  const { error: g1Err } = await supabase.from('transaction_guarantors').insert({
    transaction_id: jamalTx.id,
    guarantor_name: mustafaTx.customers.name,
    guarantor_national_id: mustafaTx.customers.national_id,
    workplace_id: mustafaTx.customers.workplace_id,
    match_type: 'MANUAL',
    match_status: 'CONFIRMED'
  });
  if (g1Err) throw g1Err;

  const { error: tx1Err } = await supabase.from('transactions_raw')
    .update({ status: 'MATCHED' })
    .eq('id', jamalTx.id);
  if (tx1Err) throw tx1Err;

  // Match 2: Jamal guarantees Mustafa
  console.log(`Linking Jamal as guarantor for Mustafa's transaction...`);
  const { error: g2Err } = await supabase.from('transaction_guarantors').insert({
    transaction_id: mustafaTx.id,
    guarantor_name: jamalTx.customers.name,
    guarantor_national_id: jamalTx.customers.national_id,
    workplace_id: jamalTx.customers.workplace_id,
    match_type: 'MANUAL',
    match_status: 'CONFIRMED'
  });
  if (g2Err) throw g2Err;

  const { error: tx2Err } = await supabase.from('transactions_raw')
    .update({ status: 'MATCHED' })
    .eq('id', mustafaTx.id);
  if (tx2Err) throw tx2Err;

  console.log('Matchmaking database entries written successfully!');

  // 4. Verify status transition and guarantor load
  console.log('Verifying final database state...');
  const { data: txsAfter, error: fetchAfterErr } = await supabase
    .from('transactions')
    .select(`
      id,
      status,
      customers (name),
      transaction_guarantors (
        guarantor_name,
        guarantor_national_id,
        match_status
      )
    `)
    .in('id', [jamalTx.id, mustafaTx.id]);

  if (fetchAfterErr) {
    console.error('Error fetching state after:', fetchAfterErr);
    return;
  }

  console.log('=== Results ===');
  txsAfter.forEach(t => {
    console.log(`Transaction for ${t.customers?.name}:`);
    console.log(`  - Status: ${t.status} (Expected: MATCHED)`);
    console.log(`  - Guarantors Count: ${t.transaction_guarantors?.length || 0} (Expected: 1)`);
    console.log(`  - Guarantor Name: ${t.transaction_guarantors?.[0]?.guarantor_name}`);
    console.log(`  - Guarantor National ID: ${t.transaction_guarantors?.[0]?.guarantor_national_id}`);
    console.log(`  - Guarantor Match Status: ${t.transaction_guarantors?.[0]?.match_status} (Expected: CONFIRMED)`);
  });

  await supabase.auth.signOut();
  console.log('=== Backend Manual Matchmaking Verification Completed! ===');
}

main().catch(err => {
  console.error('Error in manual matchmaking verification:', err);
});
