-- ========================================
-- Profile Setup Schema Migration
-- Based on PersonaLink PRD v1.0
-- ========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for location support if not already enabled
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ========================================
-- ENUM TYPES
-- ========================================

-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verify_level_enum AS ENUM ('none', 'basic', 'advanced', 'premium');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE swipe_action_enum AS ENUM ('pass', 'like', 'super_like');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE algo_type_enum AS ENUM ('compatible', 'romantic', 'pragmatic', 'serendipity');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ========================================
-- USERS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  gender gender_enum,
  birth_date DATE,
  avatar_url TEXT,
  account_status VARCHAR(20) DEFAULT 'active',
  verification_level verify_level_enum DEFAULT 'none',
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- USER PROFILES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  real_name VARCHAR(100),
  
  -- Physical attributes
  height_cm INTEGER CHECK (height_cm IS NULL OR (height_cm >= 100 AND height_cm <= 250)),
  weight_kg INTEGER CHECK (weight_kg IS NULL OR (weight_kg >= 30 AND weight_kg <= 200)),
  -- BMI is auto-calculated
  bmi DECIMAL(4,1) GENERATED ALWAYS AS (
    CASE WHEN height_cm > 0 AND weight_kg > 0 
         THEN weight_kg::DECIMAL / ((height_cm::DECIMAL / 100) ^ 2) 
         ELSE NULL 
    END
  ) STORED,
  
  -- Social attributes
  education_level VARCHAR(50),
  occupation VARCHAR(100),
  company_type VARCHAR(50),
  annual_income_range VARCHAR(50),
  
  -- Relationship attributes
  marital_status VARCHAR(20) DEFAULT 'single',
  relationship_history_count INTEGER DEFAULT 0,
  children_preference VARCHAR(20),
  mbti VARCHAR(4),
  bio TEXT CHECK (bio IS NULL OR LENGTH(bio) <= 500),
  
  -- Location (PostGIS)
  location GEOGRAPHY(POINT, 4326),
  city_name VARCHAR(100),
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- USER VERIFICATIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.user_verifications (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  phone_verified BOOLEAN DEFAULT false,
  id_card_verified BOOLEAN DEFAULT false,
  education_verified BOOLEAN DEFAULT false,
  income_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- USER PHOTOS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.user_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  ai_scores JSONB DEFAULT '{}',
  audit_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INTERESTS TABLE (System reference)
-- ========================================

CREATE TABLE IF NOT EXISTS public.interests (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50),
  name VARCHAR(50) UNIQUE NOT NULL,
  icon_url TEXT
);

-- ========================================
-- USER-INTERESTS MAPPING TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.users_interests_map (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  interest_id INTEGER REFERENCES public.interests(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, interest_id)
);

-- ========================================
-- INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_gender ON public.users(gender);
CREATE INDEX IF NOT EXISTS idx_users_birth_date ON public.users(birth_date);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users(account_status);

CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON public.user_profiles(city_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_education ON public.user_profiles(education_level);
CREATE INDEX IF NOT EXISTS idx_user_profiles_income ON public.user_profiles(annual_income_range);
CREATE INDEX IF NOT EXISTS idx_user_profiles_marital ON public.user_profiles(marital_status);

CREATE INDEX IF NOT EXISTS idx_user_photos_user_id ON public.user_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_photos_primary ON public.user_photos(is_primary);

CREATE INDEX IF NOT EXISTS idx_interests_category ON public.interests(category);
CREATE INDEX IF NOT EXISTS idx_users_interests_user ON public.users_interests_map(user_id);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_interests_map ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Public profiles viewable" ON public.users;
CREATE POLICY "Public profiles viewable" ON public.users
  FOR SELECT USING (account_status = 'active');

-- User profiles policies
DROP POLICY IF EXISTS "Users can view profiles" ON public.user_profiles;
CREATE POLICY "Users can view profiles" ON public.user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User photos policies
DROP POLICY IF EXISTS "Anyone can view photos" ON public.user_photos;
CREATE POLICY "Anyone can view photos" ON public.user_photos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own photos" ON public.user_photos;
CREATE POLICY "Users can manage own photos" ON public.user_photos
  FOR ALL USING (auth.uid() = user_id);

-- Interests policies (public read)
DROP POLICY IF EXISTS "Interests are public" ON public.interests;
CREATE POLICY "Interests are public" ON public.interests
  FOR SELECT USING (true);

-- User interests policies
DROP POLICY IF EXISTS "Users can view interests" ON public.users_interests_map;
CREATE POLICY "Users can view interests" ON public.users_interests_map
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own interests" ON public.users_interests_map;
CREATE POLICY "Users can manage own interests" ON public.users_interests_map
  FOR ALL USING (auth.uid() = user_id);

-- ========================================
-- TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON public.user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- FUNCTION: Create user records on signup
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert into user_profiles table
  INSERT INTO public.user_profiles (user_id, updated_at)
  VALUES (NEW.id, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert into user_verifications table
  INSERT INTO public.user_verifications (user_id, updated_at)
  VALUES (NEW.id, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- SEED INTERESTS DATA
-- ========================================

INSERT INTO public.interests (category, name, icon_url) VALUES
  -- Sports & Fitness
  ('Sports & Fitness', 'Running', '🏃'),
  ('Sports & Fitness', 'Gym', '💪'),
  ('Sports & Fitness', 'Yoga', '🧘'),
  ('Sports & Fitness', 'Swimming', '🏊'),
  ('Sports & Fitness', 'Hiking', '🥾'),
  ('Sports & Fitness', 'Cycling', '🚴'),
  ('Sports & Fitness', 'Tennis', '🎾'),
  ('Sports & Fitness', 'Basketball', '🏀'),
  
  -- Arts & Culture
  ('Arts & Culture', 'Photography', '📸'),
  ('Arts & Culture', 'Painting', '🎨'),
  ('Arts & Culture', 'Music', '🎵'),
  ('Arts & Culture', 'Movies', '🎬'),
  ('Arts & Culture', 'Theater', '🎭'),
  ('Arts & Culture', 'Museums', '🏛️'),
  ('Arts & Culture', 'Dancing', '💃'),
  ('Arts & Culture', 'Writing', '✍️'),
  
  -- Food & Drinks
  ('Food & Drinks', 'Cooking', '👨‍🍳'),
  ('Food & Drinks', 'Wine', '🍷'),
  ('Food & Drinks', 'Coffee', '☕'),
  ('Food & Drinks', 'Foodie', '🍽️'),
  ('Food & Drinks', 'Baking', '🧁'),
  ('Food & Drinks', 'Brunch', '🥞'),
  ('Food & Drinks', 'Cocktails', '🍸'),
  ('Food & Drinks', 'BBQ', '🍖'),
  
  -- Travel & Adventure
  ('Travel & Adventure', 'Travel', '✈️'),
  ('Travel & Adventure', 'Camping', '⛺'),
  ('Travel & Adventure', 'Road Trips', '🚗'),
  ('Travel & Adventure', 'Beach', '🏖️'),
  ('Travel & Adventure', 'Mountains', '⛰️'),
  ('Travel & Adventure', 'City Explorer', '🌆'),
  ('Travel & Adventure', 'Backpacking', '🎒'),
  
  -- Entertainment
  ('Entertainment', 'Gaming', '🎮'),
  ('Entertainment', 'Netflix', '📺'),
  ('Entertainment', 'Anime', '🎌'),
  ('Entertainment', 'Board Games', '🎲'),
  ('Entertainment', 'Karaoke', '🎤'),
  ('Entertainment', 'Concerts', '🎸'),
  ('Entertainment', 'Comedy', '😂'),
  
  -- Lifestyle
  ('Lifestyle', 'Reading', '📚'),
  ('Lifestyle', 'Meditation', '🧘‍♂️'),
  ('Lifestyle', 'Pets', '🐕'),
  ('Lifestyle', 'Gardening', '🌱'),
  ('Lifestyle', 'Fashion', '👗'),
  ('Lifestyle', 'DIY', '🔨'),
  ('Lifestyle', 'Volunteering', '🤝'),
  
  -- Tech & Science
  ('Tech & Science', 'Programming', '💻'),
  ('Tech & Science', 'Startups', '🚀'),
  ('Tech & Science', 'Crypto', '₿'),
  ('Tech & Science', 'AI', '🤖'),
  ('Tech & Science', 'Science', '🔬'),
  ('Tech & Science', 'Space', '🌌'),
  ('Tech & Science', 'Gadgets', '📱')
ON CONFLICT (name) DO NOTHING;

