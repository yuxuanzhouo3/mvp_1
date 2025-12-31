-- Clean setup for user sessions and login tracking
-- This script will drop existing tables/policies and recreate them
-- Run this in your Supabase Dashboard > SQL Editor

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS log_user_login(UUID, TEXT, INET, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS log_user_logout(UUID, TEXT);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can view their own login history" ON user_login_history;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_login_history;
DROP TABLE IF EXISTS user_sessions;

-- Create user_sessions table
CREATE TABLE user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
    browser TEXT,
    os TEXT,
    location TEXT,
    login_method TEXT CHECK (login_method IN ('email', 'google', 'phone', 'magic_link')),
    login_status TEXT DEFAULT 'success' CHECK (login_status IN ('success', 'failed', 'blocked')),
    failure_reason TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_login_history table
CREATE TABLE user_login_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
    browser TEXT,
    os TEXT,
    location TEXT,
    login_method TEXT CHECK (login_method IN ('email', 'google', 'phone', 'magic_link')),
    login_status TEXT DEFAULT 'success' CHECK (login_status IN ('success', 'failed', 'blocked')),
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_login_history_user_id ON user_login_history(user_id);
CREATE INDEX idx_user_login_history_created_at ON user_login_history(created_at);

-- Enable Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own login history" ON user_login_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own login history" ON user_login_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to log user login
CREATE OR REPLACE FUNCTION log_user_login(
    p_user_id UUID,
    p_session_id TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT 'unknown',
    p_browser TEXT DEFAULT NULL,
    p_os TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_login_method TEXT DEFAULT 'email',
    p_login_status TEXT DEFAULT 'success'
)
RETURNS VOID AS $$
BEGIN
    -- Insert into user_sessions
    INSERT INTO user_sessions (
        user_id, session_id, ip_address, user_agent, device_type, 
        browser, os, location, login_method, login_status, 
        is_active, expires_at
    ) VALUES (
        p_user_id, p_session_id, p_ip_address, p_user_agent, p_device_type,
        p_browser, p_os, p_location, p_login_method, p_login_status,
        true, NOW() + INTERVAL '24 hours'
    );

    -- Insert into user_login_history
    INSERT INTO user_login_history (
        user_id, session_id, ip_address, user_agent, device_type,
        browser, os, location, login_method, login_status
    ) VALUES (
        p_user_id, p_session_id, p_ip_address, p_user_agent, p_device_type,
        p_browser, p_os, p_location, p_login_method, p_login_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log user logout
CREATE OR REPLACE FUNCTION log_user_logout(
    p_user_id UUID,
    p_session_id TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Mark session as inactive
    UPDATE user_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE user_id = p_user_id AND session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_sessions TO authenticated;
GRANT SELECT, INSERT ON user_login_history TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_login TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_logout TO authenticated;

-- Create a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'User sessions and login tracking setup completed successfully!' as status; 