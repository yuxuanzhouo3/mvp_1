const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bamratexknmqvdbalzen.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TEST_EMAIL = 'jimzh580@gmail.com';
const TEST_PASSWORD = 'test123456';
const TEST_NAME = 'Jim Test User';

async function testEmailRegistration() {
  console.log('🧪 Testing Email Registration...');
  console.log('─'.repeat(60));
  console.log(`📧 Test Email: ${TEST_EMAIL}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log('─'.repeat(60));

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Please check your .env.local file');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Step 1: Check if user already exists
    console.log('🔍 Step 1: Checking if user exists...');
    const { data: existingUser, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (existingUser?.user) {
      console.log('✅ User already exists and can sign in!');
      console.log(`   User ID: ${existingUser.user.id}`);
      console.log(`   Email confirmed: ${existingUser.user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${existingUser.user.created_at}`);
      
      // Sign out
      await supabase.auth.signOut();
      return;
    }

    if (signInError && signInError.message === 'Invalid login credentials') {
      console.log('⚠️ User exists but password is incorrect');
      console.log('   Trying to register with new password...');
    }

    // Step 2: Try to register
    console.log('📝 Step 2: Attempting registration...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: {
        data: {
          full_name: TEST_NAME,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mornhub.lat'}/auth/callback`,
      },
    });

    if (signUpError) {
      console.log('❌ Registration failed:');
      console.log(`   Error: ${signUpError.message}`);
      
      if (signUpError.message.includes('rate limit')) {
        console.log('🚨 RATE LIMIT HIT! You need to:');
        console.log('   1. Go to Supabase Dashboard');
        console.log('   2. Authentication → Settings');
        console.log('   3. Increase email rate limits');
        console.log('   4. Or wait for the rate limit to reset');
      }
      return;
    }

    if (signUpData?.user) {
      console.log('✅ Registration successful!');
      console.log(`   User ID: ${signUpData.user.id}`);
      console.log(`   Email: ${signUpData.user.email}`);
      console.log(`   Created: ${signUpData.user.created_at}`);
      
      if (!signUpData.session) {
        console.log('📧 Email confirmation required!');
        console.log('   Please check your email inbox and spam folder');
        console.log(`   Email: ${TEST_EMAIL}`);
      } else {
        console.log('🎉 User created and automatically signed in!');
      }
    }

    // Step 3: Check current rate limits
    console.log('📊 Step 3: Checking rate limit status...');
    console.log('   Go to: https://supabase.com/dashboard/project/bamratexknmqvdbalzen');
    console.log('   Navigate to: Authentication → Rate Limits');
    console.log('   Look for "Email sending" usage');

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

// Run the test
testEmailRegistration().then(() => {
  console.log('\n🎯 Next Steps:');
  console.log('1. Check your email: ' + TEST_EMAIL);
  console.log('2. Look in spam folder if not in inbox');
  console.log('3. Click the confirmation link');
  console.log('4. Try logging in at: https://mornhub.lat/auth/login');
  console.log('\n📋 If no email received:');
  console.log('   - Update Supabase production settings');
  console.log('   - Check rate limits in Supabase Dashboard');
  console.log('   - Consider setting up custom SMTP');
}); 