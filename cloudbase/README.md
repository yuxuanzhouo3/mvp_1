# Cloudbase 配置

本目录包含 PersonaLink CN 环境的腾讯云 Cloudbase 配置文件和种子数据。

> **重要**：CN 环境不再使用云函数，而是与 INTL 环境共享相同的 Next.js API 路由逻辑。
> 仅数据存储层不同：CN 使用 Cloudbase 数据库，INTL 使用 Supabase。

## 目录结构

```
cloudbase/
├── cloudbaserc.json      # Cloudbase 配置文件
├── deploy.sh             # 部署脚本
├── README.md             # 本文件
└── seed-data/            # 种子数据
    ├── credit_packages.json   # 积分套餐
    ├── interests.json         # 兴趣标签
    └── membership_tiers.json  # 会员等级
```

## 架构说明

### 为什么不使用云函数？

原先 CN 环境使用 Cloudbase 云函数处理后端逻辑，但这导致了以下问题：

1. **代码重复**：INTL 和 CN 环境的业务逻辑相同，但需要维护两份代码
2. **功能差异**：云函数实现的功能不完整，与 INTL 环境存在差异
3. **维护成本**：两套代码的同步更新困难

### 新架构

现在 CN 和 INTL 环境共享同一套 API 路由代码，通过统一的数据库访问层自动适配不同的存储后端：

```
Next.js API Routes
       |
       v
lib/db-client.ts (统一数据库客户端)
       |
       +---- CN 环境 ----> Cloudbase 适配器 ----> Cloudbase 数据库
       |
       +---- INTL 环境 --> Supabase 客户端 ----> Supabase (PostgreSQL)
```

### 使用方法

API 路由中使用统一的客户端：

```typescript
import { getDbClient } from '@/lib/db-client';

export async function GET(request: NextRequest) {
  const db = await getDbClient();
  
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  return NextResponse.json({ data, error });
}
```

## 数据库集合

CN 环境使用以下 Cloudbase 数据库集合：

### 用户相关

| 集合名 | 说明 |
|--------|------|
| users | 用户信息（包含 profile、photos） |
| user_settings | 用户设置 |
| user_verifications | 用户认证信息 |

### 匹配相关

| 集合名 | 说明 |
|--------|------|
| recommendations | 推荐列表 |
| swipes | 用户互动记录 |
| matches | 匹配成功记录 |

### 聊天相关

| 集合名 | 说明 |
|--------|------|
| chat_rooms | 聊天室 |
| messages | 消息记录 |
| message_attachments | 消息附件 |

### 支付相关

| 集合名 | 说明 |
|--------|------|
| orders | 订单记录 |
| credit_transactions | 积分变动记录 |

### 会员/积分

| 集合名 | 说明 |
|--------|------|
| credit_packages | 积分套餐 |
| membership_tiers | 会员等级 |
| user_memberships | 用户会员状态 |
| user_boosts | 用户加速 |

### AI 相关

| 集合名 | 说明 |
|--------|------|
| ai_chat_sessions | AI 聊天会话 |
| ai_usage_limits | AI 使用限制 |
| ai_usage_logs | AI 使用日志 |

### 通知相关

| 集合名 | 说明 |
|--------|------|
| notifications | 通知记录 |
| push_tokens | 推送 Token |

## 部署配置

### 环境变量

CN 环境需要配置以下环境变量：

```env
# 部署区域
NEXT_PUBLIC_DEPLOYMENT_REGION=CN

# Cloudbase 配置
NEXT_PUBLIC_CLOUDBASE_ENV_ID=your-env-id
CLOUDBASE_SECRET_ID=your-secret-id
CLOUDBASE_SECRET_KEY=your-secret-key

# Supabase 配置（管理员登录、统计等，复用 INTL Supabase 项目）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

> 建议 CN 与 INTL 部署共用同一个 Supabase 项目，保证 `admin_users` 等表数据一致，这样无论访问 https://personalink.mornscience.top 还是 https://www.mornhub.lat，管理员账号密码都保持统一。

### 初始化种子数据

使用 Cloudbase CLI 导入种子数据：

```bash
# 安装 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 导入种子数据
tcb database import credit_packages seed-data/credit_packages.json --envId your-env-id
tcb database import interests seed-data/interests.json --envId your-env-id
tcb database import membership_tiers seed-data/membership_tiers.json --envId your-env-id
```

## 安全规则

在 Cloudbase 控制台配置数据库安全规则：

```json
{
  "users": {
    "read": "auth.uid == doc._id || auth.uid == doc._openid",
    "write": "auth.uid == doc._id || auth.uid == doc._openid"
  },
  "user_settings": {
    "read": "auth.uid == doc.user_id",
    "write": "auth.uid == doc.user_id"
  },
  "swipes": {
    "read": "auth.uid == doc.actor_id",
    "write": "auth.uid == doc.actor_id"
  },
  "matches": {
    "read": "auth.uid == doc.user_1 || auth.uid == doc.user_2",
    "write": false
  },
  "orders": {
    "read": "auth.uid == doc.user_id",
    "write": false
  },
  "notifications": {
    "read": "auth.uid == doc.user_id",
    "write": false
  }
}
```

## 注意事项

1. **字段映射**：Cloudbase 使用 `_id` 作为主键，统一数据库客户端会自动映射为 `id`
2. **时间戳**：所有记录自动添加 `created_at` 和 `updated_at` 字段
3. **事务**：涉及金额的操作使用 Cloudbase 事务保证原子性
4. **索引**：根据查询模式在 Cloudbase 控制台创建适当的索引
