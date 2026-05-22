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

  console.log('Fetching workplaces...');
  const { data: workplaces } = await supabase.from('workplaces').select('id, name, required_guarantors').limit(5);
  console.log('Workplaces:', workplaces);

  console.log('Fetching banks...');
  const { data: banks } = await supabase.from('banks').select('id, name').limit(5);
  console.log('Banks:', banks);

  if (banks && banks.length > 0) {
    console.log('Fetching branches for bank:', banks[0].name);
    const { data: branches } = await supabase.from('branches').select('id, name').eq('bank_id', banks[0].id).limit(5);
    console.log('Branches:', branches);
  }
}

main();
