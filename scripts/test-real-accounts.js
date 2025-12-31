const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testAccounts = [
  {
    name: 'Jack Chou (Google OAuth)',
    email: 'yzcmf94@gmail.com',
    password: '11111111'
  },
  {
    name: 'Chengyou Science',
    email: 'chengyou_science@163.com',
    password: '11111111'
  },
  {
    name: 'Student Account',
    email: 'hu0112174@student.humphreys.edu',
    password: '11111111'
  }
];

async function testAccount(account) {
  console.log(`\n🧪 Testing ${account.name}...`);
  console.log(`📧 Email: ${account.email}`);
  
  try {
    // Test sign in
    console.log('🔐 Attempting sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password
    });

    if (signInError) {
      console.log(`❌ Sign in failed: ${signInError.message}`);
      
      // Check if it's a captcha issue
      if (signInError.message.includes('captcha')) {
        console.log('⚠️  Captcha verification required - this is normal for automated tests');
        console.log('💡 Try logging in manually in the browser');
      }
      
      // Try to check if user exists by attempting to reset password
      console.log('🔍 Checking if user exists...');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(account.email, {
        redirectTo: 'http://localhost:3002/auth/update-password'
      });
      
      if (resetError) {
        console.log(`❌ User not found: ${resetError.message}`);
      } else {
        console.log(`✅ User exists (password reset email would be sent)`);
      }
      
      return false;
    }

    console.log(`✅ Sign in successful!`);
    console.log(`   User ID: ${signInData.user.id}`);
    console.log(`   Email: ${signInData.user.email}`);
    console.log(`   Email confirmed: ${signInData.user.email_confirmed_at ? 'Yes' : 'No'}`);

    // Test profile loading
    console.log('👤 Loading profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', signInData.user.id)
      .single();

    if (profileError) {
      console.log(`❌ Profile loading failed: ${profileError.message}`);
    } else {
      console.log(`✅ Profile loaded successfully!`);
      console.log(`   Name: ${profile.full_name}`);
      console.log(`   Credits: ${profile.credits}`);
      console.log(`   Membership: ${profile.membership_level}`);
    }

    // Sign out
    await supabase.auth.signOut();
    console.log('🚪 Signed out');

    return true;
  } catch (error) {
    console.log(`💥 Error testing account: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 Real Account Authentication Test');
  console.log('====================================');
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Using: ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'} environment`);

  let successCount = 0;
  let totalCount = testAccounts.length;

  for (const account of testAccounts) {
    const success = await testAccount(account);
    if (success) successCount++;
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log(`✅ Successful: ${successCount}/${totalCount}`);
  console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);

  if (successCount === totalCount) {
    console.log('\n🎉 All accounts working perfectly!');
  } else if (successCount > 0) {
    console.log('\n⚠️  Some accounts have issues, but others work');
  } else {
    console.log('\n💥 All accounts have authentication issues');
    console.log('\n💡 Manual Testing Instructions:');
    console.log('1. Open http://localhost:3002/auth/login');
    console.log('2. Try logging in with each account manually');
    console.log('3. Check if captcha appears and complete it');
    console.log('4. Verify dashboard access after login');
  }
}

main().catch(console.error); 