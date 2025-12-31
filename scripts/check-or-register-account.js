const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOrRegisterAccount() {
  const email = 'zyx18870661556@163.com';
  const password = '11111111';
  const fullName = 'ZYX User';
  
  console.log('🔍 Checking account status for:', email);
  console.log('─'.repeat(60));
  
  try {
    // First, try to sign in to see if account exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInData?.user) {
      console.log('✅ Account exists and login successful!');
      console.log(`   User ID: ${signInData.user.id}`);
      console.log(`   Email confirmed: ${signInData.user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${signInData.user.created_at}`);
      
      // Sign out
      await supabase.auth.signOut();
      return;
    }

    if (signInError && signInError.message === 'Invalid login credentials') {
      console.log('❌ Account exists but password is incorrect');
      console.log('   Please check the password or reset it');
      return;
    }

    // If we get here, account might not exist, try to register
    console.log('📝 Account not found, attempting to register...');
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (signUpError) {
      console.log('❌ Registration failed:');
      console.log(`   Error: ${signUpError.message}`);
      return;
    }

    if (signUpData.user) {
      console.log('✅ Account registered successfully!');
      console.log(`   User ID: ${signUpData.user.id}`);
      console.log(`   Email confirmation required: ${!signUpData.session ? 'Yes' : 'No'}`);
      
      if (!signUpData.session) {
        console.log('📧 Please check your email and click the confirmation link');
        console.log('   After confirming, you can log in with:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
      } else {
        console.log('✅ Email confirmed automatically, you can now log in!');
      }
    }

  } catch (error) {
    console.log('💥 Unexpected error:');
    console.log(`   Error: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Account Check/Registration Tool');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log('');

  await checkOrRegisterAccount();
  
  console.log('\n📊 Summary');
  console.log('='.repeat(60));
  console.log('Check the output above for account status and next steps.');
}

main().catch(console.error); 