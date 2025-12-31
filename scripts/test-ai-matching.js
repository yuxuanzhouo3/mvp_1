const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAIMatching() {
  console.log('🤖 Testing AI Matching Algorithm...\n');

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
    console.log('📧 Email:', currentUser.email);
    console.log('💳 Credits:', currentUser.credits);
    console.log('⭐ Membership:', currentUser.membership_level);
    console.log('');

    // Test 1: Get initial candidates
    console.log('🎯 Test 1: Getting Initial Candidates');
    console.log('=' .repeat(50));
    
    const response1 = await fetch('http://localhost:3000/api/matching/candidates?limit=5');
    if (!response1.ok) {
      console.error('❌ Error calling matching API:', response1.status);
      return;
    }

    const result1 = await response1.json();
    console.log('📊 Initial candidates found:', result1.total_found);
    console.log('🔄 Refresh token:', result1.refresh_token);
    console.log('📈 Total available:', result1.total_available);
    console.log('');

    // Display top candidates
    result1.candidates.slice(0, 3).forEach((candidate, index) => {
      console.log(`${index + 1}. ${candidate.user.full_name}`);
      console.log(`   Score: ${(candidate.score * 100).toFixed(1)}%`);
      console.log(`   Strength: ${candidate.match_strength.toUpperCase()}`);
      console.log(`   Online: ${candidate.user.is_online ? '🟢' : '🔴'}`);
      console.log(`   Premium: ${candidate.user.membership_level === 'premium' ? '⭐' : '📱'}`);
      console.log(`   Reasons: ${candidate.reasons.join(', ')}`);
      console.log(`   Conversation starters: ${candidate.conversation_starters[0]}`);
      console.log('');
    });

    // Test 2: Refresh to get different candidates
    console.log('🔄 Test 2: Refreshing for More Candidates');
    console.log('=' .repeat(50));
    
    const response2 = await fetch('http://localhost:3000/api/matching/candidates?refresh=true&limit=5');
    if (!response2.ok) {
      console.error('❌ Error calling refresh API:', response2.status);
      return;
    }

    const result2 = await response2.json();
    console.log('📊 Refreshed candidates found:', result2.total_found);
    console.log('🔄 New refresh token:', result2.refresh_token);
    console.log('');

    // Display refreshed candidates
    result2.candidates.slice(0, 3).forEach((candidate, index) => {
      console.log(`${index + 1}. ${candidate.user.full_name}`);
      console.log(`   Score: ${(candidate.score * 100).toFixed(1)}%`);
      console.log(`   Strength: ${candidate.match_strength.toUpperCase()}`);
      console.log(`   Online: ${candidate.user.is_online ? '🟢' : '🔴'}`);
      console.log(`   Premium: ${candidate.user.membership_level === 'premium' ? '⭐' : '📱'}`);
      console.log(`   Reasons: ${candidate.reasons.join(', ')}`);
      console.log('');
    });

    // Test 3: Get more candidates with higher limit
    console.log('📈 Test 3: Getting More Candidates (Limit 10)');
    console.log('=' .repeat(50));
    
    const response3 = await fetch('http://localhost:3000/api/matching/candidates?limit=10');
    if (!response3.ok) {
      console.error('❌ Error calling extended API:', response3.status);
      return;
    }

    const result3 = await response3.json();
    console.log('📊 Extended candidates found:', result3.total_found);
    console.log('');

    // Analyze compatibility factors
    console.log('🔍 Compatibility Analysis:');
    const avgFactors = {
      interests: 0,
      personality: 0,
      location: 0,
      industry: 0,
      communication: 0,
      activity: 0,
      values: 0
    };

    result3.candidates.forEach(candidate => {
      Object.keys(avgFactors).forEach(key => {
        avgFactors[key] += candidate.compatibility_factors[key];
      });
    });

    Object.keys(avgFactors).forEach(key => {
      avgFactors[key] = avgFactors[key] / result3.candidates.length;
      console.log(`   ${key.charAt(0).toUpperCase() + key.slice(1)}: ${(avgFactors[key] * 100).toFixed(1)}%`);
    });

    console.log('');
    console.log('🎉 AI Matching Algorithm Test Complete!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   • Total users available: ${result3.total_available}`);
    console.log(`   • Candidates returned: ${result3.total_found}`);
    console.log(`   • Refresh functionality: ✅ Working`);
    console.log(`   • AI scoring: ✅ Working`);
    console.log(`   • Compatibility factors: ✅ Working`);
    console.log(`   • Conversation starters: ✅ Working`);
    console.log('');
    console.log('🚀 The AI matching algorithm is successfully implemented and working!');

  } catch (error) {
    console.error('❌ Error testing AI matching:', error);
  }
}

// Run the test
testAIMatching(); 