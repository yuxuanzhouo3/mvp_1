const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testUsers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'alice.tech@example.com',
    full_name: 'Alice Johnson',
    avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    age: 28,
    gender: 'female',
    location: 'San Francisco, CA',
    bio: 'Software engineer passionate about AI and machine learning. Love hiking, reading sci-fi novels, and trying new restaurants. Always excited to learn new technologies and meet like-minded people.',
    interests: ['Technology', 'AI', 'Machine Learning', 'Hiking', 'Reading', 'Food', 'Programming'],
    industry: 'Technology',
    communication_style: 'Direct and thoughtful',
    is_online: true,
    is_verified: true,
    membership_level: 'premium',
    credits: 500,
    last_seen: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'bob.design@example.com',
    full_name: 'Bob Smith',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    age: 32,
    gender: 'male',
    location: 'New York, NY',
    bio: 'Product manager with a background in design. Enjoy traveling, photography, and building things that matter. Love connecting with creative minds and exploring new cultures.',
    interests: ['Product Management', 'Design', 'Travel', 'Photography', 'Innovation', 'Startups'],
    industry: 'Technology',
    communication_style: 'Collaborative and creative',
    is_online: true,
    is_verified: true,
    membership_level: 'free',
    credits: 200,
    last_seen: new Date().toISOString()
  },
  {
    id: 'test-user-3',
    email: 'carol.health@example.com',
    full_name: 'Carol Davis',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    age: 26,
    gender: 'female',
    location: 'Austin, TX',
    bio: 'Data scientist working on healthcare applications. Love yoga, cooking, and exploring new cultures through food. Passionate about using data to improve people\'s lives.',
    interests: ['Data Science', 'Healthcare', 'Yoga', 'Cooking', 'Travel', 'Wellness'],
    industry: 'Healthcare',
    communication_style: 'Analytical and empathetic',
    is_online: false,
    is_verified: true,
    membership_level: 'premium',
    credits: 400,
    last_seen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    id: 'test-user-4',
    email: 'david.ux@example.com',
    full_name: 'David Wilson',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    age: 30,
    gender: 'male',
    location: 'Seattle, WA',
    bio: 'UX designer focused on creating meaningful user experiences. Passionate about sustainability and outdoor adventures. Love combining creativity with environmental consciousness.',
    interests: ['UX Design', 'Sustainability', 'Outdoor Sports', 'Art', 'Environmental Causes', 'Adventure'],
    industry: 'Technology',
    communication_style: 'User-centered and thoughtful',
    is_online: true,
    is_verified: false,
    membership_level: 'free',
    credits: 150,
    last_seen: new Date().toISOString()
  },
  {
    id: 'test-user-5',
    email: 'emma.marketing@example.com',
    full_name: 'Emma Brown',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    age: 29,
    gender: 'female',
    location: 'Boston, MA',
    bio: 'Marketing strategist with a love for storytelling and brand building. Enjoy running, coffee culture, and live music. Always looking for authentic connections and meaningful conversations.',
    interests: ['Marketing', 'Storytelling', 'Running', 'Coffee', 'Music', 'Brand Building'],
    industry: 'Marketing',
    communication_style: 'Engaging and strategic',
    is_online: true,
    is_verified: true,
    membership_level: 'free',
    credits: 250,
    last_seen: new Date().toISOString()
  },
  {
    id: 'test-user-6',
    email: 'frank.creative@example.com',
    full_name: 'Frank Chen',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    age: 31,
    gender: 'male',
    location: 'Los Angeles, CA',
    bio: 'Film director and creative entrepreneur. Love storytelling, photography, and exploring new cultures through travel. Passionate about creating art that moves people.',
    interests: ['Film', 'Photography', 'Travel', 'Art', 'Entrepreneurship', 'Storytelling'],
    industry: 'Entertainment',
    communication_style: 'Creative and expressive',
    is_online: false,
    is_verified: true,
    membership_level: 'premium',
    credits: 600,
    last_seen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  },
  {
    id: 'test-user-7',
    email: 'grace.finance@example.com',
    full_name: 'Grace Lee',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    age: 27,
    gender: 'female',
    location: 'Chicago, IL',
    bio: 'Financial analyst with a passion for personal finance education. Enjoy cooking, board games, and helping others achieve their goals. Love building community and sharing knowledge.',
    interests: ['Finance', 'Education', 'Cooking', 'Board Games', 'Mentoring', 'Personal Development'],
    industry: 'Finance',
    communication_style: 'Analytical and supportive',
    is_online: true,
    is_verified: false,
    membership_level: 'free',
    credits: 180,
    last_seen: new Date().toISOString()
  },
  {
    id: 'test-user-8',
    email: 'henry.food@example.com',
    full_name: 'Henry Rodriguez',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    age: 33,
    gender: 'male',
    location: 'Miami, FL',
    bio: 'Chef and restaurant owner passionate about creating memorable dining experiences. Love music, dancing, and bringing people together. Believe food is the universal language of love.',
    interests: ['Cooking', 'Music', 'Dancing', 'Hospitality', 'Community', 'Food Culture'],
    industry: 'Food & Beverage',
    communication_style: 'Warm and engaging',
    is_online: true,
    is_verified: true,
    membership_level: 'premium',
    credits: 450,
    last_seen: new Date().toISOString()
  },
  {
    id: 'test-user-9',
    email: 'isabella.art@example.com',
    full_name: 'Isabella Martinez',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    age: 25,
    gender: 'female',
    location: 'Portland, OR',
    bio: 'Visual artist and environmental activist. Create art that raises awareness about climate change. Love hiking, painting, and connecting with nature. Always seeking inspiration and meaningful conversations.',
    interests: ['Art', 'Environmental Activism', 'Painting', 'Hiking', 'Sustainability', 'Nature'],
    industry: 'Arts',
    communication_style: 'Thoughtful and passionate',
    is_online: false,
    is_verified: true,
    membership_level: 'free',
    credits: 120,
    last_seen: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6 hours ago
  },
  {
    id: 'test-user-10',
    email: 'james.tech@example.com',
    full_name: 'James Thompson',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    age: 35,
    gender: 'male',
    location: 'Denver, CO',
    bio: 'Senior software architect and tech mentor. Love rock climbing, craft beer, and helping others grow in their careers. Passionate about clean code and building scalable systems.',
    interests: ['Software Architecture', 'Rock Climbing', 'Craft Beer', 'Mentoring', 'Technology', 'Outdoor Sports'],
    industry: 'Technology',
    communication_style: 'Direct and mentoring',
    is_online: true,
    is_verified: true,
    membership_level: 'premium',
    credits: 550,
    last_seen: new Date().toISOString()
  },
  {
    id: 'test-user-11',
    email: 'katherine.health@example.com',
    full_name: 'Katherine Park',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    age: 31,
    gender: 'female',
    location: 'Nashville, TN',
    bio: 'Nurse practitioner specializing in mental health. Love yoga, meditation, and helping people find balance. Passionate about holistic wellness and mental health advocacy.',
    interests: ['Mental Health', 'Yoga', 'Meditation', 'Wellness', 'Healthcare', 'Mindfulness'],
    industry: 'Healthcare',
    communication_style: 'Empathetic and caring',
    is_online: true,
    is_verified: true,
    membership_level: 'free',
    credits: 300,
    last_seen: new Date().toISOString()
  },
  {
    id: 'test-user-12',
    email: 'leo.entrepreneur@example.com',
    full_name: 'Leo Anderson',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    age: 29,
    gender: 'male',
    location: 'Austin, TX',
    bio: 'Serial entrepreneur and startup advisor. Love reading, playing guitar, and mentoring other founders. Always excited to connect with fellow innovators and share experiences.',
    interests: ['Entrepreneurship', 'Startups', 'Reading', 'Guitar', 'Mentoring', 'Innovation'],
    industry: 'Business',
    communication_style: 'Enthusiastic and strategic',
    is_online: true,
    is_verified: true,
    membership_level: 'premium',
    credits: 700,
    last_seen: new Date().toISOString()
  }
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
      balance: user.credits,
      total_earned: user.credits + Math.floor(Math.random() * 200),
      total_spent: Math.floor(Math.random() * 100)
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
      interests: user.interests.slice(0, 3), // Top 3 interests as preferences
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

    console.log('🎉 Successfully populated all test users!');
    console.log('📊 Test users created:', testUsers.length);
    console.log('🔗 You can now test the AI matching algorithm with these users');

  } catch (error) {
    console.error('❌ Error populating test users:', error);
  }
}

// Run the script
populateTestUsers(); 