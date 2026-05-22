import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwpesjsnwsdjerxfuqio.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cGVzanNud3NkamVyeGZ1cWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDk2MTcsImV4cCI6MjA5MzQ4NTYxN30.qI8iUA9Fp02kjog988CQPgY9-340ltko7Lh7-RemTWA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Testing custom column insert...');
  const { data, error } = await supabase
    .from('customers')
    .insert({
      office_id: 'd9b9a244-df44-4dbc-b77d-e0f6af227f26', // dummy or valid uuid
      national_id: '123456789012',
      name: 'Test Customer',
      phone: '0912345678',
      salary: 1000,
      account_number: '123456789',
      phone_private: '0922345678'
    })
    .select();

  if (error) {
    console.error('Error inserting customer:', error);
  } else {
    console.log('Successfully inserted customer:', data);
  }
}

check();
