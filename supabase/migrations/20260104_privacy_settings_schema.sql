-- ========================================
-- Privacy Settings Schema Migration
-- Task 18: Database Schema Extension
-- ========================================

-- ========================================
-- TASK 18.1: Extend user_profiles table
-- ========================================

-- Add privacy_settings JSONB field
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "show_income": true,
  "show_exact_location": false,
  "show_online_status": true,
  "show_last_active": true,
  "allow_messages_from": "matches",
  "show_profile_to": "everyone"
}'::jsonb;

-- Add search_preferences JSONB field
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS search_preferences JSONB DEFAULT '{
  "search_radius_km": 50,
  "age_range_min": 18,
  "age_range_max": 60,
  "height_range_min": 140,
  "height_range_max": 220,
  "education_requirement": "any",
  "income_requirement": "any"
}'::jsonb;

-- Add notification_settings JSONB field
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "new_match": true,
  "new_message": true,
  "system_notifications": true,
  "push_channel": "all",
  "email_notifications": true,
  "weekly_digest": false
}'::jsonb;

-- ========================================
-- Create indexes for better query performance
-- ========================================

-- GIN index for privacy_settings JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_privacy_settings
ON public.user_profiles USING GIN (privacy_settings);

-- GIN index for search_preferences JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_search_preferences
ON public.user_profiles USING GIN (search_preferences);

-- GIN index for notification_settings JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_notification_settings
ON public.user_profiles USING GIN (notification_settings);

-- Partial index for users who show exact location (for location-based matching)
CREATE INDEX IF NOT EXISTS idx_user_profiles_show_location
ON public.user_profiles ((privacy_settings->>'show_exact_location'))
WHERE privacy_settings->>'show_exact_location' = 'true';

-- ========================================
-- TASK 18.2: Create default value functions and triggers
-- ========================================

-- Default privacy settings constant
CREATE OR REPLACE FUNCTION get_default_privacy_settings()
RETURNS JSONB AS $$
BEGIN
  RETURN '{
    "show_income": true,
    "show_exact_location": false,
    "show_online_status": true,
    "show_last_active": true,
    "allow_messages_from": "matches",
    "show_profile_to": "everyone"
  }'::jsonb;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Default search preferences constant (default radius 50km)
CREATE OR REPLACE FUNCTION get_default_search_preferences()
RETURNS JSONB AS $$
BEGIN
  RETURN '{
    "search_radius_km": 50,
    "age_range_min": 18,
    "age_range_max": 60,
    "height_range_min": 140,
    "height_range_max": 220,
    "education_requirement": "any",
    "income_requirement": "any"
  }'::jsonb;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Default notification settings constant
CREATE OR REPLACE FUNCTION get_default_notification_settings()
RETURNS JSONB AS $$
BEGIN
  RETURN '{
    "new_match": true,
    "new_message": true,
    "system_notifications": true,
    "push_channel": "all",
    "email_notifications": true,
    "weekly_digest": false
  }'::jsonb;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to set default privacy settings for new users
CREATE OR REPLACE FUNCTION set_default_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default privacy_settings if not provided
  IF NEW.privacy_settings IS NULL THEN
    NEW.privacy_settings := get_default_privacy_settings();
  END IF;

  -- Set default search_preferences if not provided
  IF NEW.search_preferences IS NULL THEN
    NEW.search_preferences := get_default_search_preferences();
  END IF;

  -- Set default notification_settings if not provided
  IF NEW.notification_settings IS NULL THEN
    NEW.notification_settings := get_default_notification_settings();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user profile inserts
DROP TRIGGER IF EXISTS set_default_privacy_settings_trigger ON public.user_profiles;
CREATE TRIGGER set_default_privacy_settings_trigger
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_default_privacy_settings();

-- ========================================
-- Update existing records with default values
-- ========================================

UPDATE public.user_profiles
SET privacy_settings = get_default_privacy_settings()
WHERE privacy_settings IS NULL;

UPDATE public.user_profiles
SET search_preferences = get_default_search_preferences()
WHERE search_preferences IS NULL;

UPDATE public.user_profiles
SET notification_settings = get_default_notification_settings()
WHERE notification_settings IS NULL;

-- ========================================
-- Validation functions for settings
-- ========================================

-- Validate search preferences
CREATE OR REPLACE FUNCTION validate_search_preferences(prefs JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  radius_km INTEGER;
  age_min INTEGER;
  age_max INTEGER;
  height_min INTEGER;
  height_max INTEGER;
BEGIN
  -- Extract values
  radius_km := (prefs->>'search_radius_km')::INTEGER;
  age_min := (prefs->>'age_range_min')::INTEGER;
  age_max := (prefs->>'age_range_max')::INTEGER;
  height_min := (prefs->>'height_range_min')::INTEGER;
  height_max := (prefs->>'height_range_max')::INTEGER;

  -- Validate radius (5-200km)
  IF radius_km IS NOT NULL AND (radius_km < 5 OR radius_km > 200) THEN
    RETURN FALSE;
  END IF;

  -- Validate age range (min < max, both between 18-100)
  IF age_min IS NOT NULL AND age_max IS NOT NULL THEN
    IF age_min > age_max OR age_min < 18 OR age_max > 100 THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Validate height range (min < max, both between 100-250)
  IF height_min IS NOT NULL AND height_max IS NOT NULL THEN
    IF height_min > height_max OR height_min < 100 OR height_max > 250 THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add check constraint for search_preferences validation
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS check_search_preferences_valid;

ALTER TABLE public.user_profiles
ADD CONSTRAINT check_search_preferences_valid
CHECK (search_preferences IS NULL OR validate_search_preferences(search_preferences));

-- ========================================
-- Comments for documentation
-- ========================================

COMMENT ON COLUMN public.user_profiles.privacy_settings IS
'JSONB field storing user privacy preferences:
- show_income: boolean - whether to show income to other users
- show_exact_location: boolean - show exact location or just city name
- show_online_status: boolean - show online status to others
- show_last_active: boolean - show last active time
- allow_messages_from: "everyone"|"matches"|"none" - who can send messages
- show_profile_to: "everyone"|"matches"|"none" - profile visibility';

COMMENT ON COLUMN public.user_profiles.search_preferences IS
'JSONB field storing user matching preferences:
- search_radius_km: integer (5-200) - search radius in kilometers, default 50
- age_range_min: integer (18-100) - minimum age preference
- age_range_max: integer (18-100) - maximum age preference
- height_range_min: integer (100-250) - minimum height in cm
- height_range_max: integer (100-250) - maximum height in cm
- education_requirement: string - minimum education level or "any"
- income_requirement: string - minimum income range or "any"';

COMMENT ON COLUMN public.user_profiles.notification_settings IS
'JSONB field storing notification preferences:
- new_match: boolean - notify on new matches
- new_message: boolean - notify on new messages
- system_notifications: boolean - receive system notifications
- push_channel: "all"|"app"|"web"|"none" - push notification channels
- email_notifications: boolean - receive email notifications
- weekly_digest: boolean - receive weekly digest emails';
