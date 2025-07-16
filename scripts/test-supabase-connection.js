#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.log('Please run: node scripts/setup-real-db.js');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
  console.log('');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test basic connection
    console.log('🔌 Testing basic connection...');
    const { data, error } = await supabase.from('system_settings').select('*').limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️  Tables not found - this is expected if database schema is not set up yet');
        console.log('   Run the SQL script in your Supabase dashboard to create tables');
      } else {
        console.error('❌ Connection error:', error.message);
        process.exit(1);
      }
    } else {
      console.log('✅ Database connection successful!');
      console.log('✅ Tables exist and are accessible');
    }

    // Test auth service
    console.log('\n🔐 Testing auth service...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Auth service error:', authError.message);
    } else {
      console.log('✅ Auth service is working');
      console.log('   Session:', authData.session ? 'Active' : 'None');
    }

    // Test storage service
    console.log('\n📦 Testing storage service...');
    const { data: storageData, error: storageError } = await supabase.storage.listBuckets();
    
    if (storageError) {
      console.log('⚠️  Storage service error (this is normal if not configured):', storageError.message);
    } else {
      console.log('✅ Storage service is working');
      console.log('   Buckets:', storageData.length);
    }

    console.log('\n🎉 Supabase connection test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of scripts/setup-database.sql');
    console.log('4. Run the SQL script to create tables and policies');
    console.log('5. Restart your development server: npm run dev');
    console.log('6. Try registering with your email: mornscience@163.com');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

testSupabaseConnection(); 