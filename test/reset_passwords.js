import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  // 1. Sign in as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@kafeel.ly',
    password: 'KafeelAdmin2026'
  });
  if (authError) {
    console.error('Sign in failed:', authError);
    return;
  }
  console.log('Signed in as admin.');
  const sessionToken = authData.session.access_token;

  const usersToReset = [
    { id: 'eac9ea39-28c0-4d27-b7e0-082a548faea6', email: 'staff1@kafeel.ly', name: 'Staff One' },
    { id: 'cdf05089-6bbc-4804-8b1e-b63cdbad92f5', email: 'accountant1@kafeel.ly', name: 'Accountant One' }
  ];

  for (const u of usersToReset) {
    console.log(`Resetting password for ${u.name} (${u.email})...`);
    // Call Edge Function
    const res = await fetch(
      `${env.VITE_SUPABASE_URL}/functions/v1/admin-manage-users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          action: 'reset_password',
          user_id: u.id,
          new_password: 'SecurePassword123'
        })
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Failed to reset password for ${u.name}:`, errText);
    } else {
      console.log(`Password reset success for ${u.name}.`);
    }

    // Update email in user_profiles
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ email: u.email, accepted_terms: true, accepted_terms_at: new Date().toISOString() })
      .eq('id', u.id);

    if (updateError) {
      console.error(`Failed to update user_profile email for ${u.name}:`, updateError);
    } else {
      console.log(`Updated user_profile email and terms for ${u.name} successfully.`);
    }
  }

  // Log out admin
  await supabase.auth.signOut();
  console.log('All done.');
}

run();
