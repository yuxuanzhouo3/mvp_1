-- Sync email addresses from auth.users to profiles table
-- Run this in your Supabase Dashboard > SQL Editor

-- First, ensure the email column exists in profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = email'
    ) THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
        CREATE INDEX idx_profiles_email ON profiles(email);
    END IF;
END $$;

-- Update existing profiles with email from auth.users
UPDATE profiles 
SET email = auth_users.email
FROM auth.users auth_users
WHERE profiles.id = auth_users.id 
AND profiles.email IS NULL 
AND auth_users.email IS NOT NULL;

-- Insert missing profiles for auth users who don't have profiles yet
INSERT INTO profiles (id, username, email, full_name, avatar_url, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@',1)),
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name, 'User'),
    au.raw_user_meta_data->>'avatar_url',
    au.created_at,
    au.updated_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
AND au.email IS NOT NULL;

-- Create user_settings for users who don't have them
INSERT INTO user_settings (user_id)
SELECT au.id
FROM auth.users au
LEFT JOIN user_settings us ON au.id = us.user_id
WHERE us.user_id IS NULL;

-- Create user_balance for users who don't have them
INSERT INTO user_balance (user_id)
SELECT au.id
FROM auth.users au
LEFT JOIN user_balance ub ON au.id = ub.user_id
WHERE ub.user_id IS NULL;

-- Show the results
SELECT 
   Sync completed!' as status,
    COUNT(*) as total_profiles,
    COUNT(email) as profiles_with_email
FROM profiles;

-- Show users that were synced
SELECT 
    p.id,
    p.username,
    p.email,
    p.full_name,
    p.created_at
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 10; 