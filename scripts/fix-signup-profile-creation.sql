-- Fix Sign-up Profile Creation Issue
-- This script ensures that profiles are properly created for new users
-- Run this in your Supabase Dashboard > SQL Editor

-- First, let's check the current profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Drop existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a robust handle_new_user function that works with the current schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with all available fields
  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url,
    bio,
    location,
    age,
    gender,
    interests,
    industry,
    communication_style,
    personality_traits,
    credits,
    membership_level,
    is_verified,
    is_online,
    last_seen,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    NEW.raw_user_meta_data->>'avatar_url',
    NULL, -- bio
    NULL, -- location
    NULL, -- age
    NULL, -- gender
    NULL, -- interests
    NULL, -- industry
    NULL, -- communication_style
    NULL, -- personality_traits
    100, -- default credits
    'free', -- default membership
    false, -- is_verified
    false, -- is_online
    NOW(), -- last_seen
    NOW(), -- created_at
    NOW()  -- updated_at
  );

  -- Create user settings if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') THEN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Create user balance if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_balance') THEN
    INSERT INTO public.user_balance (user_id, balance)
    VALUES (NEW.id, 100.00)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Log the user creation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activities') THEN
    INSERT INTO public.user_activities (
      user_id,
      type,
      title,
      description,
      metadata
    ) VALUES (
      NEW.id,
      'login',
      'User Account Created',
      'New user account created via registration',
      jsonb_build_object(
        'email', NEW.email,
        'provider', COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
        'created_at', NEW.created_at
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Create missing profiles for existing users who don't have them
INSERT INTO profiles (
  id,
  full_name,
  avatar_url,
  bio,
  location,
  age,
  gender,
  interests,
  industry,
  communication_style,
  personality_traits,
  credits,
  membership_level,
  is_verified,
  is_online,
  last_seen,
  created_at,
  updated_at
)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', 'User'),
  au.raw_user_meta_data->>'avatar_url',
  NULL, -- bio
  NULL, -- location
  NULL, -- age
  NULL, -- gender
  NULL, -- interests
  NULL, -- industry
  NULL, -- communication_style
  NULL, -- personality_traits
  100, -- default credits
  'free', -- default membership
  false, -- is_verified
  false, -- is_online
  NOW(), -- last_seen
  au.created_at,
  NOW() -- updated_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Create missing user_settings for existing users
INSERT INTO user_settings (user_id)
SELECT au.id
FROM auth.users au
LEFT JOIN user_settings us ON au.id = us.user_id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Create missing user_balance for existing users
INSERT INTO user_balance (user_id, balance)
SELECT au.id, 100.00
FROM auth.users au
LEFT JOIN user_balance ub ON au.id = ub.user_id
WHERE ub.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Show the results
SELECT 
  'Profile creation fix completed!' as status,
  COUNT(*) as total_users,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM user_settings) as total_user_settings,
  (SELECT COUNT(*) FROM user_balance) as total_user_balance
FROM auth.users;

-- Show recent users and their profiles
SELECT 
  au.id,
  au.email,
  au.created_at as user_created,
  p.full_name,
  p.credits,
  p.created_at as profile_created
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 10; 