-- =========================================================
-- 支付和积分系统数据库迁移
-- 基于 PersonaLink PRD v2.0
-- =========================================================

-- =========================================================
-- Phase 1: 添加积分字段到 user_profiles 表
-- =========================================================

-- 添加 credits 字段到 user_profiles 表
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'credits'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN credits INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'credits_updated_at'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN credits_updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 添加检查约束确保积分不为负数
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE constraint_name = 'user_profiles_credits_non_negative'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD CONSTRAINT user_profiles_credits_non_negative CHECK (credits >= 0);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================
-- Phase 2: 创建支付记录表 (payments)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- 支付金额信息
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    credits INTEGER NOT NULL, -- 对应的积分数量

    -- 支付方式
    payment_method VARCHAR(20) NOT NULL, -- stripe, paypal, alipay

    -- 支付状态
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled, refunded

    -- 第三方支付信息
    stripe_payment_intent_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    paypal_order_id VARCHAR(255),
    paypal_capture_id VARCHAR(255),

    -- 失败/取消原因
    failure_reason TEXT,

    -- 元数据（存储额外信息）
    metadata JSONB DEFAULT '{}'::JSONB,

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- 确保支付方式有效
    CONSTRAINT valid_payment_method CHECK (payment_method IN ('stripe', 'paypal', 'alipay')),

    -- 确保状态有效
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'))
);

-- 支付表索引
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON public.payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON public.payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_stripe_checkout_session_id ON public.payments(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_paypal_order_id ON public.payments(paypal_order_id) WHERE paypal_order_id IS NOT NULL;

-- =========================================================
-- Phase 3: 创建交易流水表 (transactions)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- 交易类型
    type VARCHAR(30) NOT NULL, -- credit_purchase, credit_consume_match, credit_consume_message, refund, admin_adjust

    -- 积分变动
    amount INTEGER NOT NULL, -- 正数增加，负数减少
    balance_before INTEGER NOT NULL, -- 交易前余额
    balance_after INTEGER NOT NULL, -- 交易后余额

    -- 关联信息
    reference_type VARCHAR(50), -- payment, match, message, admin
    reference_id UUID, -- 关联的支付ID/匹配ID/消息ID等

    -- 描述
    description TEXT,

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 确保交易类型有效
    CONSTRAINT valid_transaction_type CHECK (type IN ('credit_purchase', 'credit_consume_match', 'credit_consume_message', 'refund', 'admin_adjust'))
);

-- 交易流水表索引
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON public.transactions(reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- =========================================================
-- Phase 4: 配置 Row Level Security (RLS)
-- =========================================================

-- 启用 RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- payments RLS 策略

-- 用户只能查看自己的支付记录
DROP POLICY IF EXISTS payments_select_policy ON public.payments;
CREATE POLICY payments_select_policy ON public.payments
    FOR SELECT
    USING (auth.uid() = user_id);

-- 用户可以创建自己的支付记录
DROP POLICY IF EXISTS payments_insert_policy ON public.payments;
CREATE POLICY payments_insert_policy ON public.payments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 系统可以更新支付状态（通过 service role）
DROP POLICY IF EXISTS payments_update_policy ON public.payments;
CREATE POLICY payments_update_policy ON public.payments
    FOR UPDATE
    USING (auth.uid() = user_id OR current_setting('role', true) = 'service_role');

-- transactions RLS 策略

-- 用户只能查看自己的交易记录
DROP POLICY IF EXISTS transactions_select_policy ON public.transactions;
CREATE POLICY transactions_select_policy ON public.transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- 系统可以创建交易记录（通过 service role 或触发器）
DROP POLICY IF EXISTS transactions_insert_policy ON public.transactions;
CREATE POLICY transactions_insert_policy ON public.transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR current_setting('role', true) = 'service_role');

-- =========================================================
-- Phase 5: 创建积分相关函数
-- =========================================================

-- 函数：获取用户积分余额
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_credits INTEGER;
BEGIN
    SELECT COALESCE(credits, 0) INTO v_credits
    FROM public.user_profiles
    WHERE user_id = p_user_id;

    RETURN COALESCE(v_credits, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数：添加积分（充值后调用）
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_payment_id UUID,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, error_message TEXT) AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- 参数验证
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 0, '积分数量必须大于0'::TEXT;
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

    v_new_balance := v_current_balance + p_amount;

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
        p_user_id, 'credit_purchase', p_amount, v_current_balance, v_new_balance,
        'payment', p_payment_id, COALESCE(p_description, '充值积分')
    );

    RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数：消费积分
CREATE OR REPLACE FUNCTION consume_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_type VARCHAR(30), -- 'credit_consume_match' or 'credit_consume_message'
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

    IF p_type NOT IN ('credit_consume_match', 'credit_consume_message') THEN
        RETURN QUERY SELECT FALSE, 0, '无效的消费类型'::TEXT;
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
            WHEN p_type = 'credit_consume_match' THEN 'match'
            WHEN p_type = 'credit_consume_message' THEN 'message'
            ELSE 'other'
        END,
        p_reference_id,
        COALESCE(p_description,
            CASE
                WHEN p_type = 'credit_consume_match' THEN '发起匹配'
                WHEN p_type = 'credit_consume_message' THEN '发送消息'
                ELSE '积分消费'
            END
        )
    );

    RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数：检查用户积分是否足够
CREATE OR REPLACE FUNCTION check_user_credits(p_user_id UUID, p_required INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_credits INTEGER;
BEGIN
    SELECT COALESCE(credits, 0) INTO v_credits
    FROM public.user_profiles
    WHERE user_id = p_user_id;

    RETURN COALESCE(v_credits, 0) >= p_required;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- Phase 6: 创建触发器
-- =========================================================

-- 触发器：更新 payments.updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON public.payments;
CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- 触发器：支付完成后自动添加积分
CREATE OR REPLACE FUNCTION on_payment_completed()
RETURNS TRIGGER AS $$
BEGIN
    -- 只在状态变为 completed 时触发
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- 更新完成时间
        NEW.completed_at = NOW();

        -- 添加积分
        PERFORM add_user_credits(
            NEW.user_id,
            NEW.credits,
            NEW.id,
            '购买积分包'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_payment_completed ON public.payments;
CREATE TRIGGER trigger_on_payment_completed
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION on_payment_completed();

-- =========================================================
-- Phase 7: 创建视图
-- =========================================================

-- 视图：用户积分和支付摘要
CREATE OR REPLACE VIEW v_user_credits_summary AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    COALESCE(up.credits, 0) AS credits,
    up.credits_updated_at,
    (
        SELECT COUNT(*)
        FROM public.payments p
        WHERE p.user_id = u.id AND p.status = 'completed'
    ) AS total_payments,
    (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM public.payments p
        WHERE p.user_id = u.id AND p.status = 'completed'
    ) AS total_spent,
    (
        SELECT COALESCE(SUM(p.credits), 0)
        FROM public.payments p
        WHERE p.user_id = u.id AND p.status = 'completed'
    ) AS total_credits_purchased
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id;

-- =========================================================
-- 完成
-- =========================================================

COMMENT ON TABLE public.payments IS '支付记录表 - 存储用户充值记录';
COMMENT ON TABLE public.transactions IS '交易流水表 - 存储积分变动记录';
COMMENT ON COLUMN public.user_profiles.credits IS '用户当前积分余额';
COMMENT ON COLUMN public.user_profiles.credits_updated_at IS '积分最后更新时间';
