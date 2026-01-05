-- 修复 get_score_statistics 函数中的 ROUND 类型问题
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
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (up.market_value_score->>'totalScore')::NUMERIC)::NUMERIC, 2) as median_score,
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
