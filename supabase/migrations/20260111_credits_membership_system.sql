-- =========================================================
-- 积分套餐与会员系统数据库迁移
-- 基于 PersonaLink PRD v2.0 - 积分购买套餐任务清单
-- =========================================================

-- =========================================================
-- Phase 1: 创建积分充值套餐配置表 (credit_packages)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.credit_packages (
    id VARCHAR(50) PRIMARY KEY,
    name_en VARCHAR(100) NOT NULL,
    name_zh VARCHAR(100) NOT NULL,
    credits INTEGER NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    price_cny DECIMAL(10,2) NOT NULL,
    original_price_usd DECIMAL(10,2),
    original_price_cny DECIMAL(10,2),
    discount_percent INTEGER DEFAULT 0,
    bonus_boost INTEGER DEFAULT 0, -- 赠送 Boost 次数
    bonus_premium_days INTEGER DEFAULT 0, -- 赠送 Premium 体验天数
    bonus_vip_days INTEGER DEFAULT 0, -- 赠送 VIP 体验天数
    is_popular BOOLEAN DEFAULT FALSE,
    is_best_value BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认套餐数据
INSERT INTO public.credit_packages (id, name_en, name_zh, credits, price_usd, price_cny, original_price_usd, original_price_cny, discount_percent, bonus_boost, bonus_premium_days, bonus_vip_days, is_popular, is_best_value, sort_order)
VALUES
    ('starter', 'Starter Pack', '入门包', 50, 1.39, 9.99, NULL, NULL, 0, 0, 0, 0, FALSE, FALSE, 1),
    ('popular', 'Popular Pack', '热门包', 150, 3.49, 24.99, 4.39, 29.99, 20, 1, 0, 0, TRUE, FALSE, 2),
    ('premium', 'Premium Pack', '高级包', 300, 6.29, 44.99, 8.39, 59.99, 25, 0, 3, 0, FALSE, TRUE, 3),
    ('ultimate', 'Ultimate Pack', '终极包', 500, 9.79, 69.99, 13.99, 99.99, 30, 0, 0, 7, FALSE, FALSE, 4)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- Phase 2: 创建会员等级配置表 (membership_tiers)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.membership_tiers (
    id VARCHAR(50) PRIMARY KEY,
    name_en VARCHAR(100) NOT NULL,
    name_zh VARCHAR(100) NOT NULL,
    monthly_price_usd DECIMAL(10,2) NOT NULL,
    monthly_price_cny DECIMAL(10,2) NOT NULL,
    monthly_credits INTEGER DEFAULT 0, -- 每月赠送积分
    features JSONB DEFAULT '[]'::JSONB, -- 权益列表
    -- 具体权益字段
    unlimited_likes BOOLEAN DEFAULT FALSE,
    can_see_who_likes_me BOOLEAN DEFAULT FALSE,
    priority_matching BOOLEAN DEFAULT FALSE,
    invisible_mode BOOLEAN DEFAULT FALSE,
    change_location BOOLEAN DEFAULT FALSE,
    no_ads BOOLEAN DEFAULT FALSE,
    vip_support BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认会员等级
INSERT INTO public.membership_tiers (id, name_en, name_zh, monthly_price_usd, monthly_price_cny, monthly_credits, unlimited_likes, can_see_who_likes_me, priority_matching, invisible_mode, change_location, no_ads, vip_support, sort_order, features)
VALUES
    ('free', 'Free', '免费版', 0.00, 0.00, 0, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 1,
     '["每日有限 Like", "基础匹配功能", "含广告"]'::JSONB),
    ('basic', 'Basic', '基础版', 4.99, 35.99, 100, TRUE, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, 2,
     '["无限 Like", "每月赠送 100 积分", "去广告"]'::JSONB),
    ('premium', 'Premium', '高级版', 9.99, 71.99, 300, TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, FALSE, 3,
     '["包含基础版所有权益", "优先匹配", "查看谁喜欢我", "每月赠送 300 积分"]'::JSONB),
    ('vip', 'VIP', 'VIP尊享版', 19.99, 143.99, 600, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 4,
     '["包含高级版所有权益", "隐身模式", "修改定位", "24/7 专属客服", "每月赠送 600 积分"]'::JSONB)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- Phase 3: 创建用户会员表 (user_memberships)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL DEFAULT 'free' REFERENCES public.membership_tiers(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT FALSE,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    paypal_subscription_id VARCHAR(255),
    last_credits_grant_at TIMESTAMPTZ, -- 上次积分发放时间
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 用户会员表索引
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON public.user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_tier ON public.user_memberships(tier);
CREATE INDEX IF NOT EXISTS idx_user_memberships_expires_at ON public.user_memberships(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_memberships_stripe_subscription_id ON public.user_memberships(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- =========================================================
-- Phase 4: 创建用户曝光加速表 (user_boosts)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_boosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    credits_consumed INTEGER NOT NULL DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户曝光加速表索引
CREATE INDEX IF NOT EXISTS idx_user_boosts_user_id ON public.user_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boosts_expires_at ON public.user_boosts(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_boosts_is_active ON public.user_boosts(is_active) WHERE is_active = TRUE;

-- =========================================================
-- Phase 5: 更新交易类型约束
-- =========================================================

-- 删除旧的约束并添加新的
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS valid_transaction_type;
ALTER TABLE public.transactions ADD CONSTRAINT valid_transaction_type CHECK (
    type IN (
        'credit_purchase',       -- 购买积分
        'credit_consume_like',   -- 消费-喜欢
        'credit_consume_super_like', -- 消费-超级喜欢
        'credit_consume_rewind', -- 消费-撤销
        'credit_consume_boost',  -- 消费-曝光加速
        'credit_consume_view_liker', -- 消费-查看谁喜欢我
        'credit_consume_message', -- 消费-发送消息
        'credit_consume_match',  -- 兼容旧的匹配消费
        'membership_grant',      -- 会员每月赠送
        'bonus_grant',           -- 购买套餐赠送
        'refund',                -- 退款
        'admin_adjust'           -- 管理员调整
    )
);

-- =========================================================
-- Phase 6: 配置 Row Level Security (RLS)
-- =========================================================

-- 启用 RLS
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_boosts ENABLE ROW LEVEL SECURITY;

-- credit_packages RLS 策略 (所有人可读)
DROP POLICY IF EXISTS credit_packages_select_policy ON public.credit_packages;
CREATE POLICY credit_packages_select_policy ON public.credit_packages
    FOR SELECT
    USING (is_active = TRUE);

-- membership_tiers RLS 策略 (所有人可读)
DROP POLICY IF EXISTS membership_tiers_select_policy ON public.membership_tiers;
CREATE POLICY membership_tiers_select_policy ON public.membership_tiers
    FOR SELECT
    USING (is_active = TRUE);

-- user_memberships RLS 策略
DROP POLICY IF EXISTS user_memberships_select_policy ON public.user_memberships;
CREATE POLICY user_memberships_select_policy ON public.user_memberships
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_memberships_insert_policy ON public.user_memberships;
CREATE POLICY user_memberships_insert_policy ON public.user_memberships
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_memberships_update_policy ON public.user_memberships;
CREATE POLICY user_memberships_update_policy ON public.user_memberships
    FOR UPDATE
    USING (auth.uid() = user_id OR current_setting('role', true) = 'service_role');

-- user_boosts RLS 策略
DROP POLICY IF EXISTS user_boosts_select_policy ON public.user_boosts;
CREATE POLICY user_boosts_select_policy ON public.user_boosts
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_boosts_insert_policy ON public.user_boosts;
CREATE POLICY user_boosts_insert_policy ON public.user_boosts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- Phase 7: 创建会员相关函数
-- =========================================================

-- 函数：获取用户会员信息
CREATE OR REPLACE FUNCTION get_user_membership(p_user_id UUID)
RETURNS TABLE (
    tier VARCHAR(50),
    tier_name_en VARCHAR(100),
    tier_name_zh VARCHAR(100),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN,
    unlimited_likes BOOLEAN,
    can_see_who_likes_me BOOLEAN,
    priority_matching BOOLEAN,
    invisible_mode BOOLEAN,
    change_location BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(um.tier, 'free')::VARCHAR(50) AS tier,
        mt.name_en,
        mt.name_zh,
        um.expires_at,
        CASE
            WHEN um.tier IS NULL THEN TRUE
            WHEN um.tier = 'free' THEN TRUE
            WHEN um.expires_at IS NULL THEN TRUE
            WHEN um.expires_at > NOW() THEN TRUE
            ELSE FALSE
        END AS is_active,
        COALESCE(mt.unlimited_likes, FALSE),
        COALESCE(mt.can_see_who_likes_me, FALSE),
        COALESCE(mt.priority_matching, FALSE),
        COALESCE(mt.invisible_mode, FALSE),
        COALESCE(mt.change_location, FALSE)
    FROM public.membership_tiers mt
    LEFT JOIN public.user_memberships um ON um.tier = mt.id AND um.user_id = p_user_id
    WHERE mt.id = COALESCE(
        (SELECT tier FROM public.user_memberships WHERE user_id = p_user_id),
        'free'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数：检查用户是否有活跃的 Boost
CREATE OR REPLACE FUNCTION check_user_has_active_boost(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_boosts
        WHERE user_id = p_user_id
        AND is_active = TRUE
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数：创建用户 Boost
CREATE OR REPLACE FUNCTION create_user_boost(
    p_user_id UUID,
    p_duration_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (success BOOLEAN, boost_id UUID, expires_at TIMESTAMPTZ, error_message TEXT) AS $$
DECLARE
    v_boost_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 检查是否已有活跃的 Boost
    IF check_user_has_active_boost(p_user_id) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, '您已有活跃的曝光加速'::TEXT;
        RETURN;
    END IF;

    v_expires_at := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;

    -- 创建 Boost 记录
    INSERT INTO public.user_boosts (user_id, expires_at, credits_consumed)
    VALUES (p_user_id, v_expires_at, 2)
    RETURNING id INTO v_boost_id;

    RETURN QUERY SELECT TRUE, v_boost_id, v_expires_at, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数：消费积分（扩展版，支持更多类型）
CREATE OR REPLACE FUNCTION consume_user_credits_v2(
    p_user_id UUID,
    p_amount INTEGER,
    p_type VARCHAR(50),
    p_reference_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, error_message TEXT) AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- 参数验证
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 0, '消费积分数量必须大于0'::TEXT;
        RETURN;
    END IF;

    -- 获取当前余额并锁定行
    SELECT COALESCE(credits, 0) INTO v_current_balance
    FROM public.user_profiles
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, '用户不存在'::TEXT;
        RETURN;
    END IF;

    -- 检查余额是否足够
    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT FALSE, v_current_balance, '积分余额不足'::TEXT;
        RETURN;
    END IF;

    v_new_balance := v_current_balance - p_amount;

    -- 更新用户积分
    UPDATE public.user_profiles
    SET
        credits = v_new_balance,
        credits_updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 创建交易记录
    INSERT INTO public.transactions (
        user_id, type, amount, balance_before, balance_after,
        reference_type, reference_id, description
    ) VALUES (
        p_user_id, p_type, -p_amount, v_current_balance, v_new_balance,
        CASE
            WHEN p_type LIKE '%like%' THEN 'swipe'
            WHEN p_type LIKE '%rewind%' THEN 'swipe'
            WHEN p_type LIKE '%boost%' THEN 'boost'
            WHEN p_type LIKE '%view_liker%' THEN 'profile'
            WHEN p_type LIKE '%message%' THEN 'message'
            ELSE 'other'
        END,
        p_reference_id,
        p_description
    );

    RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- Phase 8: 创建触发器
-- =========================================================

-- 触发器函数：自动停用过期的 Boost
CREATE OR REPLACE FUNCTION deactivate_expired_boosts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_boosts
    SET is_active = FALSE
    WHERE expires_at < NOW() AND is_active = TRUE;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 触发器：更新 user_memberships.updated_at
CREATE OR REPLACE FUNCTION update_user_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_memberships_updated_at ON public.user_memberships;
CREATE TRIGGER trigger_update_user_memberships_updated_at
    BEFORE UPDATE ON public.user_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_user_memberships_updated_at();

-- 触发器：更新 credit_packages.updated_at
CREATE OR REPLACE FUNCTION update_credit_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_credit_packages_updated_at ON public.credit_packages;
CREATE TRIGGER trigger_update_credit_packages_updated_at
    BEFORE UPDATE ON public.credit_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_packages_updated_at();

-- =========================================================
-- Phase 9: 创建视图
-- =========================================================

-- 视图：用户完整会员信息
CREATE OR REPLACE VIEW v_user_membership_details AS
SELECT
    u.id AS user_id,
    u.username,
    COALESCE(um.tier, 'free') AS tier,
    mt.name_en AS tier_name_en,
    mt.name_zh AS tier_name_zh,
    um.started_at,
    um.expires_at,
    um.auto_renew,
    CASE
        WHEN um.tier IS NULL THEN TRUE
        WHEN um.tier = 'free' THEN TRUE
        WHEN um.expires_at IS NULL THEN TRUE
        WHEN um.expires_at > NOW() THEN TRUE
        ELSE FALSE
    END AS is_active,
    mt.unlimited_likes,
    mt.can_see_who_likes_me,
    mt.priority_matching,
    mt.invisible_mode,
    mt.change_location,
    mt.no_ads,
    mt.vip_support,
    mt.monthly_credits
FROM public.users u
LEFT JOIN public.user_memberships um ON u.id = um.user_id
LEFT JOIN public.membership_tiers mt ON COALESCE(um.tier, 'free') = mt.id;

-- 视图：活跃的 Boost 用户列表（用于推荐算法）
CREATE OR REPLACE VIEW v_active_boosted_users AS
SELECT DISTINCT
    user_id,
    MAX(expires_at) AS boost_expires_at
FROM public.user_boosts
WHERE is_active = TRUE AND expires_at > NOW()
GROUP BY user_id;

-- =========================================================
-- 完成
-- =========================================================

COMMENT ON TABLE public.credit_packages IS '积分充值套餐配置表';
COMMENT ON TABLE public.membership_tiers IS '会员等级配置表';
COMMENT ON TABLE public.user_memberships IS '用户会员订阅表';
COMMENT ON TABLE public.user_boosts IS '用户曝光加速记录表';
