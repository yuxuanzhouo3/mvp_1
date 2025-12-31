const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const accounts = [
  {
    email: 'yzcmf94@gmail.com',
    name: 'Jack Chou (Google OAuth)'
  },
  {
    email: 'chengyou_science@163.com',
    name: 'Chengyou Science'
  },
  {
    email: 'hu0112174@student.humphreys.edu',
    name: 'Student Account'
  }
];

async function triggerPasswordReset(account) {
  console.log(`\n🔐 Triggering password reset for: ${account.name}`);
  console.log(`📧 Email: ${account.email}`);
  console.log('─'.repeat(50));

  try {
    // Send password reset email
    const { data, error } = await supabase.auth.resetPasswordForEmail(account.email, {
      redirectTo: 'https://mornhub.lat/auth/update-password'
    });

    if (error) {
      console.log(`❌ Password reset failed: ${error.message}`);
      return false;
    } else {
      console.log(`✅ Password reset email sent successfully to ${account.email}`);
      console.log(`📧 Check your email for the reset link`);
      console.log(`🔗 Reset link will redirect to: https://mornhub.lat/auth/update-password`);
      return true;
    }

  } catch (error) {
    console.log(`❌ Error triggering password reset: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Triggering Password Reset Emails');
  console.log('='.repeat(60));
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  console.log(`🎯 Target: Reset all passwords to 22222222`);
  console.log('='.repeat(60));

  let successCount = 0;
  for (const account of accounts) {
    const success = await triggerPasswordReset(account);
    if (success) successCount++;
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 Password Reset Summary');
  console.log('─'.repeat(50));
  console.log(`✅ Successful: ${successCount}/${accounts.length}`);
  console.log(`❌ Failed: ${accounts.length - successCount}/${accounts.length}`);

  if (successCount === accounts.length) {
    console.log('\n🎉 All password reset emails sent successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check your email inbox for reset links');
    console.log('2. Click on each reset link');
    console.log('3. Set new password to: 22222222');
    console.log('4. Test login with new passwords');
  } else {
    console.log('\n⚠️  Some password resets failed - check the errors above');
  }

  console.log('\n📧 Email Addresses to check:');
  accounts.forEach(account => {
    console.log(`   • ${account.email} (${account.name})`);
  });
}

main().catch(console.error); 