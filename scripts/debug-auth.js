#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debugAuth() {
  console.log('🔍 Debugging authentication state...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('📋 Environment:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${supabaseKey?.substring(0, 20)}...`);
  console.log(`   Mock Mode: ${supabaseUrl === 'https://mock.supabase.co'}`);
  console.log('');

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check current session
    console.log('🔍 Checking current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError.message);
    } else if (session) {
      console.log('✅ Active session found:');
      console.log(`   User ID: ${session.user.id}`);
      console.log(`   Email: ${session.user.email}`);
      console.log(`   Expires: ${new Date(session.expires_at * 1000).toLocaleString()}`);
    } else {
      console.log('⚠️  No active session found');
    }

    // Test login
    console.log('\n🔐 Testing login...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'mornscience@163.com',
      password: 'Zyx!213416'
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      return;
    }

    console.log('✅ Login successful!');
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Email: ${data.user.email}`);
    console.log(`   Session: ${data.session ? 'Created' : 'Missing'}`);

    // Check session again after login
    console.log('\n🔍 Checking session after login...');
    const { data: { session: newSession } } = await supabase.auth.getSession();
    
    if (newSession) {
      console.log('✅ New session active:');
      console.log(`   Access Token: ${newSession.access_token ? 'Present' : 'Missing'}`);
      console.log(`   Refresh Token: ${newSession.refresh_token ? 'Present' : 'Missing'}`);
    } else {
      console.log('❌ No session after login!');
    }

    // Test dashboard access
    console.log('\n🏠 Testing dashboard access...');
    const response = await fetch('http://localhost:3000/dashboard', {
      headers: {
        'Cookie': `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token=${newSession?.access_token || ''}`
      }
    });
    
    console.log(`   Dashboard response: ${response.status} ${response.statusText}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

debugAuth(); 