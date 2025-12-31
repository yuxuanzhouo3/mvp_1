const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkEmailConfiguration() {
  console.log('🔍 Checking Supabase Email Configuration');
  console.log('─'.repeat(50));

  try {
    // Check if we can access auth settings
    console.log('1️⃣ Testing basic auth access...');
    
    // Try to get auth settings (this might not work with current permissions)
    try {
      const { data: settings, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) {
        console.log(`⚠️  Cannot access auth admin: ${error.message}`);
      } else {
        console.log(`✅ Auth admin access: ${settings.users?.length || 0} users found`);
      }
    } catch (error) {
      console.log(`⚠️  Auth admin access failed: ${error.message}`);
    }

    // Test email sending with a simple reset request
    console.log('\n2️⃣ Testing email sending capability...');
    const testEmail = 'test@example.com';
    
    const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: 'https://mornhub.lat/auth/update-password'
    });

    if (resetError) {
      console.log(`❌ Email sending test failed: ${resetError.message}`);
      
      // Check for specific error types
      if (resetError.message.includes('rate limit')) {
        console.log('🚨 RATE LIMIT ISSUE DETECTED');
        console.log('   → Supabase is rate limiting email sends');
        console.log('   → Check your email sending quota');
      } else if (resetError.message.includes('email')) {
        console.log('🚨 EMAIL CONFIGURATION ISSUE DETECTED');
        console.log('   → Email templates or SMTP not configured');
        console.log('   → Check Supabase dashboard email settings');
      } else if (resetError.message.includes('template')) {
        console.log('🚨 EMAIL TEMPLATE ISSUE DETECTED');
        console.log('   → Password reset email template missing');
        console.log('   → Configure email templates in Supabase');
      }
    } else {
      console.log(`✅ Email sending test successful`);
      console.log(`📧 Reset request sent to: ${testEmail}`);
    }

    // Check project settings
    console.log('\n3️⃣ Checking project configuration...');
    console.log(`🔗 Project URL: ${supabaseUrl}`);
    console.log(`🔑 Service Key: ${supabaseServiceKey ? '✅ Present' : '❌ Missing'}`);
    console.log(`🔑 Anon Key: ${supabaseAnonKey ? '✅ Present' : '❌ Missing'}`);

    // Test with actual user emails
    console.log('\n4️⃣ Testing with actual user accounts...');
    const testAccounts = [
      'yzcmf94@gmail.com',
      'chengyou_science@163.com', 
      'hu0112174@student.humphreys.edu'
    ];

    for (const email of testAccounts) {
      console.log(`\n📧 Testing: ${email}`);
      
      try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://mornhub.lat/auth/update-password'
        });

        if (error) {
          console.log(`❌ Failed: ${error.message}`);
          
          // Provide specific guidance based on error
          if (error.message.includes('{}') || error.message === '{}') {
            console.log('   → Empty error response - likely email configuration issue');
          } else if (error.message.includes('rate limit')) {
            console.log('   → Rate limit exceeded');
          } else if (error.message.includes('not found')) {
            console.log('   → User not found in database');
          }
        } else {
          console.log(`✅ Success: Reset email sent`);
        }
      } catch (error) {
        console.log(`❌ Exception: ${error.message}`);
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.log(`❌ Configuration check failed: ${error.message}`);
  }
}

async function provideConfigurationGuidance() {
  console.log('\n📋 Supabase Email Configuration Guide');
  console.log('─'.repeat(50));
  
  console.log('\n🔧 Steps to fix email issues:');
  console.log('\n1️⃣ Check Supabase Dashboard:');
  console.log('   • Go to https://supabase.com/dashboard');
  console.log('   • Select your project');
  console.log('   • Navigate to Authentication > Email Templates');
  console.log('   • Ensure "Confirm signup" and "Reset password" templates exist');
  
  console.log('\n2️⃣ Configure SMTP Settings:');
  console.log('   • Go to Authentication > Settings');
  console.log('   • Check "SMTP Settings" section');
  console.log('   • Ensure SMTP is properly configured');
  console.log('   • Test SMTP connection');
  
  console.log('\n3️⃣ Check Rate Limits:');
  console.log('   • Go to Settings > Usage');
  console.log('   • Check email sending limits');
  console.log('   • Free tier: 50 emails/day');
  console.log('   • Pro tier: 1000 emails/day');
  
  console.log('\n4️⃣ Verify Email Templates:');
  console.log('   • Template must include {{ .ConfirmationURL }}');
  console.log('   • Template must be enabled');
  console.log('   • Check template syntax');
  
  console.log('\n5️⃣ Test Email Configuration:');
  console.log('   • Use Supabase dashboard test feature');
  console.log('   • Send test email to yourself');
  console.log('   • Check spam folder');
  
  console.log('\n🚨 Common Issues:');
  console.log('   • SMTP not configured');
  console.log('   • Email templates missing');
  console.log('   • Rate limits exceeded');
  console.log('   • Wrong redirect URL');
  console.log('   • Email provider blocking');
}

async function main() {
  console.log('🚀 Supabase Email Configuration Diagnostic');
  console.log('='.repeat(60));
  console.log(`🔗 Project: ${supabaseUrl}`);
  console.log('='.repeat(60));

  await checkEmailConfiguration();
  await provideConfigurationGuidance();

  console.log('\n📊 Diagnostic Summary');
  console.log('─'.repeat(50));
  console.log('✅ Check completed');
  console.log('📋 Review the configuration guide above');
  console.log('🔧 Fix issues in Supabase dashboard');
  console.log('🔄 Re-run test after configuration changes');
}

main().catch(console.error); 