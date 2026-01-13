-- =========================================================
-- 修复 RLS 策略 - 解决 406 错误
-- 问题：user_memberships 和 payments 表返回 406 错误
-- 原因：RLS 策略在某些情况下阻止了合法查询
-- =========================================================

-- =========================================================
-- 1. 修复 payments 表 RLS 策略
-- =========================================================

-- 删除旧策略
DROP POLICY IF EXISTS payments_select_policy ON public.payments;
DROP POLICY IF EXISTS payments_insert_policy ON public.payments;
DROP POLICY IF EXISTS payments_update_policy ON public.payments;

-- 重新创建 SELECT 策略 - 用户可以查看自己的支付记录
CREATE POLICY payments_select_policy ON public.payments
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR auth.role() = 'service_role'
    );

-- 重新创建 INSERT 策略 - 用户可以创建自己的支付记录
CREATE POLICY payments_insert_policy ON public.payments
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR auth.role() = 'service_role'
    );

-- 重新创建 UPDATE 策略 - 用户可以更新自己的支付记录，或服务端可以更新
CREATE POLICY payments_update_policy ON public.payments
    FOR UPDATE
    USING (
        auth.uid() = user_id
        OR auth.role() = 'service_role'
    );

-- =========================================================
-- 2. 修复 user_memberships 表 RLS 策略
-- =========================================================

-- 删除旧策略
DROP POLICY IF EXISTS user_memberships_select_policy ON public.user_memberships;
DROP POLICY IF EXISTS user_memberships_insert_policy ON public.user_memberships;
DROP POLICY IF EXISTS user_memberships_update_policy ON public.user_memberships;

-- 重新创建 SELECT 策略 - 用户可以查看自己的会员信息
CREATE POLICY user_memberships_select_policy ON public.user_memberships
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR auth.role() = 'service_role'
    );

-- 重新创建 INSERT 策略 - 用户可以创建自己的会员记录
CREATE POLICY user_memberships_insert_policy ON public.user_memberships
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR auth.role() = 'service_role'
    );

-- 重新创建 UPDATE 策略 - 用户可以更新自己的会员记录，或服务端可以更新
CREATE POLICY user_memberships_update_policy ON public.user_memberships
    FOR UPDATE
    USING (
        auth.uid() = user_id
        OR auth.role() = 'service_role'
    );

-- =========================================================
-- 3. 修复 transactions 表 RLS 策略
-- =========================================================

-- 删除旧策略
DROP POLICY IF EXISTS transactions_select_policy ON public.transactions;
DROP POLICY IF EXISTS transactions_insert_policy ON public.transactions;

-- 重新创建 SELECT 策略
CREATE POLICY transactions_select_policy ON public.transactions
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR auth.role() = 'service_role'
    );

-- 重新创建 INSERT 策略
CREATE POLICY transactions_insert_policy ON public.transactions
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR auth.role() = 'service_role'
    );

-- =========================================================
-- 完成
-- =========================================================

COMMENT ON POLICY payments_select_policy ON public.payments IS '允许用户查看自己的支付记录，或服务端查看所有记录';
COMMENT ON POLICY user_memberships_select_policy ON public.user_memberships IS '允许用户查看自己的会员信息，或服务端查看所有记录';
