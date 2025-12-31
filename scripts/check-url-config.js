const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkURLConfiguration() {
  console.log('🔍 Checking Supabase URL Configuration');
  console.log('============================================================');
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🎯 Checking URL settings for password reset links');
  console.log('============================================================\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('   • NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.log('   • Site URL (should be): https://mornhub.lat');
  console.log('');

  // Test password reset to see what URL is generated
  console.log('🧪 Testing Password Reset URL Generation...');
  console.log('─'.repeat(50));

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail('test@example.com', {
      redirectTo: 'https://mornhub.lat/auth/update-password'
    });

    if (error) {
      console.log(`❌ Password reset test failed: ${error.message}`);
      
      if (error.message.includes('redirectTo')) {
        console.log('💡 This suggests a URL configuration issue');
        console.log('🔧 Fix: Update Site URL in Supabase Dashboard');
      }
    } else {
      console.log('✅ Password reset URL generation test successful');
      console.log('📧 Test email would be sent to: test@example.com');
    }

  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  console.log('');
  console.log('🔧 Manual Configuration Check Required:');
  console.log('──────────────────────────────────────────────────');
  console.log('1. Go to Supabase Dashboard → Authentication → URL Configuration');
  console.log('2. Check "Site URL" - should be: https://mornhub.lat');
  console.log('3. Check "Redirect URLs" - should include:');
  console.log('   • https://mornhub.lat/auth/update-password');
  console.log('   • https://mornhub.lat/auth/callback');
  console.log('   • https://mornhub.lat/dashboard');
  console.log('');
  console.log('📧 Email Template Check:');
  console.log('   • Go to Authentication → Emails → Templates');
  console.log('   • Select "Reset Password" template');
  console.log('   • The {{ .ConfirmationURL }} placeholder is correct');
  console.log('   • Supabase automatically replaces it with the actual reset link');
  console.log('');
  console.log('💡 If emails are not working:');
  console.log('   1. Check Site URL in URL Configuration');
  console.log('   2. Verify Redirect URLs include your domain');
  console.log('   3. Test SMTP settings in Authentication → Emails → SMTP Settings');
}

checkURLConfiguration().catch(console.error); 