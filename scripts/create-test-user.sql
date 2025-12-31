-- Create a test user in your real Supabase database
-- Run this in your Supabase Dashboard > SQL Editor

-- Note: This creates a profile, but you'll still need to create an auth user
-- The proper way is to register through the app interface

INSERT INTO profiles (
    id,
    full_name,
    bio,
    location,
    age,
    gender,
    interests,
    industry,
    communication_style,
    credits,
    membership_level,
    is_verified,
    is_online
) VALUES (
    gen_random_uuid(), -- Generate a random UUID
    'Test User',
    'This is a test user for development purposes',
    'San Francisco, CA',
    25,
    'other',
    'Technology, Music, Travel',
    'Technology',
    'ambivert',
    100,
    'free',
    true,
    false
) ON CONFLICT DO NOTHING;

-- Insert a test activity
INSERT INTO user_activities (
    user_id,
    type,
    title,
    description
) VALUES (
    (SELECT id FROM profiles WHERE email = 'test@personalink.ai' LIMIT 1),
    'login',
    'Test User Created',
    'Test user created for development purposes'
);

-- Success message
SELECT 'Test user created successfully! 🎉' as status; 