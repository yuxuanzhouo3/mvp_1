const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bamratexknmqvdbalzen.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const EMAIL = 'chengyou_science@163.com';
const PASSWORD = '11111111';
const FULL_NAME = 'Chengyou Science';

async function register() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data, error } = await supabase.auth.signUp({
    email: EMAIL,
    password: PASSWORD,
    options: {
      data: { full_name: FULL_NAME },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mornhub.lat'}/auth/callback`,
    },
  });

  if (error) {
    console.error('❌ Registration failed:', error.message);
  } else {
    console.log('✅ Registration successful!');
    console.log('User:', data.user);
    if (!data.session) {
      console.log('⚠️ Email confirmation required. Please check your inbox.');
    }
  }
}

register(); 