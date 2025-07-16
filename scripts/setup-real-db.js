#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up PersonaLink with your real Supabase database...\n');

// Your Supabase credentials
const supabaseUrl = 'https://bamratexknmqvdbalzen.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTM4NzEsImV4cCI6MjA2ODA4OTg3MX0.yYa98ioJLLouUgHWITGb7U_VjNCTUuM-5NcraM7f3zA';

// Create .env.local file
const envContent = `# Supabase Configuration - Real Project
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3002
NEXT_PUBLIC_APP_NAME=PersonaLink

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mornscience@163.com
SMTP_PASS=your-app-password

# Payment Configuration (optional)
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
`;

const envPath = path.join(process.cwd(), '.env.local');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file with your Supabase credentials');
} catch (error) {
  console.error('❌ Error creating .env.local file:', error.message);
  process.exit(1);
}

console.log('\n📋 Next steps:');
console.log('1. Get your Supabase Service Role Key:');
console.log('   - Go to your Supabase dashboard: https://supabase.com/dashboard');
console.log('   - Navigate to Settings > API');
console.log('   - Copy the "service_role" key (not the anon key)');
console.log('   - Replace "your-service-role-key-here" in .env.local');
console.log('\n2. Run database migrations:');
console.log('   - Install Supabase CLI: npm install -g supabase');
console.log('   - Login to Supabase: supabase login');
console.log('   - Link your project: supabase link --project-ref bamratexknmqvdbalzen');
console.log('   - Run migrations: supabase db push');
console.log('\n3. Restart your development server:');
console.log('   - Stop the current server (Ctrl+C)');
console.log('   - Run: npm run dev');
console.log('\n4. Test the setup:');
console.log('   - Go to http://localhost:3002/auth/register');
console.log('   - Try registering with your email: mornscience@163.com');
console.log('   - Check if data appears in your Supabase dashboard');

console.log('\n🔧 Alternative: Manual database setup');
console.log('If you prefer to set up the database manually:');
console.log('1. Go to your Supabase dashboard > SQL Editor');
console.log('2. Copy the contents of database/init.sql');
console.log('3. Paste and run the SQL in the Supabase SQL Editor');

console.log('\n⚠️  Important Notes:');
console.log('- The app will now use your real Supabase database instead of mock mode');
console.log('- Make sure to get your service role key for full functionality');
console.log('- You may need to configure Row Level Security (RLS) policies in Supabase');
console.log('- Test thoroughly before deploying to production');

console.log('\n🎉 Setup complete! Follow the steps above to finish configuration.'); 