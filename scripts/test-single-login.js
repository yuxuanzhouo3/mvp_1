const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please check your .env file for:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  const email = 'zyx18870661556@163.com';
  const password = 'Zyx!213416';
  
  console.log('🔐 Testing login for zyx18870661556@163.com');
  console.log('─'.repeat(60));
  
  try {
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log('❌ Login failed:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.status || 'N/A'}`);
      return false;
    }

    if (data.user) {
      console.log('✅ Login successful!');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${data.user.created_at}`);
      console.log(`   Last sign in: ${data.user.last_sign_in_at}`);
      
      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.log(`   Profile: Not found (${profileError.message})`);
      } else {
        console.log(`   Profile: Found`);
        console.log(`   Full name: ${profile.full_name || 'Not set'}`);
        console.log(`   Avatar: ${profile.avatar_url || 'Not set'}`);
      }

      // Sign out after testing
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.log(`   ⚠️ Sign out error: ${signOutError.message}`);
      } else {
        console.log(`   ✅ Signed out successfully`);
      }
      
      return true;
    }

  } catch (error) {
    console.log('💥 Unexpected error:');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Single Account Login');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');

  const success = await testLogin();
  
  console.log('\n📊 Test Result');
  console.log('='.repeat(60));
  if (success) {
    console.log('🎉 Login successful! The account is working properly.');
  } else {
    console.log('❌ Login failed. Please check the credentials or account status.');
  }
}

main().catch(console.error); 