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

  const officeId = 'cda6dd37-a0cf-4c92-93be-6e165c5da793'; // Al-Baraka

  console.log('--- Testing Query ---');
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      customer:customers (
        id,
        name,
        national_id,
        phone,
        salary,
        workplace:workplaces (
          name
        )
      ),
      settlements (
        *
      ),
      transaction_guarantors (
        *
      )
    `)
    .eq('office_id', officeId)
    .eq('status', 'COMPLETED')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Query error:', error);
  } else {
    console.log('Query succeeded! Completed transactions count:', data.length);
    console.log('First completed transaction customer:', data[0]?.customer);
    console.log('First completed transaction settlements:', data[0]?.settlements);
    console.log('First completed transaction guarantors:', data[0]?.transaction_guarantors);
  }
}

main();
