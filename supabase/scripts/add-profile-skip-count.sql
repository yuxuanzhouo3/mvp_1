ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS profile_skip_count INTEGER DEFAULT 0;
