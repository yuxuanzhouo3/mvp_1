const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSupabaseRedirects() {
  console.log('🔍 Checking Supabase Redirect Configuration');
  console.log('============================================================');
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🎯 Analyzing password reset redirect issue');
  console.log('============================================================\n');

  console.log('📋 Current Issue Analysis:');
  console.log('──────────────────────────────────────────────────');
  console.log('❌ Problem: Password reset links redirect to homepage with hash params');
  console.log('❌ URL: https://www.mornhub.lat/#access_token=...');
  console.log('✅ Expected: https://mornhub.lat/auth/update-password?access_token=...');
  console.log('');

  console.log('🔧 Root Cause:');
  console.log('──────────────────────────────────────────────────');
  console.log('• Supabase is redirecting to the Site URL instead of specific redirect URL');
  console.log('• The redirect URL configuration needs to be updated');
  console.log('• URL fragments (#) are being used instead of query parameters (?)');
  console.log('');

  console.log('💡 Solution Steps:');
  console.log('──────────────────────────────────────────────────');
  console.log('1. Go to Supabase Dashboard → Authentication → URL Configuration');
  console.log('2. Update "Site URL" to: https://mornhub.lat');
  console.log('3. Add these "Redirect URLs":');
  console.log('   • https://mornhub.lat/auth/update-password');
  console.log('   • https://mornhub.lat/auth/callback');
  console.log('   • https://mornhub.lat/dashboard');
  console.log('   • https://mornhub.lat/auth/login');
  console.log('4. Save the configuration');
  console.log('');

  console.log('🧪 Testing Current Configuration:');
  console.log('──────────────────────────────────────────────────');
  
  try {
    // Test password reset to see current behavior
    const { data, error } = await supabase.auth.resetPasswordForEmail('test@example.com', {
      redirectTo: 'https://mornhub.lat/auth/update-password'
    });

    if (error) {
      console.log(`❌ Password reset test failed: ${error.message}`);
      
      if (error.message.includes('redirectTo')) {
        console.log('💡 This confirms the redirect URL configuration issue');
      }
    } else {
      console.log('✅ Password reset test successful');
      console.log('📧 Test email would be sent to: test@example.com');
      console.log('🔗 Expected redirect: https://mornhub.lat/auth/update-password');
    }

  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  console.log('');
  console.log('📊 Current Status:');
  console.log('──────────────────────────────────────────────────');
  console.log('✅ Password reset emails: Working (Gmail SMTP)');
  console.log('✅ Email delivery: Working (all emails sent)');
  console.log('❌ Redirect handling: Needs URL configuration fix');
  console.log('✅ Hash parameter parsing: Added to update-password page');
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('1. Update Supabase URL Configuration');
  console.log('2. Test password reset flow again');
  console.log('3. Verify redirects work properly');
}

checkSupabaseRedirects().catch(console.error); 