const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSingleReset() {
  console.log('🧪 Testing Single Password Reset');
  console.log('============================================================');
  console.log('🎯 Testing email delivery to Gmail account');
  console.log('============================================================\n');

  const testEmail = 'yzcmf94@gmail.com';
  
  console.log(`📧 Sending password reset to: ${testEmail}`);
  console.log('─'.repeat(50));

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: 'https://mornhub.lat/auth/update-password'
    });

    if (error) {
      console.log(`❌ Password reset failed: ${error.message}`);
    } else {
      console.log('✅ Password reset email sent successfully!');
      console.log('📧 Check your Gmail inbox (and spam folder)');
      console.log('🔗 Reset link will redirect to: https://mornhub.lat/auth/update-password');
      console.log('');
      console.log('💡 If you receive the email:');
      console.log('   1. Click the reset link');
      console.log('   2. Set new password to: 22222222');
      console.log('   3. Test login with new password');
    }

  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  console.log('');
  console.log('📋 Troubleshooting if no email received:');
  console.log('   1. Check Gmail spam/junk folder');
  console.log('   2. Check Supabase email logs');
  console.log('   3. Verify 163.com SMTP settings');
  console.log('   4. Check rate limits (200 emails/hour)');
}

testSingleReset().catch(console.error); 