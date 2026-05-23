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

  // 1. Fetch office "مكتب البركة"
  console.log('Fetching office البركة...');
  const { data: offices } = await supabase.from('offices').select('*');
  console.log('Offices available:', offices?.map(o => ({ id: o.id, name: o.name })));
  
  const barakaOffice = offices?.find(o => o.name.includes('البركة'));
  if (!barakaOffice) {
    console.log('Could not find Al-Baraka office in DB!');
    return;
  }
  console.log('Found Al-Baraka Office:', barakaOffice);

  // 2. Fetch customers under Al-Baraka office
  console.log('Fetching customers...');
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('office_id', barakaOffice.id);
  console.log('Customers in Al-Baraka:', customers?.map(c => ({ id: c.id, name: c.name })));

  const ali = customers?.find(c => c.name.includes('علي'));
  const fathi = customers?.find(c => c.name.includes('فتحي'));
  console.log('Ali:', ali);
  console.log('Fathi:', fathi);

  // 3. Fetch transactions under Al-Baraka office
  console.log('Fetching transactions...');
  const { data: txs } = await supabase
    .from('transactions')
    .select('*')
    .eq('office_id', barakaOffice.id);
  
  console.log('Transactions in Al-Baraka:', txs?.map(t => ({
    id: t.id,
    customer_id: t.customer_id,
    customerName: customers?.find(c => c.id === t.customer_id)?.name || 'Unknown',
    status: t.status,
    verification_status: t.verification_status,
    office_loan: t.office_loan
  })));

  // 4. Fetch transaction guarantors for these transactions
  if (txs && txs.length > 0) {
    const txIds = txs.map(t => t.id);
    const { data: guarantors } = await supabase
      .from('transaction_guarantors')
      .select('*')
      .in('transaction_id', txIds);
    console.log('Guarantors mapped to Al-Baraka transactions:', guarantors);
  }
}

main();
