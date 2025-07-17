#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 PersonaLink Real Authentication Setup');
console.log('=====================================\n');

console.log('To use real email authentication, you need:');
console.log('1. A Supabase project (free at supabase.com)');
console.log('2. Your project URL and API keys\n');

console.log('📋 Steps:');
console.log('1. Go to https://supabase.com');
console.log('2. Create a new project');
console.log('3. Go to Settings > API');
console.log('4. Copy your Project URL and anon key\n');

rl.question('Enter your Supabase Project URL (e.g., https://abc123.supabase.co): ', (url) => {
  rl.question('Enter your Supabase anon key: ', (anonKey) => {
    rl.question('Enter your Supabase service role key (optional): ', (serviceKey) => {
      
      const envContent = `# Supabase Configuration - Real Mode
NEXT_PUBLIC_SUPABASE_URL=${url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceKey || 'your-service-role-key'}

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3003
NEXT_PUBLIC_APP_NAME=PersonaLink

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment Configuration (optional)
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
`;

      // Backup current .env.local
      const envPath = path.join(process.cwd(), '.env.local');
      const backupPath = path.join(process.cwd(), '.env.local.backup');
      
      if (fs.existsSync(envPath)) {
        fs.copyFileSync(envPath, backupPath);
        console.log('✅ Backed up current .env.local to .env.local.backup');
      }

      // Write new .env.local
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Updated .env.local with real Supabase credentials');
      
      console.log('\n🎉 Setup complete!');
      console.log('\n📝 Next steps:');
      console.log('1. Restart your development server');
      console.log('2. Go to http://localhost:3003/auth/register');
      console.log('3. Create an account with your real email');
      console.log('4. Check your email for verification link');
      console.log('5. Login with your real email and password');
      
      console.log('\n⚠️  Important:');
      console.log('- Make sure to verify your email in Supabase dashboard');
      console.log('- Check spam folder if you don\'t receive verification email');
      console.log('- You can now use real email authentication!');
      
      rl.close();
    });
  });
}); 