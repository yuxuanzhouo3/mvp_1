-- 修复 get_chat_rooms_for_user 函数中的类型不匹配问题
CREATE OR REPLACE FUNCTION get_chat_rooms_for_user(p_user_id UUID)
RETURNS TABLE (
    room_id UUID,
    match_id UUID,
    last_message_content TEXT,
    last_message_type VARCHAR(20),
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    -- 对方用户信息
    other_user_id UUID,
    other_user_username TEXT,
    other_user_avatar_url TEXT,
    other_user_gender VARCHAR(10),
    other_user_last_active TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.id AS room_id,
        cr.match_id,
        cr.last_message_content,
        cr.last_message_type,
        cr.last_message_at,
        COALESCE((cr.unread_counts->>p_user_id::TEXT)::INTEGER, 0) AS unread_count,
        cr.is_active,
        cr.created_at,
        -- 对方用户信息
        CASE 
            WHEN m.user_1 = p_user_id THEN m.user_2
            ELSE m.user_1
        END AS other_user_id,
        u.username::TEXT AS other_user_username,        -- 添加 ::TEXT 强制类型转换
        u.avatar_url::TEXT AS other_user_avatar_url,    -- 添加 ::TEXT 确保类型一致
        u.gender::VARCHAR(10) AS other_user_gender,
        u.last_active_at AS other_user_last_active
    FROM chat_rooms cr
    JOIN matches m ON cr.match_id = m.id
    JOIN users u ON u.id = CASE 
        WHEN m.user_1 = p_user_id THEN m.user_2
        ELSE m.user_1
    END
    WHERE (m.user_1 = p_user_id OR m.user_2 = p_user_id)
      AND cr.is_active = TRUE
    ORDER BY cr.last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
