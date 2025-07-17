const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testMatching() {
  console.log('🧪 Testing AI Matching Algorithm...');

  try {
    // Get the current user (Jimmy)
    const { data: currentUser, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'jimmychou870@gmail.com')
      .single();

    if (userError) {
      console.error('❌ Error fetching current user:', userError);
      return;
    }

    console.log('👤 Current user:', currentUser.full_name);

    // Get all other users for matching
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUser.id);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log('📊 Total users available for matching:', allUsers.length);

    // Test the matching API
    const response = await fetch('http://localhost:3000/api/matching/candidates', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ Error calling matching API:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const candidates = await response.json();
    console.log('🎯 AI Matching Results:');
    console.log('📈 Candidates found:', candidates.length);
    
    candidates.forEach((candidate, index) => {
      console.log(`${index + 1}. ${candidate.user.full_name} (${candidate.user.age}yo, ${candidate.user.location})`);
      console.log(`   Score: ${(candidate.score * 100).toFixed(1)}%`);
      console.log(`   Interests: ${candidate.user.interests?.join(', ') || 'None'}`);
      console.log(`   Online: ${candidate.user.is_online ? '🟢' : '🔴'}`);
      console.log(`   Premium: ${candidate.user.membership_level === 'premium' ? '⭐' : '📱'}`);
      console.log('');
    });

    // Test refresh functionality
    console.log('🔄 Testing refresh functionality...');
    const refreshResponse = await fetch('http://localhost:3000/api/matching/candidates?refresh=true', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (refreshResponse.ok) {
      const refreshCandidates = await refreshResponse.json();
      console.log('🔄 Refresh Results:');
      console.log('📈 New candidates found:', refreshCandidates.length);
      
      if (refreshCandidates.length > candidates.length) {
        console.log('✅ Refresh successful - found more candidates!');
      } else {
        console.log('⚠️  Refresh returned same or fewer candidates');
      }
    } else {
      console.error('❌ Error with refresh:', refreshResponse.status);
    }

  } catch (error) {
    console.error('❌ Error testing matching:', error);
  }
}

// Run the test
testMatching(); 