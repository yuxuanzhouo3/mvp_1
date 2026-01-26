-- 创建管理员用户表
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- 插入默认管理员账户 (用户名: admin, 密码: Zyx!213416)
-- 密码哈希使用 bcrypt 生成
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', '$2b$10$U5waw36aqHCgCbBPoDGnuuaV/4ZobOfJKpObE5KQe8eg/vNcDWLEO')
ON CONFLICT (username) DO UPDATE SET password_hash = '$2b$10$U5waw36aqHCgCbBPoDGnuuaV/4ZobOfJKpObE5KQe8eg/vNcDWLEO';
