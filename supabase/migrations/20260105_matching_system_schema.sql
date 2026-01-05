-- ========================================
-- Matching System Schema Migration
-- 匹配系统数据库迁移
-- Based on PRD v2.0 - Four Matching Algorithms
-- ========================================

-- ========================================
-- Task 1.1: 确认枚举类型存在
-- algorithm_type 和 match_status 枚举
-- ========================================

-- algo_type_enum 已在 profile_setup_schema.sql 中创建
-- swipe_action_enum 已在 profile_setup_schema.sql 中创建

-- 创建 match_status 枚举类型
DO $$ BEGIN
    CREATE TYPE match_status_enum AS ENUM ('pending', 'accepted', 'rejected', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ========================================
-- Task 1.2: 创建核心表结构
-- ========================================

-- ----------------------------------------
-- 表A: recommendations (每日推荐结果存储)
-- 存储算法计算出来的推荐结果
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,     -- 推荐给谁
    target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- 推荐了谁
    
    algorithm_type algo_type_enum NOT NULL,  -- 使用的算法类型
    match_score DECIMAL(5,2),                -- 匹配分数 (0-100)
    
    -- 详细评分信息 (JSONB)
    score_details JSONB DEFAULT '{}',        -- 存储评分细节
    /*
    score_details 结构示例:
    {
        "user_base_score": 75.5,
        "target_base_score": 80.2,
        "similarity_score": 92,         -- 算法1用
        "interest_a_to_b": 85,          -- A对B的兴趣度
        "acceptance_b_to_a": 78,        -- B接受A的可能性
        "success_rate": 95,             -- 算法4用
        "random_factor": 15.5,          -- 算法3用
        "factor_comparison": {
            "wealth": {"user": 72, "target": 85, "match_degree": 85},
            "education": {"user": 85, "target": 85, "match_degree": 100}
        }
    }
    */
    
    is_viewed BOOLEAN DEFAULT false,         -- 是否已查看
    status match_status_enum DEFAULT 'pending', -- 状态
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 days'), -- 默认3天后过期
    
    -- 唯一约束: 同一算法下，同一用户对同一目标只能有一条推荐
    UNIQUE(user_id, target_user_id, algorithm_type)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id 
    ON public.recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_target_user_id 
    ON public.recommendations(target_user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_algorithm_type 
    ON public.recommendations(algorithm_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at 
    ON public.recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires_at 
    ON public.recommendations(expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_status 
    ON public.recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_match_score 
    ON public.recommendations(match_score DESC);
-- 复合索引: 用户查询自己的推荐列表
CREATE INDEX IF NOT EXISTS idx_recommendations_user_algo_created 
    ON public.recommendations(user_id, algorithm_type, created_at DESC);

-- ----------------------------------------
-- 表B: swipes (用户互动记录)
-- 记录每一次左滑(pass)或右滑(like)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- 谁滑的
    target_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- 滑了谁
    action swipe_action_enum NOT NULL,       -- like, pass, super_like
    
    -- 来源推荐ID (可选，用于追踪推荐效果)
    recommendation_id UUID REFERENCES public.recommendations(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 唯一约束: 防止重复操作
    UNIQUE(actor_id, target_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_swipes_actor_id 
    ON public.swipes(actor_id);
CREATE INDEX IF NOT EXISTS idx_swipes_target_id 
    ON public.swipes(target_id);
CREATE INDEX IF NOT EXISTS idx_swipes_action 
    ON public.swipes(action);
CREATE INDEX IF NOT EXISTS idx_swipes_created_at 
    ON public.swipes(created_at DESC);
-- 复合索引: 查询双向互动
CREATE INDEX IF NOT EXISTS idx_swipes_actor_target 
    ON public.swipes(actor_id, target_id);

-- ----------------------------------------
-- 表C: matches (匹配成功记录)
-- 只有双向喜欢才会进入此表
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_1 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_2 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    match_score DECIMAL(5,2),                -- 最终匹配分数
    algorithm_type algo_type_enum,           -- 促成匹配的算法
    
    -- 匹配详情
    match_details JSONB DEFAULT '{}',
    /*
    match_details 结构示例:
    {
        "user_1_score": 75.5,
        "user_2_score": 80.2,
        "compatibility_score": 88,
        "mutual_interests": ["Travel", "Music", "Cooking"]
    }
    */
    
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    unmatched_at TIMESTAMPTZ,                -- 解除匹配时间
    
    -- 约束: user_1 的 UUID 必须小于 user_2，保证唯一性
    CONSTRAINT check_user_order CHECK (user_1 < user_2),
    UNIQUE(user_1, user_2)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_matches_user_1 
    ON public.matches(user_1);
CREATE INDEX IF NOT EXISTS idx_matches_user_2 
    ON public.matches(user_2);
CREATE INDEX IF NOT EXISTS idx_matches_matched_at 
    ON public.matches(matched_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_algorithm_type 
    ON public.matches(algorithm_type);
-- 活跃匹配索引
CREATE INDEX IF NOT EXISTS idx_matches_active 
    ON public.matches(user_1, user_2) 
    WHERE unmatched_at IS NULL;

-- ========================================
-- Task 1.3: 创建辅助视图
-- ========================================

-- ----------------------------------------
-- 视图: v_user_full_profile
-- 整合用户基础信息 + 资料 + 市场评分
-- ----------------------------------------
CREATE OR REPLACE VIEW public.v_user_full_profile AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.phone,
    u.gender,
    u.birth_date,
    u.avatar_url,
    u.account_status,
    u.verification_level,
    u.last_active_at,
    u.created_at,
    
    -- 从 user_profiles 获取资料
    up.real_name,
    up.height_cm,
    up.weight_kg,
    up.bmi,
    up.education_level,
    up.occupation,
    up.company_type,
    up.annual_income_range,
    up.marital_status,
    up.relationship_history_count,
    up.children_preference,
    up.mbti,
    up.bio,
    up.location,
    up.city_name,
    
    -- 市场价值评分
    up.market_value_score,
    (up.market_value_score->>'totalScore')::DECIMAL(5,2) AS total_score,
    (up.market_value_score->>'percentile')::INTEGER AS percentile,
    
    -- 隐私设置
    up.privacy_settings,
    up.search_preferences,
    
    -- 从 user_verifications 获取认证状态
    uv.phone_verified,
    uv.id_card_verified,
    uv.education_verified,
    uv.income_verified,
    
    -- 计算年龄
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.birth_date))::INTEGER AS age
    
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
LEFT JOIN public.user_verifications uv ON u.id = uv.user_id;

-- 添加视图注释
COMMENT ON VIEW public.v_user_full_profile IS '用户完整资料视图，整合用户基础信息、详细资料、市场评分和认证状态';

-- ----------------------------------------
-- 视图: v_active_users
-- 筛选活跃且通过基础认证的用户
-- ----------------------------------------
CREATE OR REPLACE VIEW public.v_active_users AS
SELECT *
FROM public.v_user_full_profile
WHERE 
    account_status = 'active'
    AND gender IS NOT NULL
    AND birth_date IS NOT NULL
    AND total_score IS NOT NULL
    -- 最近30天活跃
    AND (last_active_at IS NULL OR last_active_at >= NOW() - INTERVAL '30 days');

-- 添加视图注释
COMMENT ON VIEW public.v_active_users IS '活跃用户视图，筛选账户状态正常、资料完整且近期活跃的用户';

-- ========================================
-- 辅助函数
-- ========================================

-- ----------------------------------------
-- 函数: 检查两个用户是否已经互动过
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.has_interacted(
    p_user_id UUID,
    p_target_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.swipes
        WHERE actor_id = p_user_id AND target_id = p_target_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 函数: 检查两个用户是否已匹配
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.is_matched(
    p_user_id_1 UUID,
    p_user_id_2 UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_1 UUID;
    v_user_2 UUID;
BEGIN
    -- 确保 user_1 < user_2
    IF p_user_id_1 < p_user_id_2 THEN
        v_user_1 := p_user_id_1;
        v_user_2 := p_user_id_2;
    ELSE
        v_user_1 := p_user_id_2;
        v_user_2 := p_user_id_1;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM public.matches
        WHERE user_1 = v_user_1 
          AND user_2 = v_user_2
          AND unmatched_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 函数: 创建匹配（当双方都喜欢时调用）
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.create_match_if_mutual()
RETURNS TRIGGER AS $$
DECLARE
    v_user_1 UUID;
    v_user_2 UUID;
    v_match_score DECIMAL(5,2);
    v_algorithm algo_type_enum;
    v_rec_id UUID;
BEGIN
    -- 只处理 like 或 super_like 动作
    IF NEW.action NOT IN ('like', 'super_like') THEN
        RETURN NEW;
    END IF;
    
    -- 检查对方是否也喜欢了当前用户
    IF EXISTS (
        SELECT 1 FROM public.swipes
        WHERE actor_id = NEW.target_id 
          AND target_id = NEW.actor_id
          AND action IN ('like', 'super_like')
    ) THEN
        -- 确保 user_1 < user_2
        IF NEW.actor_id < NEW.target_id THEN
            v_user_1 := NEW.actor_id;
            v_user_2 := NEW.target_id;
        ELSE
            v_user_1 := NEW.target_id;
            v_user_2 := NEW.actor_id;
        END IF;
        
        -- 获取推荐的匹配分数和算法类型
        SELECT match_score, algorithm_type, id INTO v_match_score, v_algorithm, v_rec_id
        FROM public.recommendations
        WHERE (user_id = NEW.actor_id AND target_user_id = NEW.target_id)
           OR (user_id = NEW.target_id AND target_user_id = NEW.actor_id)
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- 插入匹配记录（如果不存在）
        INSERT INTO public.matches (user_1, user_2, match_score, algorithm_type)
        VALUES (v_user_1, v_user_2, v_match_score, v_algorithm)
        ON CONFLICT (user_1, user_2) DO NOTHING;
        
        -- 更新推荐状态为 accepted
        IF v_rec_id IS NOT NULL THEN
            UPDATE public.recommendations
            SET status = 'accepted'
            WHERE id = v_rec_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器: 当用户滑动时检查是否形成匹配
DROP TRIGGER IF EXISTS on_swipe_check_match ON public.swipes;
CREATE TRIGGER on_swipe_check_match
    AFTER INSERT ON public.swipes
    FOR EACH ROW
    EXECUTE FUNCTION public.create_match_if_mutual();

-- ----------------------------------------
-- 函数: 清理过期的推荐记录
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM public.recommendations
        WHERE expires_at < NOW()
          AND status = 'pending'
        RETURNING *
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- RLS 安全策略 (Task 10)
-- ========================================

-- 启用 RLS
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- recommendations 表策略
-- ----------------------------------------

-- 用户只能查看推荐给自己的记录
DROP POLICY IF EXISTS "Users can view own recommendations" ON public.recommendations;
CREATE POLICY "Users can view own recommendations" ON public.recommendations
    FOR SELECT USING (auth.uid() = user_id);

-- 系统可以插入推荐记录（通过 service_role）
DROP POLICY IF EXISTS "Service can insert recommendations" ON public.recommendations;
CREATE POLICY "Service can insert recommendations" ON public.recommendations
    FOR INSERT WITH CHECK (true);

-- 用户可以更新自己的推荐记录（如标记已查看）
DROP POLICY IF EXISTS "Users can update own recommendations" ON public.recommendations;
CREATE POLICY "Users can update own recommendations" ON public.recommendations
    FOR UPDATE USING (auth.uid() = user_id);

-- ----------------------------------------
-- swipes 表策略
-- ----------------------------------------

-- 用户只能查看自己的互动记录
DROP POLICY IF EXISTS "Users can view own swipes" ON public.swipes;
CREATE POLICY "Users can view own swipes" ON public.swipes
    FOR SELECT USING (auth.uid() = actor_id);

-- 用户只能创建自己的互动记录
DROP POLICY IF EXISTS "Users can create own swipes" ON public.swipes;
CREATE POLICY "Users can create own swipes" ON public.swipes
    FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- ----------------------------------------
-- matches 表策略
-- ----------------------------------------

-- 只有匹配的双方可以查看
DROP POLICY IF EXISTS "Users can view own matches" ON public.matches;
CREATE POLICY "Users can view own matches" ON public.matches
    FOR SELECT USING (auth.uid() = user_1 OR auth.uid() = user_2);

-- 匹配的双方可以更新（如解除匹配）
DROP POLICY IF EXISTS "Users can update own matches" ON public.matches;
CREATE POLICY "Users can update own matches" ON public.matches
    FOR UPDATE USING (auth.uid() = user_1 OR auth.uid() = user_2);

-- ========================================
-- 授权
-- ========================================

-- 授权函数执行权限
GRANT EXECUTE ON FUNCTION public.has_interacted(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_matched(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_recommendations() TO service_role;

-- 授权视图查询权限
GRANT SELECT ON public.v_user_full_profile TO authenticated;
GRANT SELECT ON public.v_active_users TO authenticated;

-- ========================================
-- 完成
-- ========================================

COMMENT ON TABLE public.recommendations IS '每日推荐结果表，存储算法计算的推荐结果，有效期3天';
COMMENT ON TABLE public.swipes IS '用户互动记录表，记录用户的喜欢/跳过/超级喜欢操作';
COMMENT ON TABLE public.matches IS '匹配成功记录表，只有双向喜欢才会创建记录';

