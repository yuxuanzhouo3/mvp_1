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
    oldPassword: '11111111',
    newPassword: '22222222',
    name: 'Jack Chou (Google OAuth)'
  },
  {
    email: 'chengyou_science@163.com',
    oldPassword: '11111111',
    newPassword: '22222222',
    name: 'Chengyou Science'
  },
  {
    email: 'hu0112174@student.humphreys.edu',
    oldPassword: '11111111',
    newPassword: '22222222',
    name: 'Student Account'
  }
];

async function verifyPasswordReset() {
  console.log('🔍 Verifying Password Reset Status');
  console.log('============================================================');
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🎯 Checking if passwords were reset to 22222222');
  console.log('============================================================\n');

  for (const account of accounts) {
    console.log(`🔄 Testing: ${account.name}`);
    console.log(`📧 Email: ${account.email}`);
    console.log('─'.repeat(50));

    // Test with old password first
    console.log(`🔑 Testing with OLD password: ${account.oldPassword}`);
    try {
      const { data: oldData, error: oldError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.oldPassword
      });

      if (oldError) {
        console.log(`❌ Old password failed: ${oldError.message}`);
        
        // If old password fails, test with new password
        console.log(`🔑 Testing with NEW password: ${account.newPassword}`);
        const { data: newData, error: newError } = await supabase.auth.signInWithPassword({
          email: account.email,
          password: account.newPassword
        });

        if (newError) {
          console.log(`❌ New password also failed: ${newError.message}`);
          console.log('💡 Password reset may not have been completed');
        } else {
          console.log(`✅ NEW password works! Login successful`);
          console.log(`👤 User: ${newData.user.email}`);
          console.log(`🆔 User ID: ${newData.user.id}`);
          
          // Sign out
          await supabase.auth.signOut();
        }
      } else {
        console.log(`✅ OLD password still works - password not reset`);
        console.log(`👤 User: ${oldData.user.email}`);
        console.log(`🆔 User ID: ${oldData.user.id}`);
        
        // Sign out
        await supabase.auth.signOut();
      }

    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }

    console.log('');
  }

  console.log('📊 Password Reset Verification Summary');
  console.log('──────────────────────────────────────────────────');
  console.log('💡 If old password still works: Password reset not completed');
  console.log('💡 If new password works: Password reset successful');
  console.log('💡 If both fail: Account may have other issues');
  console.log('');
  console.log('🔧 Troubleshooting:');
  console.log('1. Check if reset links were clicked');
  console.log('2. Verify new password was set to 22222222');
  console.log('3. Check if reset links expired');
  console.log('4. Verify email confirmation was completed');
}

verifyPasswordReset().catch(console.error); 