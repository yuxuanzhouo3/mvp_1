# PersonaLink 数据库配置指南

## 🗄️ 数据库配置信息

### Supabase 配置
- **项目 URL**: https://bamratexknmqvdbalzen.supabase.co
- **匿名密钥**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTM4NzEsImV4cCI6MjA2ODA4OTg3MX0.yYa98ioJLLouUgHWITGb7U_VjNCTUuM-5NcraM7f3zA
- **区域**: West US
- **邮箱**: mornscience@163.com

### Redis 配置 (Upstash)
- **URL**: https://firm-minnow-40919.upstash.io
- **Token**: AZ_XAAIjcDEwOWFkMDEwOTFjMTE0YTdjYWY5MTE3OWNlNGQ0MWQxNHAxMA

## 🚀 快速设置步骤

### 1. 环境变量配置

创建 `.env.local` 文件并添加以下配置：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://bamratexknmqvdbalzen.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTM4NzEsImV4cCI6MjA2ODA4OTg3MX0.yYa98ioJLLouUgHWITGb7U_VjNCTUuM-5NcraM7f3zA
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Redis 配置 (Upstash)
UPSTASH_REDIS_REST_URL=https://firm-minnow-40919.upstash.io
UPSTASH_REDIS_REST_TOKEN=AZ_XAAIjcDEwOWFkMDEwOTFjMTE0YTdjYWY5MTE3OWNlNGQ0MWQxNHAxMA

# 支付配置
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# AI 配置
OPENAI_API_KEY=sk-...

# 短信配置
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

### 2. 安装依赖

```bash
npm install
# 或者
yarn install
```

### 3. 初始化数据库

#### 方法一：使用 Supabase Dashboard

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目 `bamratexknmqvdbalzen`
3. 进入 SQL Editor
4. 复制 `database/init.sql` 文件内容
5. 执行 SQL 脚本

#### 方法二：使用命令行

```bash
# 安装 PostgreSQL 客户端
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# 连接到数据库并执行初始化脚本
psql "postgresql://postgres:[YOUR-PASSWORD]@db.bamratexknmqvdbalzen.supabase.co:5432/postgres" -f database/init.sql
```

### 4. 验证配置

#### 测试 Supabase 连接

```bash
npm run dev
```

访问 http://localhost:3000 并尝试注册/登录

#### 测试 Redis 连接

```bash
# 在项目根目录创建测试脚本
node -e "
const { redis } = require('./lib/redis');
async function test() {
  await redis.set('test', 'Hello Redis!');
  const value = await redis.get('test');
  console.log('Redis test:', value);
}
test();
"
```

## 📊 数据库表结构

### 核心表

1. **profiles** - 用户资料表
2. **matches** - 匹配记录表
3. **user_likes** - 用户互动表
4. **chats** - 聊天会话表
5. **messages** - 消息表
6. **transactions** - 交易记录表
7. **user_activities** - 用户活动表
8. **system_settings** - 系统设置表

### 数据库函数

1. **get_user_stats(user_id)** - 获取用户统计
2. **get_match_recommendations(user_id, limit)** - 获取匹配推荐
3. **get_chat_stats(user_id)** - 获取聊天统计

## 🔒 安全配置

### Row Level Security (RLS)

所有表都已启用 RLS，并配置了相应的访问策略：

- 用户只能访问自己的数据
- 已验证用户可以看到其他用户的公开资料
- 聊天和消息只能被参与者访问
- 交易记录只能被用户本人访问

### 索引优化

为常用查询字段创建了索引：

- 用户资料：位置、年龄、性别、兴趣
- 匹配记录：用户ID、匹配ID、分数、状态
- 消息：聊天ID、发送者ID、创建时间
- 交易：用户ID、类型、状态

## 🧪 测试数据

### 插入测试用户

```sql
-- 插入测试用户资料
INSERT INTO profiles (id, full_name, avatar_url, bio, location, age, gender, interests, industry, communication_style, personality_traits, is_verified) VALUES
('550e8400-e29b-41d4-a716-446655440001', '张三', 'https://example.com/avatar1.jpg', '热爱生活，喜欢旅行', '北京', 25, 'male', ARRAY['旅行', '摄影', '美食'], '科技', 'extrovert', ARRAY['乐观', '友善'], true),
('550e8400-e29b-41d4-a716-446655440002', '李四', 'https://example.com/avatar2.jpg', '安静内敛，喜欢阅读', '上海', 28, 'female', ARRAY['阅读', '音乐', '电影'], '教育', 'introvert', ARRAY['细心', '耐心'], true),
('550e8400-e29b-41d4-a716-446655440003', '王五', 'https://example.com/avatar3.jpg', '活泼开朗，喜欢运动', '广州', 26, 'male', ARRAY['运动', '健身', '户外'], '体育', 'extrovert', ARRAY['积极', '热情'], true);
```

### 插入测试匹配

```sql
-- 插入测试匹配记录
INSERT INTO matches (user_id, match_id, score, reasons, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 85.5, ARRAY['共同兴趣：美食', '性格互补'], 'accepted'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 78.2, ARRAY['相似年龄', '共同行业'], 'pending');
```

## 🔧 维护命令

### 数据库维护

```bash
# 初始化数据库
npm run db:init

# 重置数据库
npm run db:reset

# 运行迁移
npm run db:migrate
```

### 清理过期数据

```sql
-- 手动清理过期数据
SELECT cleanup_expired_data();
```

## 📈 性能监控

### 查询性能

```sql
-- 查看慢查询
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 表大小

```sql
-- 查看表大小
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;
```

## 🚨 故障排除

### 常见问题

1. **连接失败**
   - 检查环境变量配置
   - 确认网络连接
   - 验证 API 密钥

2. **权限错误**
   - 检查 RLS 策略
   - 确认用户认证状态
   - 验证服务角色密钥

3. **性能问题**
   - 检查索引使用情况
   - 优化查询语句
   - 监控资源使用

### 日志查看

```bash
# 查看应用日志
npm run dev

# 查看数据库日志（Supabase Dashboard）
# 进入项目 > Logs > Database
```

## 📞 支持

如果遇到问题，请：

1. 检查环境变量配置
2. 查看控制台错误信息
3. 参考 Supabase 文档
4. 联系技术支持

---

**配置完成！** 现在您可以开始使用 PersonaLink 应用了。🎉 