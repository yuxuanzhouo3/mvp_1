#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testLoginFlow() {
  console.log('🔍 Testing login flow...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test login with your credentials
    console.log('🔐 Testing login with mornscience@163.com...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'mornscience@163.com',
      password: 'Zyx!213416'
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      return;
    }

    console.log('✅ Login successful!');
    console.log('📊 User data:', {
      id: data.user?.id,
      email: data.user?.email,
      created_at: data.user?.created_at
    });
    console.log('🔑 Session:', {
      access_token: data.session?.access_token ? 'Present' : 'Missing',
      expires_at: data.session?.expires_at
    });

    // Test getting session
    console.log('\n🔍 Testing session retrieval...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session retrieval failed:', sessionError.message);
    } else {
      console.log('✅ Session retrieved successfully');
      console.log('📊 Session user:', sessionData.session?.user?.email);
    }

    // Test database access
    console.log('\n🗄️  Testing database access...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user?.id)
      .single();

    if (profileError) {
      console.log('⚠️  Profile not found or error:', profileError.message);
    } else {
      console.log('✅ Profile found:', {
        id: profileData.id,
        full_name: profileData.full_name,
        credits: profileData.credits
      });
    }

    // Sign out
    console.log('\n🚪 Signing out...');
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('❌ Sign out failed:', signOutError.message);
    } else {
      console.log('✅ Sign out successful');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testLoginFlow(); 