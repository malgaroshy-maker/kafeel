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
  console.log('Signing in as admin...');
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

  const targetUserId = '360d5613-9bcf-46bd-955e-dbe889942866';

  console.log('1. Setting role to manager...');
  const resRole = await fetch(
    `${env.VITE_SUPABASE_URL}/functions/v1/admin-manage-users`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        action: 'update_role',
        user_id: targetUserId,
        new_role: 'manager'
      })
    }
  );

  if (!resRole.ok) {
    console.error('Failed to update role:', await resRole.text());
  } else {
    console.log('Successfully updated role to manager in auth metadata.');
  }

  console.log('2. Resetting password...');
  const resPass = await fetch(
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
        user_id: targetUserId,
        new_password: 'SecurePassword123'
      })
    }
  );

  if (!resPass.ok) {
    console.error('Failed to reset password:', await resPass.text());
  } else {
    console.log('Successfully reset password.');
  }

  console.log('3. Updating user profile table in database...');
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      email: 'abubakr@kafeel.ly',
      role: 'manager',
      phone: '0911234560',
      accepted_terms: true,
      accepted_terms_at: new Date().toISOString()
    })
    .eq('id', targetUserId);

  if (profileError) {
    console.error('Failed to update user profile in DB:', profileError);
  } else {
    console.log('Successfully updated user profile in DB.');
  }

  console.log('All done.');
  await supabase.auth.signOut();
}

run();
