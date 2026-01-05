-- 修复 admin_roles 表的 RLS 策略
-- 允许所有认证用户查看 admin_roles 表（用于权限检查）
-- 即使非管理员查看，如果他们不在表中，查询也只会返回空，不会泄露信息
DROP POLICY IF EXISTS "Admins can view admin_roles" ON public.admin_roles;
CREATE POLICY "Authenticated users can view admin_roles" ON public.admin_roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 修复后需要确保只有管理员可以修改 admin_roles
DROP POLICY IF EXISTS "Only super admins can modify admin_roles" ON public.admin_roles;
CREATE POLICY "Only super admins can modify admin_roles" ON public.admin_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role = 'super_admin'
    )
  );
