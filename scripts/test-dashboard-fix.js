const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testDashboardFix() {
  console.log('🧪 Testing Dashboard Authentication Fix...\n');

  try {
    // Test 1: Check if we can get a session
    console.log('1️⃣ Testing session retrieval...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session error:', sessionError.message);
      return;
    }
    
    if (!session) {
      console.log('❌ No active session found');
      console.log('💡 Please log in first at http://localhost:3000/auth/login');
      return;
    }
    
    console.log('✅ Session found for user:', session.user.email);
    console.log('🔑 Access token available:', !!session.access_token);
    
    // Test 2: Test API calls with authorization headers
    console.log('\n2️⃣ Testing API calls with auth headers...');
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
    
    // Test profile API
    console.log('📊 Testing /api/user/profile...');
    const profileRes = await fetch('http://localhost:3000/api/user/profile', { headers });
    console.log('   Status:', profileRes.status);
    
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      console.log('   ✅ Profile loaded:', profileData.profile?.full_name);
    } else {
      const errorData = await profileRes.text();
      console.log('   ❌ Profile error:', errorData);
    }
    
    // Test matches API
    console.log('💕 Testing /api/user/matches...');
    const matchesRes = await fetch('http://localhost:3000/api/user/matches', { headers });
    console.log('   Status:', matchesRes.status);
    
    if (matchesRes.ok) {
      const matchesData = await matchesRes.json();
      console.log('   ✅ Matches loaded:', matchesData.matches?.length || 0, 'matches');
    } else {
      const errorData = await matchesRes.text();
      console.log('   ❌ Matches error:', errorData);
    }
    
    // Test stats API
    console.log('📈 Testing /api/user/stats...');
    const statsRes = await fetch('http://localhost:3000/api/user/stats', { headers });
    console.log('   Status:', statsRes.status);
    
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      console.log('   ✅ Stats loaded:', statsData.stats);
    } else {
      const errorData = await statsRes.text();
      console.log('   ❌ Stats error:', errorData);
    }
    
    console.log('\n🎉 Dashboard authentication fix test completed!');
    console.log('💡 If all APIs return 200 status, the fix is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDashboardFix(); 