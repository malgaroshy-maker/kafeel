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
  console.log('--- Seeding Test Customers for Waitlist Queue ---');
  
  // 1. Sign in as admin to bypass RLS/policies if needed
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

  // 2. Fetch Al-Baraka Office
  const { data: offices } = await supabase.from('offices').select('*');
  const barakaOffice = offices?.find(o => o.name.includes('البركة'));
  if (!barakaOffice) {
    console.error('Could not find Al-Baraka office!');
    return;
  }
  const officeId = barakaOffice.id;
  console.log(`Using Office: ${barakaOffice.name} (ID: ${officeId})`);

  // Define static IDs from fetch_data
  const bankId = '8876489c-02bc-499e-baf0-6cc12c93d3c9'; // مصرف الجمهورية
  const branchId = 'fcdb4d77-14be-46c8-9f5d-fab337e620da'; // فرع الميدان
  const workplaceId = '056f5e98-660f-478f-ab8b-4e2f5da090d2'; // وزارة الداخلية (1 required guarantor)

  // Clean up any existing customers named جمال or مصطفى to ensure idempotency
  console.log('Cleaning up existing Jamal/Mustafa records...');
  const { data: oldCustomers } = await supabase
    .from('customers')
    .select('id')
    .in('name', ['جمال جمال', 'مصطفى مصطفى']);

  if (oldCustomers && oldCustomers.length > 0) {
    const oldIds = oldCustomers.map(c => c.id);
    await supabase.from('transactions_raw').delete().in('customer_id', oldIds);
    await supabase.from('customers').delete().in('id', oldIds);
    console.log('Old test customer records cleaned up.');
  }

  // 3. Register Customer: Jamal
  console.log('Inserting customer: جمال جمال...');
  const { data: jamal, error: jamalErr } = await supabase
    .from('customers')
    .insert({
      office_id: officeId,
      name: 'جمال جمال',
      national_id: '119901234567',
      phone: '0919876543',
      salary: 2800,
      workplace_id: workplaceId,
      gender: 'male',
      birth_year: 1990,
      bank_id: bankId,
      branch_id: branchId,
      account_number: '123456789012345'
    })
    .select()
    .single();

  if (jamalErr) {
    console.error('Error inserting Jamal:', jamalErr);
    return;
  }
  console.log(`Jamal inserted successfully with ID: ${jamal.id}`);

  // Create WAITING_MATCH transaction for Jamal (verification_status = pending)
  console.log('Creating transaction for Jamal (status: WAITING_MATCH, verification: pending)...');
  const { error: txJamalErr } = await supabase
    .from('transactions_raw')
    .insert({
      office_id: officeId,
      customer_id: jamal.id,
      workplace_id: workplaceId,
      car_price: 95000,
      car_model: 'Hyundai Tucson 2024',
      margin_rate: 0.16,
      total_installments: 96,
      guarantors_needed: 1,
      status: 'WAITING_MATCH',
      verification_status: 'pending',
      down_payment: 16150
    });

  if (txJamalErr) {
    console.error('Error inserting transaction for Jamal:', txJamalErr);
    return;
  }
  console.log('Jamal transaction created.');

  // 4. Register Customer: Mustafa
  console.log('Inserting customer: مصطفى مصطفى...');
  const { data: mustafa, error: mustafaErr } = await supabase
    .from('customers')
    .insert({
      office_id: officeId,
      name: 'مصطفى مصطفى',
      national_id: '119912345678',
      phone: '0919876544',
      salary: 3100,
      workplace_id: workplaceId,
      gender: 'male',
      birth_year: 1991,
      bank_id: bankId,
      branch_id: branchId,
      account_number: '543210987654321'
    })
    .select()
    .single();

  if (mustafaErr) {
    console.error('Error inserting Mustafa:', mustafaErr);
    return;
  }
  console.log(`Mustafa inserted successfully with ID: ${mustafa.id}`);

  // Create WAITING_MATCH transaction for Jamal (verification_status = verified)
  console.log('Creating transaction for Mustafa (status: WAITING_MATCH, verification: verified)...');
  const { error: txMustafaErr } = await supabase
    .from('transactions_raw')
    .insert({
      office_id: officeId,
      customer_id: mustafa.id,
      workplace_id: workplaceId,
      car_price: 110000,
      car_model: 'Toyota Rav4 2023',
      margin_rate: 0.16,
      total_installments: 96,
      guarantors_needed: 1,
      status: 'WAITING_MATCH',
      verification_status: 'verified',
      down_payment: 23450
    });

  if (txMustafaErr) {
    console.error('Error inserting transaction for Mustafa:', txMustafaErr);
    return;
  }
  console.log('Mustafa transaction created.');

  await supabase.auth.signOut();
  console.log('--- Seed Completed Successfully! ---');
}

main().catch(err => {
  console.error('Error seeding test customers:', err);
});
