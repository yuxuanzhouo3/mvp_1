const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

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

async function triggerPasswordResetViaAPI(account) {
  console.log(`\n🔐 Triggering password reset for: ${account.name}`);
  console.log(`📧 Email: ${account.email}`);
  console.log('─'.repeat(50));

  try {
    // Try the forgot password API endpoint
    const response = await fetch('https://mornhub.lat/api/auth/reset-password', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify({ email: account.email })
    });

    const result = await response.text();
    console.log(`📡 API Response Status: ${response.status}`);
    console.log(`📄 Response: ${result}`);

    if (response.ok) {
      console.log(`✅ Password reset request sent successfully to ${account.email}`);
      return true;
    } else {
      console.log(`❌ Password reset failed with status ${response.status}`);
      return false;
    }

  } catch (error) {
    console.log(`❌ Error triggering password reset: ${error.message}`);
    return false;
  }
}

async function triggerPasswordResetDirect(account) {
  console.log(`\n🔐 Trying direct Supabase password reset for: ${account.name}`);
  console.log(`📧 Email: ${account.email}`);
  console.log('─'.repeat(50));

  try {
    // Try direct Supabase call
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.auth.resetPasswordForEmail(account.email, {
      redirectTo: 'https://mornhub.lat/auth/update-password'
    });

    if (error) {
      console.log(`❌ Direct reset failed: ${error.message}`);
      return false;
    } else {
      console.log(`✅ Direct password reset email sent to ${account.email}`);
      return true;
    }

  } catch (error) {
    console.log(`❌ Error with direct reset: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Triggering Password Reset Emails (Multiple Methods)');
  console.log('='.repeat(60));
  console.log(`🎯 Target: Reset all passwords to 22222222`);
  console.log('='.repeat(60));

  let successCount = 0;
  for (const account of accounts) {
    console.log(`\n🔄 Processing: ${account.name}`);
    
    // Try API method first
    let success = await triggerPasswordResetViaAPI(account);
    
    // If API fails, try direct method
    if (!success) {
      console.log(`\n🔄 Trying alternative method...`);
      success = await triggerPasswordResetDirect(account);
    }
    
    if (success) successCount++;
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n📊 Password Reset Summary');
  console.log('─'.repeat(50));
  console.log(`✅ Successful: ${successCount}/${accounts.length}`);
  console.log(`❌ Failed: ${accounts.length - successCount}/${accounts.length}`);

  if (successCount === accounts.length) {
    console.log('\n🎉 All password reset emails sent successfully!');
  } else if (successCount > 0) {
    console.log('\n⚠️  Some password resets succeeded, some failed');
  } else {
    console.log('\n❌ All password resets failed');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check Supabase email settings');
    console.log('2. Verify email templates are configured');
    console.log('3. Check rate limits');
    console.log('4. Ensure SMTP settings are correct');
  }

  console.log('\n📧 Email Addresses to check:');
  accounts.forEach(account => {
    console.log(`   • ${account.email} (${account.name})`);
  });

  console.log('\n📋 If emails are received:');
  console.log('1. Click on each reset link');
  console.log('2. Set new password to: 22222222');
  console.log('3. Test login with new passwords');
}

main().catch(console.error); 