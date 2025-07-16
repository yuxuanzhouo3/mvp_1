#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkAuthMode() {
  console.log('🔍 Checking authentication mode...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('📋 Environment Configuration:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${supabaseKey?.substring(0, 20)}...`);
  console.log('');

  // Check if credentials are real
  const isRealCredentials = supabaseUrl && 
                           supabaseKey && 
                           supabaseUrl !== 'https://mock.supabase.co' &&
                           supabaseKey !== 'mock-key' &&
                           supabaseUrl !== 'your_supabase_url_here' &&
                           supabaseKey !== 'your_supabase_anon_key_here';

  console.log('🎭 Mock Mode Detection:');
  console.log(`   Has URL: ${!!supabaseUrl}`);
  console.log(`   Has Key: ${!!supabaseKey}`);
  console.log(`   Is Real Credentials: ${isRealCredentials}`);
  console.log(`   Should Use Real Mode: ${isRealCredentials}`);
  console.log('');

  if (!isRealCredentials) {
    console.log('❌ Environment is configured for mock mode');
    console.log('   To use real authentication:');
    console.log('   1. Update .env.local with your real Supabase credentials');
    console.log('   2. Run: node scripts/setup-real-db.js');
    return;
  }

  console.log('✅ Environment is configured for real authentication');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test auth service
    console.log('🔐 Testing auth service...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Auth service error:', authError.message);
    } else {
      console.log('✅ Auth service is working');
      console.log('   Current session:', authData.session ? 'Active' : 'None');
    }

    // Test database connection
    console.log('\n🗄️  Testing database connection...');
    const { data: dbData, error: dbError } = await supabase.from('system_settings').select('*').limit(1);
    
    if (dbError) {
      if (dbError.code === 'PGRST116') {
        console.log('⚠️  Database tables not found');
        console.log('   Run the database setup script in your Supabase dashboard');
      } else {
        console.error('❌ Database error:', dbError.message);
      }
    } else {
      console.log('✅ Database connection successful');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }

  console.log('\n🔧 To fix login issues:');
  console.log('1. Clear browser localStorage:');
  console.log('   - Open browser dev tools (F12)');
  console.log('   - Go to Application/Storage tab');
  console.log('   - Clear localStorage for localhost:3002');
  console.log('   - Remove any "mock-mode-override" or "mock-session" entries');
  console.log('');
  console.log('2. Clear browser cookies:');
  console.log('   - Clear cookies for localhost:3002');
  console.log('   - Remove any "mock-session" cookies');
  console.log('');
  console.log('3. Restart the development server:');
  console.log('   npm run dev');
  console.log('');
  console.log('4. Try logging in again with your real credentials');
}

checkAuthMode(); 