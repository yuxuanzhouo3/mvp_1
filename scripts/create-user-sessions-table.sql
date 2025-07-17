-- Create user_sessions table for tracking detailed login information
-- Run this in your Supabase Dashboard > SQL Editor

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN (desktop',mobile', tablet', 'unknown')),
    browser TEXT,
    os TEXT,
    location TEXT,
    login_method TEXT CHECK (login_method IN (email', google, hone', 'magic_link')),
    login_status TEXT DEFAULTsuccess' CHECK (login_status IN (success', failed', 'blocked')),
    failure_reason TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_login_history table for detailed login tracking
CREATE TABLE IF NOT EXISTS user_login_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN (desktop',mobile', tablet', 'unknown')),
    browser TEXT,
    os TEXT,
    location TEXT,
    login_method TEXT CHECK (login_method IN (email', google, hone', 'magic_link')),
    login_status TEXT CHECK (login_status IN (success', failed', 'blocked')),
    failure_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_user_login_history_user_id ON user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_history_session_id ON user_login_history(session_id);
CREATE INDEX IF NOT EXISTS idx_user_login_history_login_status ON user_login_history(login_status);
CREATE INDEX IF NOT EXISTS idx_user_login_history_created_at ON user_login_history(created_at);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sessions ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICYUsers can create their own sessions ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICYUsers can update their own sessions ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own login history" ON user_login_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICYUsers can create their own login history" ON user_login_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO user_activities (user_id, type, title, description, metadata)
    VALUES (p_user_id, p_type, p_title, p_description, p_metadata)
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log user login
CREATE OR REPLACE FUNCTION log_user_login(
    p_user_id UUID,
    p_session_id TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT unknown',
    p_browser TEXT DEFAULT NULL,
    p_os TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_login_method TEXT DEFAULT 'email',
    p_login_status TEXT DEFAULT success',
    p_failure_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
    history_id UUID;
BEGIN
    -- Log to login history
    INSERT INTO user_login_history (
        user_id, session_id, ip_address, user_agent, device_type, 
        browser, os, location, login_method, login_status, 
        failure_reason, metadata
    )
    VALUES (
        p_user_id, p_session_id, p_ip_address, p_user_agent, p_device_type,
        p_browser, p_os, p_location, p_login_method, p_login_status,
        p_failure_reason, p_metadata
    )
    RETURNING id INTO history_id;
    
    -- If login successful, create active session
    IF p_login_status = 'success' THEN
        INSERT INTO user_sessions (
            user_id, session_id, ip_address, user_agent, device_type,
            browser, os, location, login_method, expires_at
        )
        VALUES (
            p_user_id, p_session_id, p_ip_address, p_user_agent, p_device_type,
            p_browser, p_os, p_location, p_login_method, 
            NOW() + INTERVAL '30 -- 30 day session
        )
        RETURNING id INTO session_id;
    END IF;
    
    -- Log activity
    PERFORM log_user_activity(
        p_user_id, 
       login, CASE 
            WHEN p_login_status = 'success' THEN 'User logged in successfully            ELSE 'Login attempt failed'
        END,
        CASE 
            WHEN p_login_status = 'success' THEN 'User logged in via ' || p_login_method
            ELSE 'Login failed: ||COALESCE(p_failure_reason, Unknown reason')
        END,
        p_metadata
    );
    
    RETURN history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log user logout
CREATE OR REPLACE FUNCTION log_user_logout(
    p_user_id UUID,
    p_session_id TEXT,
    p_reason TEXT DEFAULT 'user_logout'
)
RETURNS VOID AS $$
BEGIN
    -- Mark session as inactive
    UPDATE user_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE user_id = p_user_id AND session_id = p_session_id;
    
    -- Log activity
    PERFORM log_user_activity(
        p_user_id, 
        logout', 
      User logged out',
       Userlogged out. Reason: || p_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user session info
CREATE OR REPLACE FUNCTION get_user_session_info(p_user_id UUID)
RETURNS TABLE (
    session_id TEXT,
    ip_address INET,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    location TEXT,
    login_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.session_id,
        us.ip_address,
        us.device_type,
        us.browser,
        us.os,
        us.location,
        us.login_method,
        us.created_at,
        us.is_active
    FROM user_sessions us
    WHERE us.user_id = p_user_id
    ORDER BY us.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user login history
CREATE OR REPLACE FUNCTION get_user_login_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    session_id TEXT,
    ip_address INET,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    location TEXT,
    login_method TEXT,
    login_status TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ulh.session_id,
        ulh.ip_address,
        ulh.device_type,
        ulh.browser,
        ulh.os,
        ulh.location,
        ulh.login_method,
        ulh.login_status,
        ulh.failure_reason,
        ulh.created_at
    FROM user_login_history ulh
    WHERE ulh.user_id = p_user_id
    ORDER BY ulh.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_sessions TO anon, authenticated;
GRANT ALL ON user_login_history TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity(UUID, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_user_login(UUID, TEXT, INET, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_user_logout(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_session_info(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_login_history(UUID, INTEGER) TO anon, authenticated;

-- Success message
SELECT Usersessions and login tracking tables created successfully! 🎉' as status; 