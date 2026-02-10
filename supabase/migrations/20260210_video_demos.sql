-- =========================================================
-- video_demos 表：视频演示管理
-- 存储 Profile Setup 页面的演示视频信息
-- =========================================================

CREATE TABLE IF NOT EXISTS public.video_demos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- 索引：快速查找激活的视频记录
CREATE INDEX IF NOT EXISTS video_demos_is_active_idx
  ON public.video_demos (is_active)
  WHERE is_active = TRUE;
