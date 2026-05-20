import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwpesjsnwsdjerxfuqio.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cGVzanNud3NkamVyeGZ1cWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDk2MTcsImV4cCI6MjA5MzQ4NTYxN30.qI8iUA9Fp02kjog988CQPgY9-340ltko7Lh7-RemTWA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Testing column existence...');
  const { data, error } = await supabase
    .from('transactions')
    .select('id, verification_status, rejection_reason')
    .limit(1);

  if (error) {
    console.error('Error selecting column:', error);
  } else {
    console.log('Successfully queried! Data:', data);
  }
}

check();
