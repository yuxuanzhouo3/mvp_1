const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const accounts = [
  {
    email: 'yzcmf94@gmail.com',
    password: '11111111',
    name: 'Jack Chou (Google OAuth)'
  },
  {
    email: 'chengyou_science@163.com',
    password: '11111111',
    name: 'Chengyou Science'
  },
  {
    email: 'hu0112174@student.humphreys.edu',
    password: '11111111',
    name: 'Student Account'
  }
];

async function testAccount(account) {
  console.log(`\n🔍 Testing Account: ${account.name}`);
  console.log(`📧 Email: ${account.email}`);
  console.log('─'.repeat(50));

  try {
    // 1. Test sign in first to check if user exists and is confirmed
    console.log('1️⃣ Testing sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password
    });

    if (signInError) {
      console.log(`❌ Sign in failed: ${signInError.message}`);
      
      // Check if user exists but email not confirmed
      if (signInError.message.includes('Email not confirmed')) {
        console.log('✅ User exists but email not confirmed');
        
        // Test password reset for unconfirmed email
        console.log('\n2️⃣ Testing password reset (email not confirmed)...');
        const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(account.email, {
          redirectTo: 'http://localhost:3000/auth/update-password'
        });

        if (resetError) {
          console.log(`❌ Password reset failed: ${resetError.message}`);
        } else {
          console.log(`✅ Password reset email sent to ${account.email}`);
        }
      } else if (signInError.message.includes('Invalid login credentials')) {
        console.log('❌ Invalid credentials - user may not exist or wrong password');
      } else {
        console.log(`❌ Other sign in error: ${signInError.message}`);
      }
      
      return false;
    }

    const user = signInData.user;
    console.log(`✅ Sign in successful: ${user.email}`);
    console.log(`📅 Created: ${user.created_at}`);
    console.log(`🔐 Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`🔑 Last sign in: ${user.last_sign_in_at || 'Never'}`);

    // 2. Check profile
    console.log('\n2️⃣ Checking user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log(`❌ Profile not found: ${profileError.message}`);
    } else {
      console.log(`✅ Profile found: ${profile.full_name || 'No name set'}`);
      console.log(`💰 Credits: ${profile.credits}`);
      console.log(`📊 Membership: ${profile.membership_level}`);
    }

    // 3. Test password reset for confirmed user
    console.log('\n3️⃣ Testing password reset (user confirmed)...');
    const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(account.email, {
      redirectTo: 'http://localhost:3000/auth/update-password'
    });

    if (resetError) {
      console.log(`❌ Password reset failed: ${resetError.message}`);
    } else {
      console.log(`✅ Password reset email sent to ${account.email}`);
    }

    // 4. Test forgot password form submission
    console.log('\n4️⃣ Testing forgot password form...');
    try {
      const response = await fetch('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email })
      });
      
      const result = await response.json();
      if (response.ok) {
        console.log('✅ Forgot password form submission successful');
      } else {
        console.log(`❌ Forgot password form error: ${result.error || response.status}`);
      }
    } catch (error) {
      console.log(`❌ Forgot password form error: ${error.message}`);
    }

    // Sign out
    await supabase.auth.signOut();
    return true;

  } catch (error) {
    console.log(`❌ Error testing account: ${error.message}`);
    return false;
  }
}

async function testPasswordResetFlow() {
  console.log('\n🔧 Testing Password Reset Flow');
  console.log('─'.repeat(50));

  // Test forgot password page
  try {
    const response = await fetch('http://localhost:3000/auth/forgot-password');
    if (response.ok) {
      console.log('✅ Forgot password page accessible');
    } else {
      console.log(`❌ Forgot password page error: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Forgot password page error: ${error.message}`);
  }

  // Test update password page
  try {
    const response = await fetch('http://localhost:3000/auth/update-password');
    if (response.ok) {
      console.log('✅ Update password page accessible');
    } else {
      console.log(`❌ Update password page error: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Update password page error: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Starting Account Verification Test');
  console.log('='.repeat(60));
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Service Key: ${supabaseServiceKey ? '✅ Present' : '❌ Missing'}`);
  console.log('='.repeat(60));

  // Test all accounts
  let successCount = 0;
  for (const account of accounts) {
    const success = await testAccount(account);
    if (success) successCount++;
  }

  // Test password reset flow
  await testPasswordResetFlow();

  console.log('\n📊 Test Summary');
  console.log('─'.repeat(50));
  console.log(`✅ Successful tests: ${successCount}/${accounts.length}`);
  console.log(`❌ Failed tests: ${accounts.length - successCount}/${accounts.length}`);

  if (successCount === accounts.length) {
    console.log('\n🎉 All accounts verified successfully!');
  } else {
    console.log('\n⚠️  Some accounts need attention');
  }
}

main().catch(console.error); 