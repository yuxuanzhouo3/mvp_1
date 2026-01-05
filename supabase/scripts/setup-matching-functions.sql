-- ========================================
-- Matching System Database Functions
-- 匹配系统数据库函数
-- 用于 Edge Functions 或 Cron Jobs 调用
-- ========================================

-- ========================================
-- Task 9.2: 批量查询优化函数
-- ========================================

-- ----------------------------------------
-- 函数: 获取用户完整资料（含市场评分）
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_full_profile(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    gender gender_enum,
    birth_date DATE,
    age INTEGER,
    total_score DECIMAL(5,2),
    score_breakdown JSONB,
    location GEOGRAPHY(POINT, 4326),
    city_name VARCHAR(100),
    education_level VARCHAR(50),
    annual_income_range VARCHAR(50),
    mbti VARCHAR(4),
    verification_level verify_level_enum,
    search_preferences JSONB,
    last_active_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.gender,
        u.birth_date,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.birth_date))::INTEGER AS age,
        (up.market_value_score->>'totalScore')::DECIMAL(5,2) AS total_score,
        up.market_value_score->'scoreBreakdown' AS score_breakdown,
        up.location,
        up.city_name,
        up.education_level,
        up.annual_income_range,
        up.mbti,
        u.verification_level,
        up.search_preferences,
        u.last_active_at
    FROM public.users u
    JOIN public.user_profiles up ON u.id = up.user_id
    WHERE u.id = p_user_id
    AND u.account_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 函数: 获取符合条件的候选人池
-- 支持：性别偏好、年龄范围、距离、认证等级、排除已互动
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.get_eligible_candidates(
    p_user_id UUID,
    p_target_gender gender_enum DEFAULT NULL,
    p_min_score DECIMAL DEFAULT NULL,
    p_max_score DECIMAL DEFAULT NULL,
    p_min_age INTEGER DEFAULT NULL,
    p_max_age INTEGER DEFAULT NULL,
    p_max_distance_km INTEGER DEFAULT NULL,
    p_min_verification verify_level_enum DEFAULT NULL,
    p_exclude_interacted BOOLEAN DEFAULT TRUE,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    gender gender_enum,
    age INTEGER,
    total_score DECIMAL(5,2),
    score_breakdown JSONB,
    location GEOGRAPHY(POINT, 4326),
    city_name VARCHAR(100),
    interests INTEGER[]
) AS $$
DECLARE
    v_user_location GEOGRAPHY(POINT, 4326);
BEGIN
    -- 获取当前用户位置
    SELECT up.location INTO v_user_location
    FROM public.user_profiles up
    WHERE up.user_id = p_user_id;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.gender,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.birth_date))::INTEGER AS age,
        (up.market_value_score->>'totalScore')::DECIMAL(5,2) AS total_score,
        up.market_value_score->'scoreBreakdown' AS score_breakdown,
        up.location,
        up.city_name,
        ARRAY(
            SELECT uim.interest_id 
            FROM public.users_interests_map uim 
            WHERE uim.user_id = u.id
        ) AS interests
    FROM public.users u
    JOIN public.user_profiles up ON u.id = up.user_id
    WHERE u.id != p_user_id
        AND u.account_status = 'active'
        AND u.gender IS NOT NULL
        AND u.birth_date IS NOT NULL
        AND up.market_value_score IS NOT NULL
        AND (up.market_value_score->>'totalScore')::DECIMAL IS NOT NULL
        -- 性别筛选
        AND (p_target_gender IS NULL OR u.gender = p_target_gender)
        -- 分数范围
        AND (p_min_score IS NULL OR (up.market_value_score->>'totalScore')::DECIMAL >= p_min_score)
        AND (p_max_score IS NULL OR (up.market_value_score->>'totalScore')::DECIMAL <= p_max_score)
        -- 年龄范围
        AND (p_min_age IS NULL OR EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.birth_date))::INTEGER >= p_min_age)
        AND (p_max_age IS NULL OR EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.birth_date))::INTEGER <= p_max_age)
        -- 距离筛选（如果提供）
        AND (
            p_max_distance_km IS NULL 
            OR v_user_location IS NULL 
            OR up.location IS NULL
            OR ST_DWithin(v_user_location, up.location, p_max_distance_km * 1000)
        )
        -- 认证等级
        AND (p_min_verification IS NULL OR u.verification_level >= p_min_verification)
        -- 排除已互动的用户
        AND (
            NOT p_exclude_interacted 
            OR NOT EXISTS (
                SELECT 1 FROM public.swipes s
                WHERE s.actor_id = p_user_id AND s.target_id = u.id
            )
        )
        -- 排除已匹配的用户
        AND NOT EXISTS (
            SELECT 1 FROM public.matches m
            WHERE (m.user_1 = p_user_id AND m.user_2 = u.id)
               OR (m.user_2 = p_user_id AND m.user_1 = u.id)
            AND m.unmatched_at IS NULL
        )
        -- 最近活跃（30天内）
        AND (u.last_active_at IS NULL OR u.last_active_at >= NOW() - INTERVAL '30 days')
    ORDER BY (up.market_value_score->>'totalScore')::DECIMAL DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 函数: 计算两个用户之间的距离（公里）
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_user_distance(
    p_user_id_1 UUID,
    p_user_id_2 UUID
)
RETURNS DECIMAL AS $$
DECLARE
    v_loc_1 GEOGRAPHY(POINT, 4326);
    v_loc_2 GEOGRAPHY(POINT, 4326);
    v_distance DECIMAL;
BEGIN
    SELECT location INTO v_loc_1
    FROM public.user_profiles
    WHERE user_id = p_user_id_1;
    
    SELECT location INTO v_loc_2
    FROM public.user_profiles
    WHERE user_id = p_user_id_2;
    
    IF v_loc_1 IS NULL OR v_loc_2 IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- ST_Distance 返回米，转换为公里
    v_distance := ST_Distance(v_loc_1, v_loc_2) / 1000.0;
    
    RETURN ROUND(v_distance::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 函数: 获取用户的兴趣列表
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_interests(p_user_id UUID)
RETURNS INTEGER[] AS $$
DECLARE
    v_interests INTEGER[];
BEGIN
    SELECT ARRAY_AGG(interest_id) INTO v_interests
    FROM public.users_interests_map
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_interests, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 函数: 计算两个用户的兴趣重合度
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_interest_overlap(
    p_user_id_1 UUID,
    p_user_id_2 UUID
)
RETURNS TABLE (
    overlap_count INTEGER,
    overlap_percentage DECIMAL,
    mutual_interests INTEGER[]
) AS $$
DECLARE
    v_interests_1 INTEGER[];
    v_interests_2 INTEGER[];
    v_mutual INTEGER[];
BEGIN
    v_interests_1 := public.get_user_interests(p_user_id_1);
    v_interests_2 := public.get_user_interests(p_user_id_2);
    
    -- 找出共同兴趣
    SELECT ARRAY_AGG(i) INTO v_mutual
    FROM UNNEST(v_interests_1) AS i
    WHERE i = ANY(v_interests_2);
    
    v_mutual := COALESCE(v_mutual, ARRAY[]::INTEGER[]);
    
    RETURN QUERY SELECT
        ARRAY_LENGTH(v_mutual, 1)::INTEGER AS overlap_count,
        CASE 
            WHEN LEAST(ARRAY_LENGTH(v_interests_1, 1), ARRAY_LENGTH(v_interests_2, 1)) > 0 THEN
                ROUND(
                    (ARRAY_LENGTH(v_mutual, 1)::DECIMAL / 
                    LEAST(ARRAY_LENGTH(v_interests_1, 1), ARRAY_LENGTH(v_interests_2, 1))) * 100,
                    2
                )
            ELSE 0
        END AS overlap_percentage,
        v_mutual AS mutual_interests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Task 7.2: 定时任务函数
-- ========================================

-- ----------------------------------------
-- 函数: 批量生成每日推荐（供Cron Job调用）
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.generate_batch_recommendations()
RETURNS TABLE (
    processed_users INTEGER,
    total_recommendations INTEGER,
    execution_time_ms INTEGER
) AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_user RECORD;
    v_processed INTEGER := 0;
    v_total_recs INTEGER := 0;
BEGIN
    v_start_time := NOW();
    
    -- 遍历所有活跃用户
    FOR v_user IN 
        SELECT u.id, u.gender, 
               (up.search_preferences->>'preferred_algorithm')::text AS pref_algo
        FROM public.users u
        JOIN public.user_profiles up ON u.id = up.user_id
        WHERE u.account_status = 'active'
          AND u.gender IS NOT NULL
          AND u.birth_date IS NOT NULL
          AND up.market_value_score IS NOT NULL
          AND (u.last_active_at IS NULL OR u.last_active_at >= NOW() - INTERVAL '7 days')
        LIMIT 1000  -- 每次最多处理1000用户
    LOOP
        -- 这里可以调用具体的推荐生成逻辑
        -- 由于复杂的算法逻辑在应用层实现，这里只记录需要处理的用户
        v_processed := v_processed + 1;
    END LOOP;
    
    RETURN QUERY SELECT 
        v_processed,
        v_total_recs,
        EXTRACT(MILLISECONDS FROM (NOW() - v_start_time))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------
-- 函数: 清理过期推荐记录
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_expired_recommendations()
RETURNS TABLE (
    deleted_count INTEGER,
    execution_time_ms INTEGER
) AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_deleted INTEGER;
BEGIN
    v_start_time := NOW();
    
    WITH deleted AS (
        DELETE FROM public.recommendations
        WHERE expires_at < NOW()
          AND status = 'pending'
        RETURNING *
    )
    SELECT COUNT(*) INTO v_deleted FROM deleted;
    
    RETURN QUERY SELECT 
        v_deleted,
        EXTRACT(MILLISECONDS FROM (NOW() - v_start_time))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 索引优化补充
-- ========================================

-- 为地理位置查询创建空间索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_location_gist 
    ON public.user_profiles USING GIST (location);

-- 为市场价值评分创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_score 
    ON public.user_profiles ((market_value_score->>'totalScore'));

-- ========================================
-- 授权
-- ========================================

GRANT EXECUTE ON FUNCTION public.get_user_full_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_eligible_candidates(UUID, gender_enum, DECIMAL, DECIMAL, INTEGER, INTEGER, INTEGER, verify_level_enum, BOOLEAN, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_user_distance(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_interests(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_interest_overlap(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_batch_recommendations() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_recommendations() TO service_role;

