const { createClient } = require('@supabase/supabase-js');

// Test your Supabase connection
async function testSupabaseKeys() {
  console.log('🔍 Testing Supabase API Keys...\n');
  
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('📋 Environment Variables:');
  console.log('URL:', supabaseUrl);
  console.log('Anon Key:', anonKey ? `${anonKey.substring(0, 20)}...` : 'NOT SET');
  console.log('Service Key:', serviceKey ? `${serviceKey.substring(0, 20)}...` : 'NOT SET');
  console.log('');
  
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.log('❌ Missing environment variables!');
    return;
  }
  
  try {
    // Test with anon key
    console.log('🧪 Testing with Anon Key...');
    const supabaseAnon = createClient(supabaseUrl, anonKey);
    
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (anonError) {
      console.log('❌ Anon Key Error:', anonError.message);
    } else {
      console.log('✅ Anon Key works!');
    }
    
    // Test with service key
    console.log('\n🧪 Testing with Service Role Key...');
    const supabaseService = createClient(supabaseUrl, serviceKey);
    
    const { data: serviceData, error: serviceError } = await supabaseService
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (serviceError) {
      console.log('❌ Service Key Error:', serviceError.message);
    } else {
      console.log('✅ Service Key works!');
    }
    
    // Test auth
    console.log('\n🧪 Testing Authentication...');
    const { data: { session }, error: authError } = await supabaseAnon.auth.getSession();
    
    if (authError) {
      console.log('❌ Auth Error:', authError.message);
    } else {
      console.log('✅ Auth works! Session:', session ? 'Valid' : 'None');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testSupabaseKeys(); 