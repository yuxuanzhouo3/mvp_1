-- PersonaLink Database Setup Script
-- Run this in your Supabase Dashboard > SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create user profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    age INTEGER CHECK (age >= 18 AND age <= 100),
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    interests TEXT[],
    industry TEXT,
    communication_style TEXT CHECK (communication_style IN ('introvert', 'extrovert', 'ambivert')),
    personality_traits TEXT[],
    credits INTEGER DEFAULT 100,
    membership_level TEXT DEFAULT 'free' CHECK (membership_level IN ('free', 'premium', 'vip')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    match_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
    reasons TEXT[],
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, match_id)
);

-- Create user likes table
CREATE TABLE IF NOT EXISTS user_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    liked_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT CHECK (action IN ('like', 'pass', 'super_like')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, liked_user_id)
);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    participants UUID[] NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'audio', 'video')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('purchase', 'refund', 'bonus', 'consumption')),
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'credits',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method TEXT,
    reference TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user activities table
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('login', 'logout', 'profile_update', 'match', 'message', 'payment')),
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON profiles USING GIN(interests);
CREATE INDEX IF NOT EXISTS idx_profiles_personality_traits ON profiles USING GIN(personality_traits);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_match_id ON matches(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_score ON matches(score);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);

CREATE INDEX IF NOT EXISTS idx_user_likes_user_id ON user_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_liked_user_id ON user_likes(liked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_action ON user_likes(action);
CREATE INDEX IF NOT EXISTS idx_user_likes_created_at ON user_likes(created_at);

CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_chats_last_message_at ON chats(last_message_at);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update timestamp triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Matches policies
CREATE POLICY "Users can view their own matches" ON matches
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = match_id);

CREATE POLICY "Users can create matches" ON matches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own matches" ON matches
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = match_id);

-- User likes policies
CREATE POLICY "Users can view their own likes" ON user_likes
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = liked_user_id);

CREATE POLICY "Users can create likes" ON user_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chats policies
CREATE POLICY "Users can view chats they participate in" ON chats
    FOR SELECT USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can create chats" ON chats
    FOR INSERT WITH CHECK (auth.uid() = ANY(participants));

CREATE POLICY "Users can update chats they participate in" ON chats
    FOR UPDATE USING (auth.uid() = ANY(participants));

-- Messages policies
CREATE POLICY "Users can view messages in their chats" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chats 
            WHERE id = messages.chat_id 
            AND auth.uid() = ANY(participants)
        )
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User activities policies
CREATE POLICY "Users can view their own activities" ON user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create activities" ON user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert some sample data for testing
INSERT INTO system_settings (key, value, description) VALUES
('app_version', '"1.0.0"', 'Current app version'),
('maintenance_mode', 'false', 'Maintenance mode flag'),
('max_credits_per_user', '1000', 'Maximum credits a user can have')
ON CONFLICT (key) DO NOTHING;

-- Create a function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Set up future permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;

-- Success message
SELECT 'Database setup completed successfully! 🎉' as status; 