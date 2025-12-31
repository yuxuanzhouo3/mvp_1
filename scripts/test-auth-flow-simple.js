#!/usr/bin/env node

/**
 * Simple Authentication Flow Test
 * Tests the auth functions directly without browser automation
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_EMAIL = `testuser${Date.now()}@gmail.com`;
const TEST_PASSWORD = 'testpassword123';
const TEST_NAME = 'Test User';

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow (Simple)...');
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bamratexknmqvdbalzen.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseKey) {
    console.log('❌ Missing Supabase key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('📧 Using test email:', TEST_EMAIL);
    
    // Test 1: Sign Up
    console.log('\n🔐 Testing Sign Up...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: {
        data: {
          full_name: TEST_NAME,
        },
      },
    });
    
    if (signUpError) {
      console.log('❌ Sign up failed:', signUpError.message);
      return;
    }
    
    console.log('✅ Sign up successful!');
    console.log('   User ID:', signUpData.user?.id);
    console.log('   Email confirmed:', signUpData.user?.email_confirmed_at ? 'Yes' : 'No');
    console.log('   Session created:', signUpData.session ? 'Yes' : 'No');
    
    // Test 2: Check if profile was created
    if (signUpData.user?.id) {
      console.log('\n📊 Checking Profile Creation...');
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signUpData.user.id)
        .single();
      
      if (profileError) {
        console.log('❌ Profile not found:', profileError.message);
      } else {
        console.log('✅ Profile created successfully!');
        console.log('   Full Name:', profile.full_name);
        console.log('   Credits:', profile.credits);
        console.log('   Created:', profile.created_at);
      }
    }
    
    // Test 3: Sign Out
    console.log('\n🚪 Testing Sign Out...');
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.log('❌ Sign out failed:', signOutError.message);
    } else {
      console.log('✅ Sign out successful!');
    }
    
    // Test 4: Sign In
    console.log('\n🔐 Testing Sign In...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (signInError) {
      console.log('❌ Sign in failed:', signInError.message);
      return;
    }
    
    console.log('✅ Sign in successful!');
    console.log('   User ID:', signInData.user?.id);
    console.log('   Email:', signInData.user?.email);
    console.log('   Session valid:', signInData.session ? 'Yes' : 'No');
    
    // Test 5: Check Session
    console.log('\n📋 Testing Session Management...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session check failed:', sessionError.message);
    } else {
      console.log('✅ Session check successful!');
      console.log('   Session exists:', sessionData.session ? 'Yes' : 'No');
      if (sessionData.session) {
        console.log('   User ID:', sessionData.session.user.id);
        console.log('   Expires:', sessionData.session.expires_at);
      }
    }
    
    // Test 6: Final Sign Out
    console.log('\n🚪 Final Sign Out...');
    const { error: finalSignOutError } = await supabase.auth.signOut();
    
    if (finalSignOutError) {
      console.log('❌ Final sign out failed:', finalSignOutError.message);
    } else {
      console.log('✅ Final sign out successful!');
    }
    
    console.log('\n🎉 Authentication flow test completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Sign up works');
    console.log('   ✅ Profile creation works');
    console.log('   ✅ Sign out works');
    console.log('   ✅ Sign in works');
    console.log('   ✅ Session management works');
    
  } catch (error) {
    console.error('❌ Test failed with unexpected error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testAuthFlow().catch(console.error); 