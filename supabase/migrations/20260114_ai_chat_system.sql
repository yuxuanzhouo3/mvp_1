-- =========================================================
-- AI对话系统数据库Schema
-- 基于PersonaLink PRD文档实现INTL环境的AI对话系统
-- 使用Mistral AI作为AI服务提供商
-- =========================================================

-- =========================================================
-- Phase 1.1: 创建 ai_chat_sessions 表
-- =========================================================

CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_type VARCHAR(20) NOT NULL DEFAULT 'free_trial' CHECK (session_type IN ('free_trial', 'vip_unlimited')),
    model_used VARCHAR(50) NOT NULL DEFAULT 'mistral-small',
    messages JSONB DEFAULT '[]'::jsonb,
    token_usage INTEGER DEFAULT 0,
    user_feedback JSONB DEFAULT NULL,
    disclaimer_shown BOOLEAN DEFAULT false,
    target_user_consent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ DEFAULT NULL
);

COMMENT ON TABLE public.ai_chat_sessions IS 'AI模拟对话会话记录';
COMMENT ON COLUMN public.ai_chat_sessions.session_type IS '会话类型: free_trial=免费试用, vip_unlimited=VIP无限';
COMMENT ON COLUMN public.ai_chat_sessions.messages IS '完整对话历史JSON数组';
COMMENT ON COLUMN public.ai_chat_sessions.token_usage IS '累计使用的token数';

-- =========================================================
-- Phase 1.2: 创建 ai_usage_limits 表
-- =========================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_limits (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    daily_analysis_count INTEGER DEFAULT 0,
    daily_analysis_limit INTEGER DEFAULT 3,
    total_chat_count INTEGER DEFAULT 0,
    total_chat_limit INTEGER DEFAULT 10,
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.ai_usage_limits IS 'AI功能使用限额';
COMMENT ON COLUMN public.ai_usage_limits.daily_analysis_count IS '每日分析次数';
COMMENT ON COLUMN public.ai_usage_limits.daily_analysis_limit IS '每日分析限额(默认3)';
COMMENT ON COLUMN public.ai_usage_limits.total_chat_count IS '总对话次数';
COMMENT ON COLUMN public.ai_usage_limits.total_chat_limit IS '总对话限额(free=10, vip=null表示无限)';

-- =========================================================
-- Phase 1.2.1: 创建 ai_usage_logs 表 (AI小助手使用日志)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    feature VARCHAR(50) NOT NULL DEFAULT 'assistant',
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.ai_usage_logs IS 'AI功能使用日志(用于统计和预算控制)';
COMMENT ON COLUMN public.ai_usage_logs.feature IS '功能类型: assistant=AI小助手, analysis=性格分析, chat=虚拟对话';

-- =========================================================
-- Phase 1.3: 创建索引
-- =========================================================

-- ai_chat_sessions 索引
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON public.ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_target_user_id ON public.ai_chat_sessions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_created_at ON public.ai_chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_session_type ON public.ai_chat_sessions(session_type);

-- ai_usage_limits 索引
CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_last_reset_at ON public.ai_usage_limits(last_reset_at);

-- ai_usage_logs 索引
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON public.ai_usage_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);

-- =========================================================
-- Phase 1.3: RLS策略
-- =========================================================

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;

-- ai_chat_sessions RLS策略
DROP POLICY IF EXISTS ai_chat_sessions_select_policy ON public.ai_chat_sessions;
CREATE POLICY ai_chat_sessions_select_policy ON public.ai_chat_sessions
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS ai_chat_sessions_insert_policy ON public.ai_chat_sessions;
CREATE POLICY ai_chat_sessions_insert_policy ON public.ai_chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS ai_chat_sessions_update_policy ON public.ai_chat_sessions;
CREATE POLICY ai_chat_sessions_update_policy ON public.ai_chat_sessions
    FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ai_usage_limits RLS策略
DROP POLICY IF EXISTS ai_usage_limits_select_policy ON public.ai_usage_limits;
CREATE POLICY ai_usage_limits_select_policy ON public.ai_usage_limits
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS ai_usage_limits_insert_policy ON public.ai_usage_limits;
CREATE POLICY ai_usage_limits_insert_policy ON public.ai_usage_limits
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS ai_usage_limits_update_policy ON public.ai_usage_limits;
CREATE POLICY ai_usage_limits_update_policy ON public.ai_usage_limits
    FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ai_usage_logs RLS策略
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_logs_select_policy ON public.ai_usage_logs;
CREATE POLICY ai_usage_logs_select_policy ON public.ai_usage_logs
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS ai_usage_logs_insert_policy ON public.ai_usage_logs;
CREATE POLICY ai_usage_logs_insert_policy ON public.ai_usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- =========================================================
-- Phase 1.4: 扩展 user_profiles 表
-- =========================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS ai_chat_consent BOOLEAN DEFAULT false;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS ai_personality_cache JSONB DEFAULT NULL;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS ai_personality_cache_expires_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.user_profiles.ai_chat_consent IS '是否授权他人使用AI模拟对话';
COMMENT ON COLUMN public.user_profiles.ai_personality_cache IS '缓存AI生成的性格分析结果';
COMMENT ON COLUMN public.user_profiles.ai_personality_cache_expires_at IS '性格分析缓存过期时间';

-- =========================================================
-- Phase 7.1: 使用限额管理函数
-- =========================================================

-- 检查AI使用限额
CREATE OR REPLACE FUNCTION public.check_ai_usage_limit(
    p_user_id UUID,
    p_limit_type VARCHAR DEFAULT 'analysis'
)
RETURNS JSONB AS $$
DECLARE
    v_limits RECORD;
    v_is_vip BOOLEAN;
    v_result JSONB;
BEGIN
    -- 检查是否VIP
    SELECT EXISTS(
        SELECT 1 FROM public.user_memberships
        WHERE user_id = p_user_id
        AND status = 'active'
        AND expires_at > NOW()
    ) INTO v_is_vip;

    -- 获取用户限额
    SELECT * INTO v_limits FROM public.ai_usage_limits WHERE user_id = p_user_id;

    -- 如果没有记录，创建默认记录
    IF v_limits IS NULL THEN
        INSERT INTO public.ai_usage_limits (user_id, total_chat_limit)
        VALUES (p_user_id, CASE WHEN v_is_vip THEN NULL ELSE 10 END)
        RETURNING * INTO v_limits;
    END IF;

    -- 检查是否需要重置每日限额
    IF v_limits.last_reset_at::date < CURRENT_DATE THEN
        UPDATE public.ai_usage_limits
        SET daily_analysis_count = 0, last_reset_at = NOW(), updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING * INTO v_limits;
    END IF;

    -- 根据类型检查限额
    IF p_limit_type = 'analysis' THEN
        v_result := jsonb_build_object(
            'allowed', v_limits.daily_analysis_count < v_limits.daily_analysis_limit,
            'current', v_limits.daily_analysis_count,
            'limit', v_limits.daily_analysis_limit,
            'is_vip', v_is_vip
        );
    ELSE
        v_result := jsonb_build_object(
            'allowed', v_is_vip OR v_limits.total_chat_limit IS NULL OR v_limits.total_chat_count < v_limits.total_chat_limit,
            'current', v_limits.total_chat_count,
            'limit', COALESCE(v_limits.total_chat_limit, -1),
            'is_vip', v_is_vip
        );
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 扣减AI使用次数
CREATE OR REPLACE FUNCTION public.deduct_ai_usage(
    p_user_id UUID,
    p_usage_type VARCHAR DEFAULT 'analysis'
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_usage_type = 'analysis' THEN
        UPDATE public.ai_usage_limits
        SET daily_analysis_count = daily_analysis_count + 1, updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSE
        UPDATE public.ai_usage_limits
        SET total_chat_count = total_chat_count + 1, updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重置每日限额
CREATE OR REPLACE FUNCTION public.reset_daily_limits()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.ai_usage_limits
    SET daily_analysis_count = 0, last_reset_at = NOW(), updated_at = NOW()
    WHERE last_reset_at::date < CURRENT_DATE;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- Phase 7.2: 新用户初始化触发器
-- =========================================================

-- 修改现有的 handle_new_user 函数，添加 ai_usage_limits 初始化
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

    -- Insert into ai_usage_limits table
    INSERT INTO public.ai_usage_limits (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- 完成
-- =========================================================
