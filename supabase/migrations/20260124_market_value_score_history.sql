-- =========================================================
-- Market value score history
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_market_value_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_score NUMERIC NOT NULL,
  percentile NUMERIC,
  score_breakdown JSONB,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version TEXT,
  algorithm TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_market_value_score_history_user_id_calculated_at
  ON public.user_market_value_score_history(user_id, calculated_at DESC);

