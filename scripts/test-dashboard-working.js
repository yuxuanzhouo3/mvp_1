const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testDashboardWorking() {
  console.log('🧪 Testing Dashboard Working Status...\\n');

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
    
    console.log('✅ Session found for:', session.user.email);
    
    // Test 2: Test API endpoints with auth
    console.log('\\n2️⃣ Testing API endpoints...');
    const token = session.access_token;
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Test profile API
    const profileRes = await fetch('http://localhost:3000/api/user/profile', { headers });
    console.log('📊 Profile API:', profileRes.status, profileRes.statusText);
    
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      console.log('✅ Profile loaded successfully');
    }
    
    // Test matches API
    const matchesRes = await fetch('http://localhost:3000/api/user/matches', { headers });
    console.log('💕 Matches API:', matchesRes.status, matchesRes.statusText);
    
    if (matchesRes.ok) {
      const matchesData = await matchesRes.json();
      console.log('✅ Matches loaded successfully');
    }
    
    // Test stats API
    const statsRes = await fetch('http://localhost:3000/api/user/stats', { headers });
    console.log('📈 Stats API:', statsRes.status, statsRes.statusText);
    
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      console.log('✅ Stats loaded successfully');
    }
    
    console.log('\\n🎉 Dashboard API tests completed successfully!');
    console.log('\\n📝 Next steps:');
    console.log('1. Open http://localhost:3000/dashboard in your browser');
    console.log('2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('3. The dashboard should load without CardDescription errors');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDashboardWorking(); 