-- =========================================================
-- INTL 环境实时聊天系统数据库迁移
-- 基于 PersonaLink PRD v2.0
-- 使用 Supabase Realtime 实现
-- =========================================================

-- =========================================================
-- Phase 1.1: 创建聊天核心表结构
-- =========================================================

-- 1. 聊天室表 (chat_rooms)
-- 存储双方聊天关系和聊天室元数据
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    
    -- 最后消息快照（用于聊天列表展示）
    last_message_content TEXT,
    last_message_type VARCHAR(20) DEFAULT 'text',  -- text, image, audio, video, location, sticker
    last_message_at TIMESTAMPTZ,
    
    -- 未读数（JSONB存储双方未读数 {"user_id_1": 0, "user_id_2": 3}）
    unread_counts JSONB DEFAULT '{}'::JSONB,
    
    -- 输入状态（JSONB存储输入状态 {"user_id": timestamp}）
    typing_status JSONB DEFAULT '{}'::JSONB,
    
    -- 聊天室状态
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 确保一个match只有一个聊天室
    CONSTRAINT unique_match_chat UNIQUE (match_id)
);

-- 2. 消息表 (messages)
-- 存储聊天消息内容
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 消息内容
    content TEXT,  -- 文本内容或系统消息
    message_type VARCHAR(20) DEFAULT 'text',  -- text, image, audio, video, location, sticker, system
    
    -- 消息引用（回复某条消息）
    reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    
    -- 附件元数据（JSONB存储，根据message_type不同结构不同）
    -- 图片: {image_url, thumbnail_url, width, height}
    -- 音频: {audio_url, duration}
    -- 视频: {video_url, thumbnail_url, duration, width, height}
    -- 位置: {latitude, longitude, address, map_thumbnail_url}
    -- 贴纸: {sticker_id, sticker_url}
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- 已读状态
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- 消息状态
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,  -- 软删除（撤回）
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 消息附件表 (message_attachments)
-- 存储附件详细信息（用于大文件和多媒体）
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    
    -- 文件信息
    file_type VARCHAR(50) NOT NULL,  -- image/jpeg, audio/mp3, video/mp4, etc.
    file_url TEXT NOT NULL,
    file_size INTEGER,  -- 字节数
    thumbnail_url TEXT,
    
    -- 媒体属性
    duration INTEGER,  -- 音视频时长（秒）
    width INTEGER,     -- 图片/视频宽度
    height INTEGER,    -- 图片/视频高度
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- 创建索引
-- =========================================================

-- chat_rooms 索引
CREATE INDEX IF NOT EXISTS idx_chat_rooms_match_id ON chat_rooms(match_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_is_active ON chat_rooms(is_active);

-- messages 索引
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_sent_at ON messages(room_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NULL;

-- message_attachments 索引
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);

-- =========================================================
-- 全文搜索索引（用于消息搜索）
-- =========================================================

-- 为 messages.content 创建 GIN 索引支持全文搜索
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING GIN (to_tsvector('simple', COALESCE(content, '')));

-- =========================================================
-- Phase 1.2: 配置 Row Level Security (RLS)
-- =========================================================

-- 启用 RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- 辅助函数：检查用户是否是聊天室成员
CREATE OR REPLACE FUNCTION is_chat_room_member(room_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_member BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM chat_rooms cr
        JOIN matches m ON cr.match_id = m.id
        WHERE cr.id = room_id
        AND (m.user_1 = user_id OR m.user_2 = user_id)
    ) INTO is_member;
    
    RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- chat_rooms RLS 策略

-- 查看策略：用户只能查看自己参与的聊天室
DROP POLICY IF EXISTS chat_rooms_select_policy ON chat_rooms;
CREATE POLICY chat_rooms_select_policy ON chat_rooms
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = chat_rooms.match_id
            AND (m.user_1 = auth.uid() OR m.user_2 = auth.uid())
        )
    );

-- 更新策略：用户只能更新自己参与的聊天室
DROP POLICY IF EXISTS chat_rooms_update_policy ON chat_rooms;
CREATE POLICY chat_rooms_update_policy ON chat_rooms
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = chat_rooms.match_id
            AND (m.user_1 = auth.uid() OR m.user_2 = auth.uid())
        )
    );

-- messages RLS 策略

-- 查看策略：用户只能查看所在聊天室的消息
DROP POLICY IF EXISTS messages_select_policy ON messages;
CREATE POLICY messages_select_policy ON messages
    FOR SELECT
    USING (
        is_chat_room_member(room_id, auth.uid())
    );

-- 插入策略：用户只能向自己的聊天室发送消息，且sender_id必须是自己
DROP POLICY IF EXISTS messages_insert_policy ON messages;
CREATE POLICY messages_insert_policy ON messages
    FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND is_chat_room_member(room_id, auth.uid())
    );

-- 更新策略：用户只能更新自己发送的消息（用于撤回）
DROP POLICY IF EXISTS messages_update_policy ON messages;
CREATE POLICY messages_update_policy ON messages
    FOR UPDATE
    USING (
        sender_id = auth.uid()
    )
    WITH CHECK (
        sender_id = auth.uid()
    );

-- 删除策略：用户只能删除自己发送的消息
DROP POLICY IF EXISTS messages_delete_policy ON messages;
CREATE POLICY messages_delete_policy ON messages
    FOR DELETE
    USING (
        sender_id = auth.uid()
    );

-- message_attachments RLS 策略

-- 查看策略：继承 messages 的权限
DROP POLICY IF EXISTS message_attachments_select_policy ON message_attachments;
CREATE POLICY message_attachments_select_policy ON message_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_attachments.message_id
            AND is_chat_room_member(m.room_id, auth.uid())
        )
    );

-- 插入策略：只能为自己的消息添加附件
DROP POLICY IF EXISTS message_attachments_insert_policy ON message_attachments;
CREATE POLICY message_attachments_insert_policy ON message_attachments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_attachments.message_id
            AND m.sender_id = auth.uid()
        )
    );

-- 删除策略：只能删除自己消息的附件
DROP POLICY IF EXISTS message_attachments_delete_policy ON message_attachments;
CREATE POLICY message_attachments_delete_policy ON message_attachments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_attachments.message_id
            AND m.sender_id = auth.uid()
        )
    );

-- =========================================================
-- Phase 1.3: 创建数据库函数和触发器
-- =========================================================

-- 1. 触发器：自动更新 chat_rooms.last_message_* 字段
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_rooms
    SET 
        last_message_content = CASE 
            WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
            WHEN NEW.message_type = 'image' THEN '[图片]'
            WHEN NEW.message_type = 'audio' THEN '[语音]'
            WHEN NEW.message_type = 'video' THEN '[视频]'
            WHEN NEW.message_type = 'location' THEN '[位置]'
            WHEN NEW.message_type = 'sticker' THEN '[表情]'
            ELSE '[消息]'
        END,
        last_message_type = NEW.message_type,
        last_message_at = NEW.sent_at,
        updated_at = NOW()
    WHERE id = NEW.room_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_chat_room_last_message ON messages;
CREATE TRIGGER trigger_update_chat_room_last_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_room_last_message();

-- 2. 触发器：自动增加未读计数
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
DECLARE
    receiver_id UUID;
    match_record RECORD;
BEGIN
    -- 获取聊天室对应的match信息
    SELECT m.user_1, m.user_2 INTO match_record
    FROM chat_rooms cr
    JOIN matches m ON cr.match_id = m.id
    WHERE cr.id = NEW.room_id;
    
    -- 确定接收方ID
    IF match_record.user_1 = NEW.sender_id THEN
        receiver_id := match_record.user_2;
    ELSE
        receiver_id := match_record.user_1;
    END IF;
    
    -- 增加接收方的未读数
    UPDATE chat_rooms
    SET unread_counts = jsonb_set(
        COALESCE(unread_counts, '{}'::JSONB),
        ARRAY[receiver_id::TEXT],
        (COALESCE((unread_counts->>receiver_id::TEXT)::INTEGER, 0) + 1)::TEXT::JSONB
    )
    WHERE id = NEW.room_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_increment_unread_count ON messages;
CREATE TRIGGER trigger_increment_unread_count
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION increment_unread_count();

-- 3. 函数：标记消息为已读
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_room_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- 更新未读消息
    UPDATE messages
    SET 
        is_read = TRUE,
        read_at = NOW()
    WHERE room_id = p_room_id
      AND sender_id != p_user_id
      AND is_read = FALSE
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- 清零该用户的未读数
    UPDATE chat_rooms
    SET unread_counts = jsonb_set(
        COALESCE(unread_counts, '{}'::JSONB),
        ARRAY[p_user_id::TEXT],
        '0'::JSONB
    )
    WHERE id = p_room_id;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 函数：获取用户的聊天室列表
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
        u.username AS other_user_username,
        u.avatar_url AS other_user_avatar_url,
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

-- 5. 函数：获取历史消息（分页）
CREATE OR REPLACE FUNCTION get_messages(
    p_room_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_before_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    room_id UUID,
    sender_id UUID,
    content TEXT,
    message_type VARCHAR(20),
    reply_to_message_id UUID,
    metadata JSONB,
    is_read BOOLEAN,
    read_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    -- 回复的消息内容（如果有）
    reply_content TEXT,
    reply_sender_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id AS message_id,
        m.room_id,
        m.sender_id,
        m.content,
        m.message_type,
        m.reply_to_message_id,
        m.metadata,
        m.is_read,
        m.read_at,
        m.sent_at,
        m.deleted_at,
        -- 被回复消息的内容
        rm.content AS reply_content,
        rm.sender_id AS reply_sender_id
    FROM messages m
    LEFT JOIN messages rm ON m.reply_to_message_id = rm.id
    WHERE m.room_id = p_room_id
      AND (p_before_timestamp IS NULL OR m.sent_at < p_before_timestamp)
    ORDER BY m.sent_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 函数：创建或获取聊天室
CREATE OR REPLACE FUNCTION get_or_create_chat_room(p_match_id UUID)
RETURNS UUID AS $$
DECLARE
    v_room_id UUID;
BEGIN
    -- 尝试获取现有聊天室
    SELECT id INTO v_room_id
    FROM chat_rooms
    WHERE match_id = p_match_id;
    
    -- 如果不存在，创建新的
    IF v_room_id IS NULL THEN
        INSERT INTO chat_rooms (match_id, is_active)
        VALUES (p_match_id, TRUE)
        RETURNING id INTO v_room_id;
    END IF;
    
    RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 函数：搜索消息
CREATE OR REPLACE FUNCTION search_messages(
    p_room_id UUID,
    p_keyword TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    message_id UUID,
    content TEXT,
    sender_id UUID,
    sent_at TIMESTAMPTZ,
    message_type VARCHAR(20),
    highlighted_content TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id AS message_id,
        m.content,
        m.sender_id,
        m.sent_at,
        m.message_type,
        ts_headline('simple', COALESCE(m.content, ''), plainto_tsquery('simple', p_keyword)) AS highlighted_content
    FROM messages m
    WHERE m.room_id = p_room_id
      AND m.message_type = 'text'
      AND m.deleted_at IS NULL
      AND to_tsvector('simple', COALESCE(m.content, '')) @@ plainto_tsquery('simple', p_keyword)
    ORDER BY m.sent_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 函数：撤回消息
CREATE OR REPLACE FUNCTION recall_message(
    p_message_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_sent_at TIMESTAMPTZ;
    v_sender_id UUID;
BEGIN
    -- 获取消息信息
    SELECT sender_id, sent_at INTO v_sender_id, v_sent_at
    FROM messages
    WHERE id = p_message_id;
    
    -- 检查是否是发送者
    IF v_sender_id != p_user_id THEN
        RAISE EXCEPTION '只能撤回自己的消息';
    END IF;
    
    -- 检查是否在2分钟内
    IF NOW() - v_sent_at > INTERVAL '2 minutes' THEN
        RAISE EXCEPTION '超过2分钟无法撤回';
    END IF;
    
    -- 软删除消息
    UPDATE messages
    SET 
        deleted_at = NOW(),
        content = NULL,
        metadata = '{}'::JSONB
    WHERE id = p_message_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- 启用 Realtime
-- =========================================================

-- 启用 messages 表的 Realtime 功能
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;

-- =========================================================
-- 为现有匹配创建聊天室（数据迁移）
-- =========================================================

-- 为所有已存在的 matches 创建对应的 chat_rooms
INSERT INTO chat_rooms (match_id, is_active, created_at)
SELECT id, TRUE, matched_at
FROM matches
WHERE unmatched_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM chat_rooms WHERE match_id = matches.id
  )
ON CONFLICT (match_id) DO NOTHING;

-- =========================================================
-- 添加 users 表的 fcm_token 字段（用于推送通知）
-- =========================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'fcm_token'
    ) THEN
        ALTER TABLE users ADD COLUMN fcm_token TEXT;
    END IF;
END $$;

-- =========================================================
-- 完成
-- =========================================================

COMMENT ON TABLE chat_rooms IS 'INTL环境聊天室表 - 存储双方聊天关系和聊天室元数据';
COMMENT ON TABLE messages IS 'INTL环境消息表 - 存储聊天消息内容';
COMMENT ON TABLE message_attachments IS 'INTL环境消息附件表 - 存储附件详细信息';

