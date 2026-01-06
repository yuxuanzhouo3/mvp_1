ALTER TABLE user_profiles
ADD COLUMN is_profile_complete BOOLEAN;

UPDATE user_profiles 
SET is_profile_complete = true 
WHERE is_profile_complete IS NULL OR is_profile_complete = false;