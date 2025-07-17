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

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function triggerPasswordResetsWith30sDelay() {
  console.log('🚀 Triggering Password Reset Emails (with 30s delay)');
  console.log('============================================================');
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🎯 Target: Reset all passwords to 22222222');
  console.log('⏱️  Delay: 30 seconds between each request');
  console.log('============================================================\n');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    
    console.log(`🔐 Triggering password reset for: ${account.name}`);
    console.log(`📧 Email: ${account.email}`);
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

    // Add 30-second delay between requests (except for the last one)
    if (i < accounts.length - 1) {
      console.log(`⏱️  Waiting 30 seconds before next request...`);
      console.log(`⏰ Next request in: 30 seconds`);
      
      // Show countdown
      for (let j = 30; j > 0; j--) {
        process.stdout.write(`\r⏰ Next request in: ${j} seconds`);
        await sleep(1000);
      }
      console.log('\n');
    }

    console.log('');
  }

  console.log('📊 Password Reset Summary');
  console.log('──────────────────────────────────────────────────');
  console.log(`✅ Successful: ${successCount}/${accounts.length}`);
  console.log(`❌ Failed: ${failCount}/${accounts.length}`);

  if (successCount > 0) {
    console.log('\n🎉 Some password reset emails sent successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check your email inbox for reset links');
    console.log('2. Click on each reset link');
    console.log('3. Set new password to: 22222222');
    console.log('4. Test login with new passwords');
  } else {
    console.log('\n⚠️  All password resets failed - check SMTP configuration');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check Supabase SMTP settings');
    console.log('2. Verify 163.com authorization password');
    console.log('3. Try Gmail SMTP instead');
    console.log('4. Check email rate limits');
  }

  console.log('\n📧 Email Addresses to check:');
  accounts.forEach(account => {
    console.log(`   • ${account.email} (${account.name})`);
  });
}

triggerPasswordResetsWith30sDelay().catch(console.error); 
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

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function triggerPasswordResetsWith30sDelay() {
  console.log('🚀 Triggering Password Reset Emails (with 30s delay)');
  console.log('============================================================');
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🎯 Target: Reset all passwords to 22222222');
  console.log('⏱️  Delay: 30 seconds between each request');
  console.log('============================================================\n');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    
    console.log(`🔐 Triggering password reset for: ${account.name}`);
    console.log(`📧 Email: ${account.email}`);
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

    // Add 30-second delay between requests (except for the last one)
    if (i < accounts.length - 1) {
      console.log(`⏱️  Waiting 30 seconds before next request...`);
      console.log(`⏰ Next request in: 30 seconds`);
      
      // Show countdown
      for (let j = 30; j > 0; j--) {
        process.stdout.write(`\r⏰ Next request in: ${j} seconds`);
        await sleep(1000);
      }
      console.log('\n');
    }

    console.log('');
  }

  console.log('📊 Password Reset Summary');
  console.log('──────────────────────────────────────────────────');
  console.log(`✅ Successful: ${successCount}/${accounts.length}`);
  console.log(`❌ Failed: ${failCount}/${accounts.length}`);

  if (successCount > 0) {
    console.log('\n🎉 Some password reset emails sent successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check your email inbox for reset links');
    console.log('2. Click on each reset link');
    console.log('3. Set new password to: 22222222');
    console.log('4. Test login with new passwords');
  } else {
    console.log('\n⚠️  All password resets failed - check SMTP configuration');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check Supabase SMTP settings');
    console.log('2. Verify 163.com authorization password');
    console.log('3. Try Gmail SMTP instead');
    console.log('4. Check email rate limits');
  }

  console.log('\n📧 Email Addresses to check:');
  accounts.forEach(account => {
    console.log(`   • ${account.email} (${account.name})`);
  });
}

triggerPasswordResetsWith30sDelay().catch(console.error); 