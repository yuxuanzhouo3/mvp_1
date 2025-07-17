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

const testAccounts = [
  {
    email: 'zyx18870661556@163.com',
    password: '88888888',
    name: 'Account 1'
  },
  {
    email: 'yzcmf94@gmail.com',
    password: '11111111',
    name: 'Account 2'
  },
  {
    email: 'chengyou_science@163.com',
    password: '11111111',
    name: 'Account 3'
  }
];

async function testLogin(email, password, accountName) {
  console.log(`\n🔐 Testing login for ${accountName}: ${email}`);
  console.log('─'.repeat(60));
  
  try {
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log(`❌ Login failed for ${accountName}:`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.status || 'N/A'}`);
      return false;
    }

    if (data.user) {
      console.log(`✅ Login successful for ${accountName}!`);
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
    console.log(`💥 Unexpected error for ${accountName}:`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Multiple Account Logins');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');

  let successCount = 0;
  let totalCount = testAccounts.length;

  for (const account of testAccounts) {
    const success = await testLogin(account.email, account.password, account.name);
    if (success) successCount++;
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total accounts tested: ${totalCount}`);
  console.log(`Successful logins: ${successCount}`);
  console.log(`Failed logins: ${totalCount - successCount}`);
  console.log(`Success rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);

  if (successCount === totalCount) {
    console.log('\n🎉 All accounts can log in successfully!');
  } else if (successCount > 0) {
    console.log('\n⚠️ Some accounts have login issues. Check the details above.');
  } else {
    console.log('\n❌ No accounts can log in. Please check your credentials and Supabase setup.');
  }
}

main().catch(console.error); 