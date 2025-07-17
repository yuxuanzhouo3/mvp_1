const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testUsers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    username: 'alice_tech',
    email: 'alice.tech@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    bio: 'Software engineer passionate about AI and machine learning. Love hiking, reading sci-fi novels, and trying new restaurants.',
    age: 28,
    gender: 'female',
    location: 'San Francisco, CA',
    is_online: true,
    is_verified: true,
    is_premium: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    username: 'bob_design',
    email: 'bob.design@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    bio: 'Product manager with a background in design. Enjoy traveling, photography, and building things that matter.',
    age: 32,
    gender: 'male',
    location: 'New York, NY',
    is_online: true,
    is_verified: true,
    is_premium: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    username: 'carol_health',
    email: 'carol.health@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    bio: 'Data scientist working on healthcare applications. Love yoga, cooking, and exploring new cultures through food.',
    age: 26,
    gender: 'female',
    location: 'Austin, TX',
    is_online: false,
    is_verified: true,
    is_premium: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    username: 'david_ux',
    email: 'david.ux@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    bio: 'UX designer focused on creating meaningful user experiences. Passionate about sustainability and outdoor adventures.',
    age: 30,
    gender: 'male',
    location: 'Seattle, WA',
    is_online: true,
    is_verified: false,
    is_premium: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    username: 'emma_marketing',
    email: 'emma.marketing@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    bio: 'Marketing strategist with a love for storytelling and brand building. Enjoy running, coffee culture, and live music.',
    age: 29,
    gender: 'female',
    location: 'Boston, MA',
    is_online: true,
    is_verified: true,
    is_premium: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    username: 'frank_creative',
    email: 'frank.creative@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    bio: 'Film director and creative entrepreneur. Love storytelling, photography, and exploring new cultures through travel.',
    age: 31,
    gender: 'male',
    location: 'Los Angeles, CA',
    is_online: false,
    is_verified: true,
    is_premium: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    username: 'grace_finance',
    email: 'grace.finance@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    bio: 'Financial analyst with a passion for personal finance education. Enjoy cooking, board games, and helping others.',
    age: 27,
    gender: 'female',
    location: 'Chicago, IL',
    is_online: true,
    is_verified: false,
    is_premium: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    username: 'henry_food',
    email: 'henry.food@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    bio: 'Chef and restaurant owner passionate about creating memorable dining experiences. Love music, dancing, and bringing people together.',
    age: 33,
    gender: 'male',
    location: 'Miami, FL',
    is_online: true,
    is_verified: true,
    is_premium: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009',
    username: 'isabella_art',
    email: 'isabella.art@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    bio: 'Visual artist and environmental activist. Create art that raises awareness about climate change. Love hiking, painting, and connecting with nature.',
    age: 25,
    gender: 'female',
    location: 'Portland, OR',
    is_online: false,
    is_verified: true,
    is_premium: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    username: 'james_tech',
    email: 'james.tech@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    bio: 'Senior software architect and tech mentor. Love rock climbing, craft beer, and helping others grow in their careers.',
    age: 35,
    gender: 'male',
    location: 'Denver, CO',
    is_online: true,
    is_verified: true,
    is_premium: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    username: 'katherine_health',
    email: 'katherine.health@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    bio: 'Nurse practitioner specializing in mental health. Love yoga, meditation, and helping people find balance.',
    age: 31,
    gender: 'female',
    location: 'Nashville, TN',
    is_online: true,
    is_verified: true,
    is_premium: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    username: 'leo_entrepreneur',
    email: 'leo.entrepreneur@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    bio: 'Serial entrepreneur and startup advisor. Love reading, playing guitar, and mentoring other founders.',
    age: 29,
    gender: 'male',
    location: 'Austin, TX',
    is_online: true,
    is_verified: true,
    is_premium: true
  }
];

const userInterests = [
  { user_id: '550e8400-e29b-41d4-a716-446655440001', interests: ['Technology', 'AI', 'Machine Learning', 'Hiking', 'Reading', 'Food', 'Programming'] },
  { user_id: '550e8400-e29b-41d4-a716-446655440002', interests: ['Product Management', 'Design', 'Travel', 'Photography', 'Innovation', 'Startups'] },
  { user_id: '550e8400-e29b-41d4-a716-446655440003', interests: ['Data Science', 'Healthcare', 'Yoga', 'Cooking', 'Travel', 'Wellness'] },
  { user_id: '550e8400-e29b-41d4-a716-446655440004', interests: ['UX Design', 'Sustainability', 'Outdoor Sports', 'Art', 'Environmental Causes', 'Adventure'] },
  { user_id: '550e8400-e29b-41d4-a716-446655440005', interests: ['Marketing', 'Storytelling', 'Running', 'Coffee', 'Music', 'Brand Building'] },
  { user_id: '550e8400-e29b-41d4-a716-446655440006', interests: ['Film', 'Photography', 'Travel', 'Art', 'Entrepreneurship', 'Storytelling'] },
  { user_id: '550e8400-e29b-41d4-a716-446655440007', interests: ['Finance', 'Education', 'Cooking', 'Board Games', 'Mentoring', 'Personal Development'] },
  { user_id: '550e8400-e29b-41d4-a716-446655440008', interests: ['Cooking', 'Music', 'Dancing', 'Hospitality', 'Community', 'Food Culture'] },
  { user_id: '550e8400-e29b-41d4-a716-446655440009', interests: ['Art', 'Environmental Activism', 'Painting', 'Hiking', 'Sustainability', 'Nature'] },
  { user_id: '550e8400-e29b-41d4-a716-446655440010', interests: ['Software Architecture', 'Rock Climbing', 'Craft Beer', 'Mentoring', 'Technology', 'Outdoor Sports'] },
  { user_id: '550e8400-e29b-41d4-a716-446655440011', interests: ['Mental Health', 'Yoga', 'Meditation', 'Wellness', 'Healthcare', 'Mindfulness'] },
  { user_id: '550e8400-e29b-41d4-a716-446655440012', interests: ['Entrepreneurship', 'Startups', 'Reading', 'Guitar', 'Mentoring', 'Innovation'] }
];

async function populateTestUsers() {
  console.log('🚀 Starting to populate test users...');

  try {
    // First, let's check if we have any existing test users
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id')
      .in('id', testUsers.map(u => u.id));

    if (existingUsers && existingUsers.length > 0) {
      console.log('⚠️  Some test users already exist. Skipping...');
      return;
    }

    // Insert test users into profiles table
    const { data: insertedProfiles, error: profileError } = await supabase
      .from('profiles')
      .insert(testUsers)
      .select();

    if (profileError) {
      console.error('❌ Error inserting profiles:', profileError);
      return;
    }

    console.log('✅ Successfully inserted', insertedProfiles.length, 'test profiles');

    // Create user settings for each test user
    const userSettings = testUsers.map(user => ({
      user_id: user.id,
      notifications_enabled: true,
      email_notifications: true,
      push_notifications: true,
      privacy_level: 'public',
      show_online_status: true,
      show_location: true,
      allow_messages_from: 'all'
    }));

    const { error: settingsError } = await supabase
      .from('user_settings')
      .insert(userSettings);

    if (settingsError) {
      console.error('❌ Error inserting user settings:', settingsError);
    } else {
      console.log('✅ Successfully inserted user settings');
    }

    // Create user balance for each test user
    const userBalances = testUsers.map(user => ({
      user_id: user.id,
      balance: user.is_premium ? Math.floor(Math.random() * 500) + 200 : Math.floor(Math.random() * 200) + 50,
      total_earned: Math.floor(Math.random() * 1000) + 200,
      total_spent: Math.floor(Math.random() * 300) + 50
    }));

    const { error: balanceError } = await supabase
      .from('user_balance')
      .insert(userBalances);

    if (balanceError) {
      console.error('❌ Error inserting user balances:', balanceError);
    } else {
      console.log('✅ Successfully inserted user balances');
    }

    // Create match preferences for each test user
    const matchPreferences = testUsers.map(user => ({
      user_id: user.id,
      age_min: 22,
      age_max: 40,
      gender_preference: ['male', 'female'],
      location_radius: 100,
      max_distance: 200,
      interests: userInterests.find(ui => ui.user_id === user.id)?.interests.slice(0, 3) || [],
      deal_breakers: []
    }));

    const { error: preferencesError } = await supabase
      .from('match_preferences')
      .insert(matchPreferences);

    if (preferencesError) {
      console.error('❌ Error inserting match preferences:', preferencesError);
    } else {
      console.log('✅ Successfully inserted match preferences');
    }

    // Insert user interests
    const interestsToInsert = [];
    userInterests.forEach(userInterest => {
      userInterest.interests.forEach(interest => {
        interestsToInsert.push({
          user_id: userInterest.user_id,
          interest: interest
        });
      });
    });

    const { error: interestsError } = await supabase
      .from('user_interests')
      .insert(interestsToInsert);

    if (interestsError) {
      console.error('❌ Error inserting user interests:', interestsError);
    } else {
      console.log('✅ Successfully inserted user interests');
    }

    console.log('🎉 Successfully populated all test users!');
    console.log('📊 Test users created:', testUsers.length);
    console.log('🔗 You can now test the AI matching algorithm with these users');

  } catch (error) {
    console.error('❌ Error populating test users:', error);
  }
}

// Run the script
populateTestUsers(); 