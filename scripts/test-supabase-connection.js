#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey ? supabaseKey.length : 'undefined');
console.log('Key preview:', supabaseKey ? supabaseKey.substring(0, 20) : 'undefined');

  if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or key');
    process.exit(1);
  }

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔄 Testing connection...');
    // Test a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.error('Error details:', error);
    } else {
      console.log('✅ Connection successful!');
      console.log('Data:', data);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

testConnection(); 