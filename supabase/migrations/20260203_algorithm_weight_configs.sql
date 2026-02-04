CREATE TABLE IF NOT EXISTS public.algorithm_weight_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  algorithm_type algo_type_enum NOT NULL,
  evaluator_gender gender_enum NOT NULL,
  target_gender gender_enum NOT NULL,
  weights JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT algorithm_weight_configs_gender_check
    CHECK (evaluator_gender IN ('male', 'female') AND target_gender IN ('male', 'female')),
  CONSTRAINT algorithm_weight_configs_unique
    UNIQUE (algorithm_type, evaluator_gender, target_gender)
);
