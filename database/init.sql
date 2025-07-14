-- PersonaLink 数据库初始化脚本
-- 创建所有必要的表和函数

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建用户资料表
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

-- 创建匹配记录表
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

-- 创建用户互动表
CREATE TABLE IF NOT EXISTS user_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    liked_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT CHECK (action IN ('like', 'pass', 'super_like')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, liked_user_id)
);

-- 创建聊天会话表
CREATE TABLE IF NOT EXISTS chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    participants UUID[] NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建消息表
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

-- 创建交易记录表
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

-- 创建用户活动表
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('login', 'logout', 'profile_update', 'match', 'message', 'payment')),
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
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

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为相关表添加更新时间触发器
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建用户统计函数
CREATE OR REPLACE FUNCTION get_user_stats(user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_matches', (SELECT COUNT(*) FROM matches WHERE user_id = $1 AND status = 'accepted'),
        'total_likes', (SELECT COUNT(*) FROM user_likes WHERE user_id = $1 AND action = 'like'),
        'total_messages', (SELECT COUNT(*) FROM messages WHERE sender_id = $1),
        'total_transactions', (SELECT COUNT(*) FROM transactions WHERE user_id = $1),
        'credits_balance', (SELECT credits FROM profiles WHERE id = $1),
        'last_activity', (SELECT last_seen FROM profiles WHERE id = $1)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 创建匹配推荐函数
CREATE OR REPLACE FUNCTION get_match_recommendations(user_id UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    avatar_url TEXT,
    age INTEGER,
    location TEXT,
    bio TEXT,
    compatibility DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.avatar_url,
        p.age,
        p.location,
        p.bio,
        -- 简单的兼容性计算（实际应用中会更复杂）
        CASE 
            WHEN p.location = (SELECT location FROM profiles WHERE id = $1) THEN 20
            ELSE 10
        END +
        CASE 
            WHEN array_length(array(
                SELECT unnest(p.interests) INTERSECT SELECT unnest((SELECT interests FROM profiles WHERE id = $1))
            ), 1) > 0 THEN 30
            ELSE 0
        END +
        CASE 
            WHEN p.communication_style = (SELECT communication_style FROM profiles WHERE id = $1) THEN 20
            ELSE 10
        END +
        CASE 
            WHEN p.industry = (SELECT industry FROM profiles WHERE id = $1) THEN 20
            ELSE 0
        END AS compatibility
    FROM profiles p
    WHERE p.id != $1
    AND p.id NOT IN (SELECT match_id FROM matches WHERE user_id = $1)
    AND p.id NOT IN (SELECT liked_user_id FROM user_likes WHERE user_id = $1)
    AND p.is_verified = true
    ORDER BY compatibility DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 创建聊天统计函数
CREATE OR REPLACE FUNCTION get_chat_stats(user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_chats', (
            SELECT COUNT(*) FROM chats 
            WHERE $1 = ANY(participants)
        ),
        'unread_messages', (
            SELECT COUNT(*) FROM messages m
            JOIN chats c ON m.chat_id = c.id
            WHERE $1 = ANY(c.participants)
            AND m.sender_id != $1
            AND m.status != 'read'
        ),
        'active_chats', (
            SELECT COUNT(*) FROM chats 
            WHERE $1 = ANY(participants)
            AND last_message_at > NOW() - INTERVAL '7 days'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 插入默认系统设置
INSERT INTO system_settings (key, value, description) VALUES
('app_name', '"PersonaLink"', '应用名称'),
('app_version', '"1.0.0"', '应用版本'),
('default_credits', '100', '新用户默认积分'),
('daily_bonus_credits', '10', '每日奖励积分'),
('match_score_threshold', '70', '匹配分数阈值'),
('max_daily_matches', '50', '每日最大匹配数'),
('chat_message_limit', '1000', '聊天消息长度限制'),
('payment_methods', '["stripe", "alipay", "usdt"]', '支持的支付方式')
ON CONFLICT (key) DO NOTHING;

-- 启用 Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
-- 用户资料策略
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view other verified profiles" ON profiles
    FOR SELECT USING (is_verified = true);

-- 匹配策略
CREATE POLICY "Users can view their own matches" ON matches
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = match_id);

CREATE POLICY "Users can create matches" ON matches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own matches" ON matches
    FOR UPDATE USING (auth.uid() = user_id);

-- 用户互动策略
CREATE POLICY "Users can view their own likes" ON user_likes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create likes" ON user_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 聊天策略
CREATE POLICY "Users can view their chats" ON chats
    FOR SELECT USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can create chats" ON chats
    FOR INSERT WITH CHECK (auth.uid() = ANY(participants));

-- 消息策略
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

-- 交易策略
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户活动策略
CREATE POLICY "Users can view their own activities" ON user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create activities" ON user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 系统设置策略（只读）
CREATE POLICY "Anyone can view system settings" ON system_settings
    FOR SELECT USING (true);

-- 创建函数来更新用户最后在线时间
CREATE OR REPLACE FUNCTION update_user_online_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE profiles 
        SET last_seen = NOW(), 
            is_online = true 
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为用户活动表添加触发器
CREATE TRIGGER update_user_online_status_trigger
    AFTER INSERT OR UPDATE ON user_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_user_online_status();

-- 创建函数来清理过期数据
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- 清理过期的匹配记录（30天前）
    DELETE FROM matches 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND status = 'pending';
    
    -- 清理过期的用户活动（90天前）
    DELETE FROM user_activities 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- 更新用户在线状态（5分钟未活动设为离线）
    UPDATE profiles 
    SET is_online = false 
    WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- 创建定时任务（需要 pg_cron 扩展）
-- SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data();');

-- 提交事务
COMMIT; 