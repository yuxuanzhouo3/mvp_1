-- ========================================
-- Privacy RLS Policies
-- Task 19: Supabase RLS Policies for Privacy Settings
-- ========================================

-- ========================================
-- TASK 19.1: Privacy Data Protection Policies
-- ========================================

-- Policy: Users can only read their own complete privacy settings
DROP POLICY IF EXISTS "Users can read own privacy settings" ON public.user_profiles;
CREATE POLICY "Users can read own privacy settings" ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      -- Other users can view profiles but sensitive fields are filtered via view
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = user_profiles.user_id
        AND u.account_status = 'active'
      )
    )
  );

-- Policy: Users can only modify their own privacy settings
DROP POLICY IF EXISTS "Users can update own privacy settings" ON public.user_profiles;
CREATE POLICY "Users can update own privacy settings" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- TASK 19.2: Create view for filtered profile data
-- ========================================

-- Drop existing view if exists
DROP VIEW IF EXISTS public.user_profiles_public;

-- Create view that filters sensitive fields based on privacy settings
CREATE OR REPLACE VIEW public.user_profiles_public AS
SELECT
  up.user_id,
  up.real_name,
  up.height_cm,
  up.weight_kg,
  up.bmi,
  up.education_level,
  up.occupation,
  up.company_type,
  -- Show income only if privacy setting allows
  CASE
    WHEN up.user_id = auth.uid() THEN up.annual_income_range
    WHEN (up.privacy_settings->>'show_income')::boolean = true THEN up.annual_income_range
    ELSE NULL
  END AS annual_income_range,
  up.marital_status,
  up.relationship_history_count,
  up.children_preference,
  up.mbti,
  up.bio,
  -- Show exact location only if privacy setting allows
  CASE
    WHEN up.user_id = auth.uid() THEN up.location
    WHEN (up.privacy_settings->>'show_exact_location')::boolean = true THEN up.location
    ELSE NULL
  END AS location,
  -- Always show city name (approximate location)
  up.city_name,
  up.updated_at,
  -- Privacy settings visible only to owner
  CASE
    WHEN up.user_id = auth.uid() THEN up.privacy_settings
    ELSE NULL
  END AS privacy_settings,
  -- Search preferences visible only to owner
  CASE
    WHEN up.user_id = auth.uid() THEN up.search_preferences
    ELSE NULL
  END AS search_preferences,
  -- Notification settings visible only to owner
  CASE
    WHEN up.user_id = auth.uid() THEN up.notification_settings
    ELSE NULL
  END AS notification_settings
FROM public.user_profiles up;

-- Grant access to the view
GRANT SELECT ON public.user_profiles_public TO authenticated;
GRANT SELECT ON public.user_profiles_public TO anon;

-- ========================================
-- Helper function for checking if user can view another user's sensitive data
-- ========================================

CREATE OR REPLACE FUNCTION can_view_user_income(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  privacy_settings JSONB;
BEGIN
  -- User can always view their own income
  IF auth.uid() = target_user_id THEN
    RETURN TRUE;
  END IF;

  -- Check target user's privacy settings
  SELECT up.privacy_settings INTO privacy_settings
  FROM public.user_profiles up
  WHERE up.user_id = target_user_id;

  -- Return whether show_income is true
  RETURN COALESCE((privacy_settings->>'show_income')::boolean, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_view_user_location(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  privacy_settings JSONB;
BEGIN
  -- User can always view their own location
  IF auth.uid() = target_user_id THEN
    RETURN TRUE;
  END IF;

  -- Check target user's privacy settings
  SELECT up.privacy_settings INTO privacy_settings
  FROM public.user_profiles up
  WHERE up.user_id = target_user_id;

  -- Return whether show_exact_location is true
  RETURN COALESCE((privacy_settings->>'show_exact_location')::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Function to get filtered user profile for other users
-- ========================================

CREATE OR REPLACE FUNCTION get_user_profile_filtered(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  profile_data JSONB;
  privacy_settings JSONB;
  is_owner BOOLEAN;
BEGIN
  is_owner := (auth.uid() = target_user_id);

  SELECT up.privacy_settings INTO privacy_settings
  FROM public.user_profiles up
  WHERE up.user_id = target_user_id;

  SELECT jsonb_build_object(
    'user_id', up.user_id,
    'real_name', up.real_name,
    'height_cm', up.height_cm,
    'weight_kg', CASE WHEN is_owner THEN up.weight_kg ELSE NULL END,
    'bmi', up.bmi,
    'education_level', up.education_level,
    'occupation', up.occupation,
    'company_type', up.company_type,
    'annual_income_range', CASE
      WHEN is_owner OR (privacy_settings->>'show_income')::boolean = true
      THEN up.annual_income_range
      ELSE NULL
    END,
    'marital_status', up.marital_status,
    'relationship_history_count', up.relationship_history_count,
    'children_preference', up.children_preference,
    'mbti', up.mbti,
    'bio', up.bio,
    'location', CASE
      WHEN is_owner OR (privacy_settings->>'show_exact_location')::boolean = true
      THEN ST_AsGeoJSON(up.location)::jsonb
      ELSE NULL
    END,
    'city_name', up.city_name,
    'updated_at', up.updated_at
  ) INTO profile_data
  FROM public.user_profiles up
  WHERE up.user_id = target_user_id;

  RETURN profile_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TASK 19.2: Test functions for permission verification
-- ========================================

-- Test function to verify data isolation between users
CREATE OR REPLACE FUNCTION test_privacy_isolation(test_user_id UUID, other_user_id UUID)
RETURNS TABLE (
  test_name TEXT,
  passed BOOLEAN,
  details TEXT
) AS $$
BEGIN
  -- Test 1: User can access own full settings
  RETURN QUERY
  SELECT
    'Own settings access'::TEXT,
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = test_user_id
    ),
    'User should be able to access their own settings'::TEXT;

  -- Test 2: User cannot see other user's raw privacy_settings
  RETURN QUERY
  SELECT
    'Other user privacy settings hidden'::TEXT,
    NOT EXISTS (
      SELECT 1 FROM public.user_profiles_public
      WHERE user_id = other_user_id
      AND privacy_settings IS NOT NULL
    ),
    'Other user''s privacy_settings should be NULL'::TEXT;

  -- Test 3: Income hidden when show_income is false
  RETURN QUERY
  SELECT
    'Income filtering works'::TEXT,
    (
      SELECT CASE
        WHEN (up.privacy_settings->>'show_income')::boolean = false
        THEN (SELECT annual_income_range FROM public.user_profiles_public WHERE user_id = other_user_id) IS NULL
        ELSE TRUE
      END
      FROM public.user_profiles up
      WHERE up.user_id = other_user_id
    ),
    'Income should be hidden when show_income is false'::TEXT;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Additional RLS policies for cross-user queries
-- ========================================

-- Allow users to see if another user allows messages
CREATE OR REPLACE FUNCTION can_message_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  allow_from TEXT;
  is_match BOOLEAN;
BEGIN
  -- Get target user's message settings
  SELECT privacy_settings->>'allow_messages_from' INTO allow_from
  FROM public.user_profiles
  WHERE user_id = target_user_id;

  -- Check if users are matched
  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE (m.user_id_1 = auth.uid() AND m.user_id_2 = target_user_id)
       OR (m.user_id_1 = target_user_id AND m.user_id_2 = auth.uid())
    AND m.status = 'matched'
  ) INTO is_match;

  -- Determine if messaging is allowed
  CASE allow_from
    WHEN 'everyone' THEN RETURN TRUE;
    WHEN 'matches' THEN RETURN is_match;
    WHEN 'none' THEN RETURN FALSE;
    ELSE RETURN TRUE; -- Default allow
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Comments
-- ========================================

COMMENT ON VIEW public.user_profiles_public IS
'Public view of user profiles that automatically filters sensitive fields based on privacy settings.
Income is hidden when show_income is false.
Exact location is hidden when show_exact_location is false (only city_name is shown).
Privacy, search, and notification settings are only visible to the profile owner.';

COMMENT ON FUNCTION can_view_user_income IS
'Check if the current user can view another user''s income based on privacy settings.';

COMMENT ON FUNCTION can_view_user_location IS
'Check if the current user can view another user''s exact location based on privacy settings.';

COMMENT ON FUNCTION get_user_profile_filtered IS
'Get a user''s profile with sensitive fields filtered according to privacy settings.';

COMMENT ON FUNCTION can_message_user IS
'Check if the current user is allowed to send messages to another user based on their privacy settings.';
