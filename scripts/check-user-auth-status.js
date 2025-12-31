const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bamratexknmqvdbalzen.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TEST_EMAIL = 'jimzh580@gmail.com';

async function checkUserAuthStatus() {
  console.log('🔍 Checking User Authentication Status...');
  console.log('─'.repeat(60));
  console.log(`📧 Email: ${TEST_EMAIL}`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log('─'.repeat(60));

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Try to get user by email using admin functions
    console.log('🔍 Step 1: Checking if user exists in database...');
    
    // First, try to sign in with Google to see if it's a Google account
    console.log('🔍 Step 2: Attempting Google OAuth sign-in...');
    
    const { data: googleSignIn, error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mornhub.lat'}/auth/callback`,
      },
    });

    if (googleSignIn) {
      console.log('✅ Google OAuth initiated successfully');
      console.log('   This means the user can sign in with Google');
    }

    // Try to sign in with password to see if it's also a password account
    console.log('🔍 Step 3: Checking if user has password authentication...');
    
    const { data: passwordSignIn, error: passwordError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: 'test123456' // This will fail, but we can see the error
    });

    if (passwordError) {
      if (passwordError.message.includes('Invalid login credentials')) {
        console.log('⚠️ User exists but password is incorrect');
        console.log('   This suggests the user was created with Google OAuth');
      } else if (passwordError.message.includes('Email not confirmed')) {
        console.log('📧 User exists but email is not confirmed');
        console.log('   This suggests the user was created with email/password but needs confirmation');
      } else {
        console.log('❌ Password sign-in error:', passwordError.message);
      }
    }

    // Try to sign up to see what happens
    console.log('🔍 Step 4: Attempting new registration...');
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: 'newpassword123',
      options: {
        data: {
          full_name: 'Jim Test User',
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mornhub.lat'}/auth/callback`,
      },
    });

    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        console.log('✅ User already exists in the system');
        console.log('   This confirms the email is already registered');
      } else {
        console.log('❌ Registration error:', signUpError.message);
      }
    } else if (signUpData?.user) {
      console.log('✅ New user created successfully');
      console.log(`   User ID: ${signUpData.user.id}`);
      console.log(`   Email confirmed: ${signUpData.user.email_confirmed_at ? 'Yes' : 'No'}`);
    }

    // Check if we can get user info from the session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log('👤 Current user session:');
      console.log(`   User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Last sign in: ${user.last_sign_in_at}`);
      console.log(`   App metadata:`, user.app_metadata);
      console.log(`   User metadata:`, user.user_metadata);
      
      // Check if it's a Google user
      if (user.app_metadata?.provider === 'google') {
        console.log('🔗 This is a Google OAuth user');
      } else if (user.app_metadata?.provider === 'email') {
        console.log('📧 This is an email/password user');
      }
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

// Run the check
checkUserAuthStatus().then(() => {
  console.log('\n🎯 Summary:');
  console.log('If the user exists with Google OAuth:');
  console.log('   - No email confirmation will be sent');
  console.log('   - User should sign in with Google instead');
  console.log('   - Go to: https://mornhub.lat/auth/login');
  console.log('   - Click "Continue with Google"');
  console.log('\nIf you want to use email/password instead:');
  console.log('   - You may need to delete the existing account first');
  console.log('   - Or use a different email address');
}); 