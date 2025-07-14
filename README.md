# PersonaLink - AI 人格匹配平台

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fpersonalink)

**PersonaLink** 是一个基于人格匹配的 AI 社交平台，帮助用户找到志趣相投的朋友和导师。平台使用先进的 AI 算法分析用户的人格特质、兴趣爱好和时区偏好，提供高度个性化的匹配建议。

## ✨ 核心功能

- **智能人格匹配** - 基于大五人格模型和兴趣相似度算法
- **安全认证系统** - 支持 Google/邮箱/手机登录 + 2FA 双重验证
- **多支付方式** - Stripe, USDT(TRC20), Alipay, 平台积分
- **实时聊天系统** - 支持文本、图片和文件传输
- **管理面板** - 完整的用户、支付和匹配数据监控
- **响应式设计** - 完美适配移动端和桌面端
- **亮/暗模式** - 根据系统偏好自动切换

## 🚀 技术栈

- **前端框架**: Next.js 14 (App Router)
- **样式系统**: Tailwind CSS + shadcn/ui
- **状态管理**: React Context + Custom Hooks
- **后端服务**: Supabase (PostgreSQL, Auth, Storage)
- **实时通信**: Supabase Realtime
- **支付处理**: Stripe + USDT + Alipay
- **AI 集成**: OpenAI API
- **表单处理**: React Hook Form + Zod
- **部署平台**: Vercel

## 📂 项目结构

```
personalink/
├── app/                          # Next.js 应用路由
│   ├── (auth)/                   # 认证相关路由
│   │   ├── login/                # 登录页面
│   │   ├── register/             # 注册页面
│   │   └── verify-otp/           # 手机验证页面
│   ├── dashboard/                # 用户仪表盘
│   │   ├── page.tsx              # 主仪表盘
│   │   └── layout.tsx            # 仪表盘布局
│   ├── chat/                     # 聊天模块
│   │   ├── page.tsx              # 聊天列表
│   │   └── [chatId]/             # 聊天详情
│   ├── matching/                 # 匹配模块
│   │   └── page.tsx              # 匹配推荐
│   ├── payment/                  # 支付模块
│   │   └── recharge/             # 积分充值
│   ├── (ops)/                    # 管理面板
│   │   └── ops/                  # 运营管理
│   └── api/                      # API 端点
│       ├── user/                 # 用户相关API
│       ├── chat/                 # 聊天相关API
│       ├── matching/             # 匹配相关API
│       └── payments/             # 支付相关API
├── components/                   # 可复用组件
│   ├── auth/                     # 认证组件
│   │   └── TwoFactorSetup.tsx    # 2FA设置
│   ├── chat/                     # 聊天组件
│   ├── dashboard/                # 仪表盘组件
│   │   └── DashboardStats.tsx    # 统计组件
│   ├── matching/                 # 匹配组件
│   ├── payment/                  # 支付组件
│   │   └── CreditRecharge.tsx    # 充值组件
│   └── ui/                       # UI 基础组件
│       ├── button.tsx            # 按钮组件
│       ├── card.tsx              # 卡片组件
│       ├── input.tsx             # 输入组件
│       ├── badge.tsx             # 徽章组件
│       ├── avatar.tsx            # 头像组件
│       └── tabs.tsx              # 标签组件
├── app/providers/                # 上下文提供者
│   └── AuthProvider.tsx          # 认证状态管理
├── app/hooks/                    # 自定义 Hooks
│   ├── useChat.ts                # 聊天 Hook
│   └── use-toast.ts              # 提示 Hook
├── lib/                          # 工具库
│   ├── matching/                 # AI 匹配引擎
│   │   └── engine.ts             # 核心匹配算法
│   ├── supabase/                 # Supabase 客户端
│   │   └── client.ts             # 客户端配置
│   └── utils.ts                  # 工具函数
├── types/                        # TypeScript 类型定义
├── public/                       # 静态资源
├── .env.example                  # 环境变量示例
├── tailwind.config.js            # Tailwind 配置
├── tsconfig.json                 # TypeScript 配置
└── README.md                     # 项目文档
```

## 🛠️ 本地开发指南

### 前置条件
- Node.js v18+
- PNPM 或 NPM
- Supabase 账户
- Vercel 账户

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/yourusername/personalink.git
   cd personalink
   ```

2. **安装依赖**
   ```bash
   pnpm install
   # 或
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env.local
   ```
   在 `.env.local` 中填入您的密钥：
   ```ini
   # Supabase 配置
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # 支付配置
   STRIPE_SECRET_KEY=your-stripe-secret
   STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
   COINBASE_COMMERCE_API_KEY=your-coinbase-key
   
   # Twilio 短信服务
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=+1234567890
   
   # OpenAI 配置
   OPENAI_API_KEY=your-openai-key
   ```

4. **启动开发服务器**
   ```bash
   pnpm dev
   # 或
   npm run dev
   ```

5. 打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 🗄️ 数据库架构 (Supabase)

在 Supabase SQL 编辑器中执行以下脚本：

```sql
-- 用户资料表
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 100 NOT NULL,
  bio TEXT,
  location TEXT,
  interests TEXT[],
  age INTEGER,
  industry TEXT,
  communication_style TEXT,
  personality_traits JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_profiles_timezone ON profiles(location);
CREATE INDEX idx_profiles_industry ON profiles(industry);
CREATE INDEX idx_profiles_interests ON profiles USING GIN(interests);

-- 支付交易表
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  provider_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 匹配表
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES profiles(id) NOT NULL,
  user2_id UUID REFERENCES profiles(id) NOT NULL,
  compatibility_score FLOAT NOT NULL,
  match_reasons JSONB,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 消息表
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  receiver_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' NOT NULL,
  file_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户设置表
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  notification_preferences JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  matching_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户活动日志表
CREATE TABLE user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用实时更新
ALTER TABLE messages REPLICA IDENTITY FULL;
```

## 🔧 关键配置

### Supabase 设置
1. **启用认证提供者**:
   - Google OAuth
   - Email/password
   - Phone authentication (使用 Twilio)
   
2. **开启 Realtime 功能**:
   - 进入 `Database > Replication`
   - 启用 realtime 并选择 `public.messages` 表

3. **配置存储桶**:
   - 创建 `chat-attachments` 存储桶
   - 设置公开访问权限

### Vercel 环境变量
在 Vercel 项目中设置与 `.env.local` 相同的环境变量

### Stripe Webhook 配置
1. 创建 Stripe Webhook 端点：`https://yourdomain.com/api/payments/stripe/webhook`
2. 监听事件：`payment_intent.succeeded`, `payment_intent.payment_failed`

## 🧪 测试账号
```
邮箱: test@personalink.com
密码: Test123!
```

## 🌟 开发路线图

### 阶段 1: 核心功能 (当前)
- [x] 认证系统
- [x] 支付集成
- [x] 实时聊天
- [x] AI 匹配引擎
- [x] 管理面板
- [x] 用户仪表盘
- [x] 聊天界面
- [x] 匹配推荐
- [x] 支付充值

### 阶段 2: 高级功能 (下一步)
- [ ] 视频通话集成
- [ ] AI 聊天机器人
- [ ] 多语言支持
- [ ] 移动应用 (React Native)
- [ ] 群组聊天
- [ ] 高级匹配算法

### 阶段 3: 企业功能
- [ ] 企业账户
- [ ] 团队管理
- [ ] 高级分析
- [ ] API 接口
- [ ] 白标解决方案

## 🚀 部署指南

### Vercel 部署
```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 链接项目
vercel link

# 部署生产环境
vercel --prod
```

### Supabase 部署
1. 在 Supabase 控制台创建新项目
2. 执行数据库脚本
3. 配置身份验证提供者
4. 启用实时功能
5. 创建必要的存储桶

## 📄 许可证
MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 👨‍💻 开发团队
- **项目经理**: 张三
- **前端开发**: 李四
- **后端开发**: 王五
- **UI/UX 设计**: 赵六

## 📅 项目里程碑
- **2023.10.01**: 项目启动
- **2023.11.15**: Alpha 版本完成
- **2023.12.01**: 内部测试
- **2024.01.15**: 公开测试版发布
- **2024.03.01**: 正式版发布

## 🤝 贡献指南
欢迎提交 Pull Request! 请遵循以下步骤：
1. Fork 项目仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 🐛 问题反馈
如果您发现任何问题或有改进建议，请：
1. 查看 [Issues](https://github.com/yourusername/personalink/issues) 页面
2. 创建新的 Issue 并详细描述问题
3. 提供复现步骤和环境信息

## 📞 技术支持
- **邮箱**: support@personalink.com
- **文档**: [docs.personalink.com](https://docs.personalink.com)
- **社区**: [community.personalink.com](https://community.personalink.com)

---

**PersonaLink** - 让每一次相遇都充满意义 ✨ 