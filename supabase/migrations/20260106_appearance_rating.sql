-- ========================================
-- Appearance Rating System Migration
-- INTL 环境管理员外貌评分功能
-- ========================================

-- ========================================
-- 添加管理员评分字段到 user_photos 表
-- ========================================

-- 管理员评分 (1-100)
ALTER TABLE public.user_photos
ADD COLUMN IF NOT EXISTS admin_rating INTEGER CHECK (admin_rating >= 1 AND admin_rating <= 100);

-- 评分管理员ID
ALTER TABLE public.user_photos
ADD COLUMN IF NOT EXISTS rated_by UUID REFERENCES public.users(id);

-- 评分时间
ALTER TABLE public.user_photos
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- 添加注释
COMMENT ON COLUMN public.user_photos.admin_rating IS '管理员外貌评分 (1-100), 仅INTL环境使用';
COMMENT ON COLUMN public.user_photos.rated_by IS '评分管理员ID';
COMMENT ON COLUMN public.user_photos.rated_at IS '评分时间';

-- ========================================
-- 创建索引
-- ========================================

-- 评分索引 (仅非空值)
CREATE INDEX IF NOT EXISTS idx_user_photos_admin_rating
ON public.user_photos(admin_rating) WHERE admin_rating IS NOT NULL;

-- 评分者索引
CREATE INDEX IF NOT EXISTS idx_user_photos_rated_by
ON public.user_photos(rated_by) WHERE rated_by IS NOT NULL;

-- ========================================
-- 触发器: 评分变更时标记市场价值需要重算
-- ========================================

CREATE OR REPLACE FUNCTION public.on_photo_rating_update()
RETURNS TRIGGER AS $$
BEGIN
  -- 仅当主照片的评分发生变化时触发
  IF NEW.admin_rating IS DISTINCT FROM OLD.admin_rating AND NEW.is_primary = true THEN
    UPDATE public.user_profiles
    SET market_value_score = CASE
      WHEN market_value_score IS NOT NULL THEN
        jsonb_set(market_value_score, '{needsRecalculation}', 'true'::jsonb)
      ELSE NULL
    END
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS on_photo_rating_changed ON public.user_photos;
CREATE TRIGGER on_photo_rating_changed
  AFTER UPDATE OF admin_rating ON public.user_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.on_photo_rating_update();

-- ========================================
-- RLS 策略: 允许管理员更新评分
-- ========================================

-- 管理员可以更新照片评分 (复用现有的管理员更新策略)
-- 现有策略 "Admins can update photo audit status" 已覆盖此场景
