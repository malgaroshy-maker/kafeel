import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwpesjsnwsdjerxfuqio.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cGVzanNud3NkamVyeGZ1cWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDk2MTcsImV4cCI6MjA5MzQ4NTYxN30.qI8iUA9Fp02kjog988CQPgY9-340ltko7Lh7-RemTWA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Querying offices...');
  const { data: offices, error: errOffices } = await supabase.from('offices').select('*');
  if (errOffices) {
    console.error('Error fetching offices:', errOffices);
  } else {
    console.log('Offices:', offices);
  }

  console.log('Querying user profiles...');
  const { data: profiles, error: errProfiles } = await supabase.from('user_profiles').select('*');
  if (errProfiles) {
    console.error('Error fetching profiles:', errProfiles);
  } else {
    console.log('Profiles:', profiles);
  }
}

check();
