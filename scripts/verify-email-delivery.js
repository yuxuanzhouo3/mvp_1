const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const accounts = [
  {
    email: 'yzcmf94@gmail.com',
    password: '11111111',
    name: 'Jack Chou (Google OAuth)'
  },
  {
    email: 'chengyou_science@163.com',
    password: '11111111',
    name: 'Chengyou Science'
  },
  {
    email: 'hu0112174@student.humphreys.edu',
    password: '11111111',
    name: 'Student Account'
  }
];

async function verifyEmailDelivery() {
  console.log('🔍 Verifying Email Delivery Status');
  console.log('============================================================');
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🎯 Checking if password reset emails were delivered');
  console.log('============================================================\n');

  for (const account of accounts) {
    console.log(`🔄 Testing: ${account.name}`);
    console.log(`📧 Email: ${account.email}`);
    console.log('─'.repeat(50));

    try {
      // Try to sign in with current password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password
      });

      if (error) {
        console.log(`❌ Login failed: ${error.message}`);
        
        // Check if it's a password error (might mean password was changed)
        if (error.message.includes('Invalid login credentials')) {
          console.log('💡 This might indicate the password was reset successfully!');
          console.log('📧 Check your email for the reset link');
        }
      } else {
        console.log(`✅ Login successful with current password`);
        console.log(`👤 User: ${data.user.email}`);
        console.log(`🆔 User ID: ${data.user.id}`);
        
        // Sign out
        await supabase.auth.signOut();
      }

    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }

    console.log('');
  }

  console.log('📋 Email Delivery Check Summary');
  console.log('──────────────────────────────────────────────────');
  console.log('📧 Check these email inboxes for password reset links:');
  console.log('   • Gmail: yzcmf94@gmail.com');
  console.log('   • 163.com: chengyou_science@163.com');
  console.log('   • Student Email: hu0112174@student.humphreys.edu');
  console.log('');
  console.log('🔗 Reset links will redirect to: https://mornhub.lat/auth/update-password');
  console.log('🔑 Set new password to: 22222222');
  console.log('');
  console.log('💡 If emails are not received:');
  console.log('   1. Check spam/junk folders');
  console.log('   2. Verify 163.com SMTP settings in Supabase');
  console.log('   3. Check Supabase email logs');
}

verifyEmailDelivery().catch(console.error); 