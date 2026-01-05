-- ========================================
-- Market Value Scoring System Migration
-- 市场价值评分系统数据库迁移
-- ========================================

-- ========================================
-- Task 15: 更新 user_profiles 表结构
-- ========================================

-- 添加 market_value_score 字段 (JSONB类型)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS market_value_score JSONB DEFAULT NULL;

-- 添加注释说明字段结构
COMMENT ON COLUMN public.user_profiles.market_value_score IS '市场价值评分数据，包含 totalScore, scoreBreakdown, percentile, calculatedAt, version';

-- 创建索引: 总分索引 (用于排序和筛选)
CREATE INDEX IF NOT EXISTS idx_market_value_total ON public.user_profiles (
    CAST(
        market_value_score ->> 'totalScore' AS NUMERIC
    )
);

-- 创建索引: 百分位索引 (用于排名查询)
CREATE INDEX IF NOT EXISTS idx_market_value_percentile ON public.user_profiles (
    CAST(
        market_value_score ->> 'percentile' AS INTEGER
    )
);

-- 创建索引: 计算时间索引 (用于判断是否需要重新计算)
CREATE INDEX IF NOT EXISTS idx_market_value_calculated_at ON public.user_profiles (
    (
        market_value_score ->> 'calculatedAt'
    )
);

-- 创建GIN索引用于JSONB字段的快速查询
CREATE INDEX IF NOT EXISTS idx_market_value_score_gin ON public.user_profiles USING GIN (market_value_score);

-- ========================================
-- 添加验证约束
-- ========================================

-- 添加检查约束确保分数在有效范围内
ALTER TABLE public.user_profiles
ADD CONSTRAINT check_market_value_total_score 
CHECK (
  market_value_score IS NULL 
  OR (
    (market_value_score->>'totalScore')::NUMERIC >= 0 
    AND (market_value_score->>'totalScore')::NUMERIC <= 100
  )
);

-- 添加检查约束确保百分位在有效范围内
ALTER TABLE public.user_profiles
ADD CONSTRAINT check_market_value_percentile 
CHECK (
  market_value_score IS NULL 
  OR market_value_score->>'percentile' IS NULL
  OR (
    (market_value_score->>'percentile')::INTEGER >= 0 
    AND (market_value_score->>'percentile')::INTEGER <= 100
  )
);

-- ========================================
-- Task 16: 创建评分计算相关函数
-- ========================================

-- 函数: 触发评分重新计算（标记需要重新计算）
CREATE OR REPLACE FUNCTION public.mark_score_for_recalculation()
RETURNS TRIGGER AS $$
BEGIN
  -- 当用户资料发生变化时，标记评分需要重新计算
  -- 通过设置 calculatedAt 为 null 来标记
  IF NEW.market_value_score IS NOT NULL THEN
    NEW.market_value_score = jsonb_set(
      NEW.market_value_score,
      '{needsRecalculation}',
      'true'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器: 监听 user_profiles 表的更新
-- 当以下字段变化时触发: education_level, company_type, annual_income_range,
-- marital_status, relationship_history_count, children_preference, bmi
DROP TRIGGER IF EXISTS on_profile_update_mark_score ON public.user_profiles;

CREATE TRIGGER on_profile_update_mark_score
  BEFORE UPDATE OF 
    education_level, 
    company_type, 
    annual_income_range,
    marital_status,
    relationship_history_count,
    children_preference,
    height_cm,
    weight_kg,
    mbti,
    location
  ON public.user_profiles
  FOR EACH ROW
  WHEN (
    OLD.education_level IS DISTINCT FROM NEW.education_level OR
    OLD.company_type IS DISTINCT FROM NEW.company_type OR
    OLD.annual_income_range IS DISTINCT FROM NEW.annual_income_range OR
    OLD.marital_status IS DISTINCT FROM NEW.marital_status OR
    OLD.relationship_history_count IS DISTINCT FROM NEW.relationship_history_count OR
    OLD.children_preference IS DISTINCT FROM NEW.children_preference OR
    OLD.height_cm IS DISTINCT FROM NEW.height_cm OR
    OLD.weight_kg IS DISTINCT FROM NEW.weight_kg OR
    OLD.mbti IS DISTINCT FROM NEW.mbti OR
    OLD.location IS DISTINCT FROM NEW.location
  )
  EXECUTE FUNCTION public.mark_score_for_recalculation();

-- 函数: 监听用户基本信息变化（性别、生日）
CREATE OR REPLACE FUNCTION public.mark_user_score_for_recalculation()
RETURNS TRIGGER AS $$
BEGIN
  -- 当用户性别或生日变化时，更新 user_profiles 中的标记
  UPDATE public.user_profiles
  SET market_value_score = CASE 
    WHEN market_value_score IS NOT NULL THEN
      jsonb_set(market_value_score, '{needsRecalculation}', 'true'::jsonb)
    ELSE NULL
  END
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器: 监听 users 表的更新
DROP TRIGGER IF EXISTS on_user_update_mark_score ON public.users;

CREATE TRIGGER on_user_update_mark_score
  AFTER UPDATE OF gender, birth_date
  ON public.users
  FOR EACH ROW
  WHEN (
    OLD.gender IS DISTINCT FROM NEW.gender OR
    OLD.birth_date IS DISTINCT FROM NEW.birth_date
  )
  EXECUTE FUNCTION public.mark_user_score_for_recalculation();

-- ========================================
-- Task 17: 百分位计算函数
-- ========================================

-- 函数: 计算用户在同性别中的百分位排名
CREATE OR REPLACE FUNCTION public.calculate_score_percentile(
  p_user_id UUID,
  p_total_score NUMERIC
)
RETURNS INTEGER AS $$
DECLARE
  v_gender gender_enum;
  v_lower_count INTEGER;
  v_total_count INTEGER;
  v_percentile INTEGER;
BEGIN
  -- 获取用户性别
  SELECT gender INTO v_gender
  FROM public.users
  WHERE id = p_user_id;
  
  IF v_gender IS NULL THEN
    RETURN 50; -- 默认百分位
  END IF;
  
  -- 统计同性别中分数低于当前用户的数量
  SELECT 
    COUNT(*) FILTER (WHERE (up.market_value_score->>'totalScore')::NUMERIC < p_total_score),
    COUNT(*)
  INTO v_lower_count, v_total_count
  FROM public.users u
  JOIN public.user_profiles up ON u.id = up.user_id
  WHERE u.gender = v_gender
    AND u.id != p_user_id
    AND up.market_value_score IS NOT NULL
    AND up.market_value_score->>'totalScore' IS NOT NULL;
  
  -- 计算百分位
  IF v_total_count = 0 THEN
    v_percentile := 50;
  ELSE
    v_percentile := ROUND((v_lower_count::NUMERIC / v_total_count) * 100);
  END IF;
  
  RETURN v_percentile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数: 获取分数统计信息
CREATE OR REPLACE FUNCTION public.get_score_statistics(
  p_gender gender_enum DEFAULT NULL
)
RETURNS TABLE (
  avg_score NUMERIC,
  median_score NUMERIC,
  min_score NUMERIC,
  max_score NUMERIC,
  total_users INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG((up.market_value_score->>'totalScore')::NUMERIC), 2) as avg_score,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (up.market_value_score->>'totalScore')::NUMERIC), 2) as median_score,
    MIN((up.market_value_score->>'totalScore')::NUMERIC) as min_score,
    MAX((up.market_value_score->>'totalScore')::NUMERIC) as max_score,
    COUNT(*)::INTEGER as total_users
  FROM public.users u
  JOIN public.user_profiles up ON u.id = up.user_id
  WHERE up.market_value_score IS NOT NULL
    AND up.market_value_score->>'totalScore' IS NOT NULL
    AND (p_gender IS NULL OR u.gender = p_gender);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数: 获取分数分布
CREATE OR REPLACE FUNCTION public.get_score_distribution(
  p_gender gender_enum DEFAULT NULL,
  p_bucket_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  score_range TEXT,
  user_count INTEGER,
  percentage NUMERIC
) AS $$
DECLARE
  v_total INTEGER;
BEGIN
  -- 获取总数
  SELECT COUNT(*) INTO v_total
  FROM public.users u
  JOIN public.user_profiles up ON u.id = up.user_id
  WHERE up.market_value_score IS NOT NULL
    AND up.market_value_score->>'totalScore' IS NOT NULL
    AND (p_gender IS NULL OR u.gender = p_gender);
  
  RETURN QUERY
  SELECT
    CASE 
      WHEN bucket * p_bucket_size >= 100 THEN '90-100'
      ELSE (bucket * p_bucket_size)::TEXT || '-' || ((bucket + 1) * p_bucket_size)::TEXT
    END as score_range,
    cnt::INTEGER as user_count,
    ROUND((cnt::NUMERIC / NULLIF(v_total, 0)) * 100, 2) as percentage
  FROM (
    SELECT 
      FLOOR((up.market_value_score->>'totalScore')::NUMERIC / p_bucket_size) as bucket,
      COUNT(*) as cnt
    FROM public.users u
    JOIN public.user_profiles up ON u.id = up.user_id
    WHERE up.market_value_score IS NOT NULL
      AND up.market_value_score->>'totalScore' IS NOT NULL
      AND (p_gender IS NULL OR u.gender = p_gender)
    GROUP BY bucket
    ORDER BY bucket
  ) distribution;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- RLS 策略更新
-- ========================================

-- 允许用户查看自己的评分
DROP POLICY IF EXISTS "Users can view own market value" ON public.user_profiles;

CREATE POLICY "Users can view own market value" ON public.user_profiles FOR
SELECT USING (auth.uid () = user_id);

-- 允许用户更新自己的评分
DROP POLICY IF EXISTS "Users can update own market value" ON public.user_profiles;

CREATE POLICY "Users can update own market value" ON public.user_profiles FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- ========================================
-- 授权
-- ========================================

-- 授权函数执行权限
GRANT EXECUTE ON FUNCTION public.calculate_score_percentile(UUID, NUMERIC) TO authenticated;

GRANT
EXECUTE ON FUNCTION public.get_score_statistics (gender_enum) TO authenticated;

GRANT
EXECUTE ON FUNCTION public.get_score_distribution (gender_enum, INTEGER) TO authenticated;