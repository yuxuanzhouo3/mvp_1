-- ========================================
-- Admin User Setup Script
-- Run this in Supabase SQL Editor
-- ========================================

-- Step 1: Find user by email (replace with your email)
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Insert admin role (replace the UUID below with the user's ID from Step 1)
-- INSERT INTO public.admin_roles (user_id, role, permissions)
-- VALUES (
--   'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  -- Replace with actual user UUID
--   'super_admin',
--   '{"can_review_photos": true, "can_manage_users": true}'
-- );

-- ========================================
-- Quick Setup: Create admin for specific email
-- ========================================
-- Uncomment and modify the email below:

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = '19167441572@163.com';  -- <-- CHANGE THIS

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with the specified email';
  END IF;

  -- Insert or update admin role
  INSERT INTO public.admin_roles (user_id, role, permissions)
  VALUES (
    admin_user_id,
    'super_admin',
    '{"can_review_photos": true, "can_manage_users": true}'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'super_admin',
    permissions = '{"can_review_photos": true, "can_manage_users": true}',
    updated_at = NOW();

  RAISE NOTICE 'Admin role assigned successfully to user %', admin_user_id;
END $$;

-- ========================================
-- View existing admins
-- ========================================
SELECT ar.user_id, u.email, ar.role, ar.permissions, ar.created_at
FROM public.admin_roles ar
    JOIN auth.users u ON u.id = ar.user_id;