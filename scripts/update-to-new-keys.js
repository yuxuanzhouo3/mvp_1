const fs = require('fs');
const path = require('path');

console.log('🔑 Supabase API Key Update Helper');
console.log('=====================================\n');

console.log('❌ Your current API keys are using the legacy format which has been disabled.');
console.log('✅ You need to update to the new publishable and secret key format.\n');

console.log('📋 Steps to fix this:');
console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
console.log('2. Select your project: bamratexknmqvdbalzen');
console.log('3. Go to Settings > API');
console.log('4. Copy the new "publishable" and "secret" keys');
console.log('5. Update your .env.local file with the new format\n');

console.log('🔄 New environment variable format:');
console.log('NEXT_PUBLIC_SUPABASE_URL=https://bamratexknmqvdbalzen.supabase.co');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-publishable-key');
console.log('SUPABASE_SERVICE_ROLE_KEY=your-new-secret-key\n');

console.log('💡 Alternative: Re-enable legacy keys');
console.log('1. Go to Settings > API in your Supabase dashboard');
console.log('2. Find "Legacy API keys" section');
console.log('3. Click "Re-enable" to temporarily restore the old keys\n');

console.log('🚀 After updating, restart your development server: npm run dev');

// Check current .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('\n📄 Current .env.local content:');
  const content = fs.readFileSync(envPath, 'utf8');
  console.log(content);
} 