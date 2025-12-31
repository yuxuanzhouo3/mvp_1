const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSMTPConnection() {
  console.log('🧪 Testing SMTP Connection');
  console.log('============================================================');
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🎯 Testing Gmail SMTP configuration');
  console.log('============================================================\n');

  // Test with a simple email that should work
  const testEmail = 'mornscience@gmail.com';
  
  console.log(`📧 Testing password reset to: ${testEmail}`);
  console.log('─'.repeat(50));

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: 'https://mornhub.lat/auth/update-password'
    });

    if (error) {
      console.log(`❌ Password reset failed: ${error.message}`);
      
      // Provide specific troubleshooting based on error
      if (error.message.includes('Error sending recovery email')) {
        console.log('\n🔧 Troubleshooting Gmail SMTP:');
        console.log('1. Verify 2-Factor Authentication is enabled on mornscience@gmail.com');
        console.log('2. Generate Gmail App Password (not regular password)');
        console.log('3. Check Gmail SMTP settings in Supabase');
        console.log('4. Ensure username and sender email match: mornscience@gmail.com');
      }
    } else {
      console.log('✅ Password reset email sent successfully!');
      console.log('📧 Check your Gmail inbox (and spam folder)');
      console.log('🔗 Reset link will redirect to: https://mornhub.lat/auth/update-password');
    }

  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  console.log('\n📋 Gmail SMTP Configuration Checklist:');
  console.log('──────────────────────────────────────────────────');
  console.log('✅ Host: smtp.gmail.com');
  console.log('✅ Port: 587');
  console.log('✅ Username: mornscience@gmail.com');
  console.log('✅ Sender Email: mornscience@gmail.com');
  console.log('❓ Password: [Gmail App Password - 16 characters]');
  console.log('');
  console.log('🔧 Gmail Setup Steps:');
  console.log('1. Enable 2-Factor Authentication on mornscience@gmail.com');
  console.log('2. Go to Gmail Settings → Security → App passwords');
  console.log('3. Generate App Password for "Mail"');
  console.log('4. Use the 16-character App Password in Supabase');
}

testSMTPConnection().catch(console.error); 