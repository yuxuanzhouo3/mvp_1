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

-- Profiles table policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- User settings policies
CREATE POLICY "Users can view their own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Match preferences policies
CREATE POLICY "Users can view their own match preferences" ON match_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own match preferences" ON match_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own match preferences" ON match_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own match preferences" ON match_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Matches table policies
CREATE POLICY "Users can view matches they are involved in" ON matches
  FOR SELECT USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

CREATE POLICY "Users can update matches they are involved in" ON matches
  FOR UPDATE USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

CREATE POLICY "Users can insert matches they are involved in" ON matches
  FOR INSERT WITH CHECK (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

CREATE POLICY "Users can delete matches they are involved in" ON matches
  FOR DELETE USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

-- Chat rooms policies
CREATE POLICY "Users can view chat rooms they are members of" ON chat_rooms
  FOR SELECT USING (
    auth.uid() = ANY(participants)
  );

CREATE POLICY "Users can update chat rooms they are members of" ON chat_rooms
  FOR UPDATE USING (
    auth.uid() = ANY(participants)
  );

CREATE POLICY "Users can insert chat rooms they are members of" ON chat_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = ANY(participants)
  );

CREATE POLICY "Users can delete chat rooms they are members of" ON chat_rooms
  FOR DELETE USING (
    auth.uid() = ANY(participants)
  );

-- Messages policies
CREATE POLICY "Users can view messages in their chat rooms" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE id = messages.chat_room_id 
      AND auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can insert messages in their chat rooms" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE id = messages.chat_room_id 
      AND auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Payments policies
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all payments" ON payments
  FOR ALL USING (auth.role() = 'service_role');

-- User balance policies
CREATE POLICY "Users can view their own balance" ON user_balance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance" ON user_balance
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balance" ON user_balance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all balances" ON user_balance
  FOR ALL USING (auth.role() = 'service_role');

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all transactions" ON transactions
  FOR ALL USING (auth.role() = 'service_role');

-- User interests policies
CREATE POLICY "Users can view their own interests" ON user_interests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own interests" ON user_interests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interests" ON user_interests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interests" ON user_interests
  FOR DELETE USING (auth.uid() = user_id);

-- User photos policies
CREATE POLICY "Users can view their own photos" ON user_photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos" ON user_photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own photos" ON user_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" ON user_photos
  FOR DELETE USING (auth.uid() = user_id);

-- Public read policies for matching (with privacy controls)
CREATE POLICY "Public can view basic profile info for matching" ON profiles
  FOR SELECT USING (
    is_public = true AND 
    is_online = true AND
    auth.uid() != id
  );

-- Admin policies (if you have admin users)
CREATE POLICY "Admins can view all data" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_settings 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_settings 
    WHERE user_id = $1 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's match preferences
CREATE OR REPLACE FUNCTION get_user_match_preferences(user_id UUID)
RETURNS TABLE (
  min_age INTEGER,
  max_age INTEGER,
  preferred_gender TEXT[],
  location_radius INTEGER,
  interests TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.min_age,
    mp.max_age,
    mp.preferred_gender,
    mp.location_radius,
    mp.interests
  FROM match_preferences mp
  WHERE mp.user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if two users are compatible
CREATE OR REPLACE FUNCTION check_compatibility(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user1_prefs RECORD;
  user2_prefs RECORD;
  user1_profile RECORD;
  user2_profile RECORD;
BEGIN
  -- Get user preferences
  SELECT * INTO user1_prefs FROM match_preferences WHERE user_id = user1_id;
  SELECT * INTO user2_prefs FROM match_preferences WHERE user_id = user2_id;
  
  -- Get user profiles
  SELECT * INTO user1_profile FROM profiles WHERE id = user1_id;
  SELECT * INTO user2_profile FROM profiles WHERE id = user2_id;
  
  -- Check basic compatibility
  RETURN (
    -- Age compatibility
    user1_profile.age BETWEEN user2_prefs.min_age AND user2_prefs.max_age AND
    user2_profile.age BETWEEN user1_prefs.min_age AND user1_prefs.max_age AND
    
    -- Gender preference
    (user1_prefs.preferred_gender @> ARRAY[user2_profile.gender] OR user1_prefs.preferred_gender = '{}') AND
    (user2_prefs.preferred_gender @> ARRAY[user1_profile.gender] OR user2_prefs.preferred_gender = '{}') AND
    
    -- Both users are online and public
    user1_profile.is_online = true AND user2_profile.is_online = true AND
    user1_profile.is_public = true AND user2_profile.is_public = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 