const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLocalPasswordReset() {
  console.log('🧪 Testing Local Password Reset');
  console.log('============================================================');
  console.log('🔗 Local URL: http://localhost:3000');
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🎯 Testing password reset flow locally');
  console.log('============================================================\n');

  // Test with the account that already has password reset
  const testEmail = 'mornscience@163.com';
  
  console.log(`📧 Testing password reset for: ${testEmail}`);
  console.log('─'.repeat(50));

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: 'http://localhost:3000/auth/update-password'
    });

    if (error) {
      console.log(`❌ Password reset failed: ${error.message}`);
    } else {
      console.log('✅ Password reset email sent successfully!');
      console.log('📧 Check your email for the reset link');
      console.log('🔗 Reset link will redirect to: http://localhost:3000/auth/update-password');
      console.log('');
      console.log('💡 Testing Instructions:');
      console.log('1. Check your email inbox for the reset link');
      console.log('2. Click the reset link (it should open localhost:3000)');
      console.log('3. The page should handle the hash parameters correctly');
      console.log('4. You should see the password update form');
      console.log('5. Set a new password and test the flow');
    }

  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  console.log('');
  console.log('🌐 Local Testing URLs:');
  console.log('──────────────────────────────────────────────────');
  console.log('• Forgot Password: http://localhost:3000/auth/forgot-password');
  console.log('• Update Password: http://localhost:3000/auth/update-password');
  console.log('• Login: http://localhost:3000/auth/login');
  console.log('• Dashboard: http://localhost:3000/dashboard');
  console.log('');
  console.log('📋 Test Flow:');
  console.log('1. Go to: http://localhost:3000/auth/forgot-password');
  console.log('2. Enter email and click "Send reset email"');
  console.log('3. Check email and click reset link');
  console.log('4. Verify the update password page loads correctly');
  console.log('5. Set new password and test login');
}

testLocalPasswordReset().catch(console.error); 