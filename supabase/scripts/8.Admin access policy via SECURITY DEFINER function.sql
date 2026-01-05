-- ========================================
-- 修复无限递归问题
-- ========================================

-- 步骤1: 禁用 admin_roles 的 RLS（因为它只用于权限检查，不包含敏感数据）
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;

-- 或者如果你想保留 RLS，使用 SECURITY DEFINER 函数
-- 步骤2: 创建 SECURITY DEFINER 函数来检查管理员权限
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 步骤3: 更新 user_photos 的管理员策略使用函数而不是直接查询
DROP POLICY IF EXISTS "Admins can view all photos" ON public.user_photos;
CREATE POLICY "Admins can view all photos" ON public.user_photos
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update photo audit status" ON public.user_photos;
CREATE POLICY "Admins can update photo audit status" ON public.user_photos
  FOR UPDATE USING (public.is_admin());

-- 步骤4: 更新 photo_audit_logs 的策略
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.photo_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.photo_audit_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.photo_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.photo_audit_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- 授权函数给认证用户
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
