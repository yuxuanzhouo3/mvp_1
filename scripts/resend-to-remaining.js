const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Only the 2 accounts that haven't reset their passwords yet
const remainingAccounts = [
  {
    email: 'yzcmf94@gmail.com',
    name: 'Jack Chou (Google OAuth)',
    reason: 'Old password still works - reset not completed'
  },
  {
    email: 'hu0112174@student.humphreys.edu',
    name: 'Student Account',
    reason: 'Old password still works - reset not completed'
  }
];

async function resendToRemaining() {
  console.log('🔄 Resending Password Reset Emails');
  console.log('============================================================');
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🎯 Target: Reset remaining passwords to 22222222');
  console.log('📧 Sending to 2 accounts that haven\'t completed reset');
  console.log('============================================================\n');

  let successCount = 0;
  let failCount = 0;

  for (const account of remainingAccounts) {
    console.log(`🔐 Resending password reset for: ${account.name}`);
    console.log(`📧 Email: ${account.email}`);
    console.log(`💡 Reason: ${account.reason}`);
    console.log('─'.repeat(50));

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(account.email, {
        redirectTo: 'https://mornhub.lat/auth/update-password'
      });

      if (error) {
        console.log(`❌ Password reset failed: ${error.message}`);
        failCount++;
      } else {
        console.log(`✅ Password reset email sent successfully to ${account.email}`);
        console.log(`📧 Check your email for the reset link`);
        console.log(`🔗 Reset link will redirect to: https://mornhub.lat/auth/update-password`);
        successCount++;
      }

    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      failCount++;
    }

    console.log('');
  }

  console.log('📊 Resend Summary');
  console.log('──────────────────────────────────────────────────');
  console.log(`✅ Successful: ${successCount}/${remainingAccounts.length}`);
  console.log(`❌ Failed: ${failCount}/${remainingAccounts.length}`);

  if (successCount > 0) {
    console.log('\n🎉 Password reset emails sent to remaining accounts!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check email inboxes for reset links');
    console.log('2. Click on each reset link IMMEDIATELY (they expire)');
    console.log('3. Set new password to: 22222222');
    console.log('4. Complete the reset process');
  } else {
    console.log('\n⚠️  All resends failed - check SMTP configuration');
  }

  console.log('\n📧 Email Addresses to check:');
  remainingAccounts.forEach(account => {
    console.log(`   • ${account.email} (${account.name})`);
  });

  console.log('\n💡 Important Reminders:');
  console.log('• Reset links expire quickly - click them immediately');
  console.log('• Check spam/junk folders if emails not received');
  console.log('• Set password to exactly: 22222222');
  console.log('• Complete the entire reset process');
}

resendToRemaining().catch(console.error); 