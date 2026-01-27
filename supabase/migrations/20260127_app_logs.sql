-- =========================================================
-- 应用日志表 (app_logs)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.app_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    level TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'server',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_logs_user_id ON public.app_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_category ON public.app_logs(category);
CREATE INDEX IF NOT EXISTS idx_app_logs_occurred_at ON public.app_logs(occurred_at DESC);

ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_logs_select_policy ON public.app_logs;
CREATE POLICY app_logs_select_policy ON public.app_logs
    FOR SELECT
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS app_logs_insert_policy ON public.app_logs;
CREATE POLICY app_logs_insert_policy ON public.app_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

