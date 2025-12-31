-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- PROFILES TABLE
-- ========================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  age INTEGER CHECK (age >= 18 AND age <= 100),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- USER SETTINGS TABLE
-- ========================================
CREATE TABLE user_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  privacy_level TEXT DEFAULT 'public' CHECK (privacy_level IN ('public', 'friends', 'private')),
  show_online_status BOOLEAN DEFAULT true,
  show_location BOOLEAN DEFAULT false,
  allow_messages_from TEXT DEFAULT 'all' CHECK (allow_messages_from IN ('all', 'matches', 'none')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- MATCH PREFERENCES TABLE
-- ========================================
CREATE TABLE match_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  age_min INTEGER DEFAULT 18 CHECK (age_min >= 18),
  age_max INTEGER DEFAULT 100 CHECK (age_max <= 100),
  gender_preference TEXT[] DEFAULT ARRAY['male', 'female'],
  location_radius INTEGER DEFAULT 50 CHECK (location_radius >= 1 AND location_radius <= 500),
  max_distance INTEGER DEFAULT 100 CHECK (max_distance >= 1 AND max_distance <= 1000),
  interests TEXT[],
  deal_breakers TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT age_range_check CHECK (age_min <= age_max)
);

-- ========================================
-- MATCHES TABLE
-- ========================================
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  user1_liked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user2_liked_at TIMESTAMP WITH TIME ZONE,
  user1_rejected_at TIMESTAMP WITH TIME ZONE,
  user2_rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT different_users CHECK (user1_id != user2_id),
  CONSTRAINT unique_match UNIQUE (user1_id, user2_id)
);

-- ========================================
-- CHAT ROOMS TABLE
-- ========================================
CREATE TABLE chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- MESSAGES TABLE
-- ========================================
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PAYMENTS TABLE
-- ========================================
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'CNY')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'alipay', 'usdt')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- USER BALANCE TABLE
-- ========================================
CREATE TABLE user_balance (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  balance DECIMAL(10,2) DEFAULT 0 CHECK (balance >= 0),
  total_earned DECIMAL(10,2) DEFAULT 0 CHECK (total_earned >= 0),
  total_spent DECIMAL(10,2) DEFAULT 0 CHECK (total_spent >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TRANSACTIONS TABLE
-- ========================================
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- USER INTERESTS TABLE
-- ========================================
CREATE TABLE user_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  interest TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest)
);

-- ========================================
-- USER PHOTOS TABLE
-- ========================================
CREATE TABLE user_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================

-- Profiles indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_location ON profiles(location);
CREATE INDEX idx_profiles_age ON profiles(age);
CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_is_online ON profiles(is_online);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- Matches indexes
CREATE INDEX idx_matches_user1_id ON matches(user1_id);
CREATE INDEX idx_matches_user2_id ON matches(user2_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_at ON matches(created_at);
CREATE INDEX idx_matches_user1_status ON matches(user1_id, status);
CREATE INDEX idx_matches_user2_status ON matches(user2_id, status);

-- Messages indexes
CREATE INDEX idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_is_read ON messages(is_read);

-- Payments indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- Transactions indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_type ON transactions(type);

-- User interests indexes
CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX idx_user_interests_interest ON user_interests(interest);

-- User photos indexes
CREATE INDEX idx_user_photos_user_id ON user_photos(user_id);
CREATE INDEX idx_user_photos_is_primary ON user_photos(is_primary);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_match_preferences_updated_at BEFORE UPDATE ON match_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES
-- ========================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Public profiles can be viewed by authenticated users" ON profiles
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (SELECT privacy_level FROM user_settings WHERE user_id = profiles.id) = 'public'
  );

-- User settings policies
CREATE POLICY "Users can manage their own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Match preferences policies
CREATE POLICY "Users can manage their own preferences" ON match_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Matches policies
CREATE POLICY "Users can view their own matches" ON matches
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own matches" ON matches
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert matches" ON matches
  FOR INSERT WITH CHECK (auth.uid() = user1_id);

-- Chat rooms policies
CREATE POLICY "Users can view chat rooms they're part of" ON chat_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = chat_rooms.match_id 
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert chat rooms for their matches" ON chat_rooms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches 
      WHERE matches.id = chat_rooms.match_id 
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their chat rooms" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      JOIN matches m ON cr.match_id = m.id
      WHERE cr.id = messages.chat_room_id 
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages to their chat rooms" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      JOIN matches m ON cr.match_id = m.id
      WHERE cr.id = messages.chat_room_id 
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Payments policies
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" ON payments
  FOR UPDATE USING (auth.uid() = user_id);

-- User balance policies
CREATE POLICY "Users can view their own balance" ON user_balance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance" ON user_balance
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balance" ON user_balance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User interests policies
CREATE POLICY "Users can manage their own interests" ON user_interests
  FOR ALL USING (auth.uid() = user_id);

-- User photos policies
CREATE POLICY "Users can manage their own photos" ON user_photos
  FOR ALL USING (auth.uid() = user_id);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', NEW.email);
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_balance (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user online status
CREATE OR REPLACE FUNCTION public.update_user_online_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET is_online = true, last_seen = NOW()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle match creation
CREATE OR REPLACE FUNCTION public.create_match(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  match_id UUID;
BEGIN
  -- Check if match already exists
  IF EXISTS (SELECT 1 FROM matches WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)) THEN
    RAISE EXCEPTION 'Match already exists';
  END IF;
  
  -- Create match
  INSERT INTO matches (user1_id, user2_id)
  VALUES ($1, $2)
  RETURNING id INTO match_id;
  
  -- Create chat room
  INSERT INTO chat_rooms (match_id)
  VALUES (match_id);
  
  RETURN match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle payment completion
CREATE OR REPLACE FUNCTION public.handle_payment_completion(payment_id UUID)
RETURNS VOID AS $$
DECLARE
  payment_record RECORD;
  current_balance DECIMAL(10,2);
BEGIN
  -- Get payment details
  SELECT * INTO payment_record FROM payments WHERE id = payment_id;
  
  -- Get current balance
  SELECT balance INTO current_balance FROM user_balance WHERE user_id = payment_record.user_id;
  
  -- Update balance
  UPDATE user_balance 
  SET balance = current_balance + payment_record.amount,
      total_earned = total_earned + payment_record.amount,
      updated_at = NOW()
  WHERE user_id = payment_record.user_id;
  
  -- Create transaction record
  INSERT INTO transactions (user_id, payment_id, type, amount, description, balance_before, balance_after)
  VALUES (
    payment_record.user_id,
    payment_id,
    'credit',
    payment_record.amount,
    'Payment received',
    current_balance,
    current_balance + payment_record.amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
