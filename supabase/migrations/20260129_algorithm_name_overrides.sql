CREATE TABLE IF NOT EXISTS public.algorithm_name_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  algorithm_type algo_type_enum NOT NULL,
  language TEXT NOT NULL,
  display_name TEXT NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT algorithm_name_overrides_language_check CHECK (language IN ('zh', 'en')),
  CONSTRAINT algorithm_name_overrides_unique UNIQUE (algorithm_type, language)
);

