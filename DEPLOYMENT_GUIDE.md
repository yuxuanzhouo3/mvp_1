# PersonaLink 部署指南

## 🚀 快速部署

### 方法一：Vercel 一键部署（推荐）

1. **Fork 项目**
   ```bash
   # 在 GitHub 上 Fork 本项目
   git clone https://github.com/yourusername/personalink.git
   cd personalink
   ```

2. **Vercel 部署**
   - 访问 [Vercel](https://vercel.com)
   - 点击 "New Project"
   - 导入 GitHub 仓库
   - 配置环境变量（见下文）
   - 点击 "Deploy"

3. **配置环境变量**
   在 Vercel 项目设置中添加以下环境变量：

   ```env
   # Supabase 配置
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # 支付配置
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   
   # OpenAI 配置
   OPENAI_API_KEY=sk-...
   
   # Twilio 配置
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_PHONE_NUMBER=+1234567890
   
   # 应用配置
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   NEXTAUTH_SECRET=your-secret-key
   ```

### 方法二：Docker 部署

1. **构建镜像**
   ```bash
   docker build -t personalink .
   ```

2. **运行容器**
   ```bash
   docker run -d \
     --name personalink \
     -p 3000:3000 \
     --env-file .env.local \
     personalink
   ```

3. **使用 Docker Compose**
   ```bash
   docker-compose up -d
   ```

### 方法三：传统服务器部署

1. **服务器准备**
   ```bash
   # 安装 Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # 安装 PM2
   npm install -g pm2
   ```

2. **部署应用**
   ```bash
   # 克隆项目
   git clone https://github.com/yourusername/personalink.git
   cd personalink
   
   # 安装依赖
   npm install
   
   # 构建应用
   npm run build
   
   # 启动应用
   pm2 start npm --name "personalink" -- start
   pm2 save
   pm2 startup
   ```

## 🗄️ 数据库设置

### Supabase 配置

1. **创建项目**
   - 访问 [Supabase](https://supabase.com)
   - 创建新项目
   - 记录项目 URL 和 API 密钥

2. **执行数据库脚本**
   在 Supabase SQL 编辑器中执行：

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
     role TEXT DEFAULT 'user',
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- 启用 RLS
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

   -- RLS 策略
   CREATE POLICY "Users can view own profile" ON profiles
     FOR SELECT USING (auth.uid() = id);

   CREATE POLICY "Users can update own profile" ON profiles
     FOR UPDATE USING (auth.uid() = id);

   -- 其他表...
   ```

3. **配置认证**
   - 启用 Email 认证
   - 配置 Google OAuth
   - 设置短信认证（Twilio）

4. **启用 Realtime**
   - 进入 Database > Replication
   - 启用 realtime 功能
   - 选择需要实时更新的表

## 🔧 第三方服务配置

### Stripe 配置

1. **创建 Stripe 账户**
   - 注册 [Stripe](https://stripe.com)
   - 获取 API 密钥

2. **配置 Webhook**
   - 在 Stripe Dashboard 中创建 Webhook
   - 端点：`https://yourdomain.com/api/payments/stripe/webhook`
   - 事件：`checkout.session.completed`, `payment_intent.succeeded`

3. **测试支付**
   ```bash
   # 使用 Stripe CLI 测试
   stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
   ```

### OpenAI 配置

1. **获取 API 密钥**
   - 访问 [OpenAI](https://platform.openai.com)
   - 创建 API 密钥

2. **配置模型**
   ```env
   OPENAI_MODEL=gpt-3.5-turbo
   OPENAI_MAX_TOKENS=1000
   ```

### Twilio 配置

1. **创建 Twilio 账户**
   - 注册 [Twilio](https://twilio.com)
   - 获取 Account SID 和 Auth Token

2. **配置电话号码**
   - 购买电话号码
   - 配置 Webhook URL

## 🔒 安全配置

### SSL 证书

1. **Let's Encrypt（免费）**
   ```bash
   sudo apt-get install certbot
   sudo certbot --nginx -d yourdomain.com
   ```

2. **自动续期**
   ```bash
   sudo crontab -e
   # 添加：0 12 * * * /usr/bin/certbot renew --quiet
   ```

### 防火墙配置

```bash
# UFW 防火墙
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 环境变量安全

```bash
# 生成随机密钥
openssl rand -base64 32
```

## 📊 监控和日志

### 应用监控

1. **PM2 监控**
   ```bash
   pm2 monit
   pm2 logs personalink
   ```

2. **Sentry 错误监控**
   ```bash
   npm install @sentry/nextjs
   ```

3. **Vercel Analytics**
   - 在 Vercel 中启用 Analytics
   - 配置自定义事件

### 数据库监控

1. **Supabase 监控**
   - 使用 Supabase Dashboard
   - 监控查询性能
   - 查看错误日志

2. **自定义监控**
   ```bash
   # 创建监控脚本
   curl -X GET "https://yourdomain.com/api/health"
   ```

## 🧪 测试部署

### 功能测试清单

- [ ] 用户注册/登录
- [ ] Google OAuth 登录
- [ ] 手机号验证
- [ ] 2FA 设置
- [ ] 支付流程
- [ ] 实时聊天
- [ ] 匹配功能
- [ ] 管理面板

### 性能测试

```bash
# 使用 Artillery 进行负载测试
npm install -g artillery
artillery quick --count 100 --num 10 https://yourdomain.com
```

### 安全测试

```bash
# 使用 OWASP ZAP 进行安全扫描
docker run -v $(pwd):/zap/wrk/:rw -t owasp/zap2docker-stable zap-baseline.py -t https://yourdomain.com
```

## 🔄 CI/CD 配置

### GitHub Actions

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🚨 故障排除

### 常见问题

1. **构建失败**
   ```bash
   # 清理缓存
   rm -rf .next
   npm run build
   ```

2. **环境变量问题**
   ```bash
   # 检查环境变量
   echo $NEXT_PUBLIC_SUPABASE_URL
   ```

3. **数据库连接问题**
   ```bash
   # 测试 Supabase 连接
   curl -X GET "https://your-project.supabase.co/rest/v1/profiles" \
     -H "apikey: your-anon-key"
   ```

### 日志查看

```bash
# Vercel 日志
vercel logs

# Docker 日志
docker logs personalink

# PM2 日志
pm2 logs personalink
```

## 📈 性能优化

### 前端优化

1. **图片优化**
   ```jsx
   import Image from 'next/image'
   <Image src="/avatar.jpg" width={100} height={100} alt="Avatar" />
   ```

2. **代码分割**
   ```jsx
   const ChatComponent = dynamic(() => import('./ChatComponent'), {
     loading: () => <p>Loading...</p>
   })
   ```

### 后端优化

1. **数据库索引**
   ```sql
   CREATE INDEX idx_messages_created_at ON messages(created_at);
   CREATE INDEX idx_profiles_location ON profiles(location);
   ```

2. **缓存策略**
   ```jsx
   // 使用 SWR 进行数据缓存
   const { data } = useSWR('/api/user/profile', fetcher)
   ```

## 🎯 生产环境检查清单

- [ ] 环境变量配置完整
- [ ] 数据库迁移执行
- [ ] SSL 证书配置
- [ ] 域名解析正确
- [ ] 监控系统运行
- [ ] 备份策略配置
- [ ] 安全扫描通过
- [ ] 性能测试通过
- [ ] 功能测试通过

---

**部署完成后，您的 PersonaLink 应用就可以为用户提供服务了！** 🎉

如有问题，请查看 [项目文档](README.md) 或提交 [Issue](https://github.com/yourusername/personalink/issues)。 