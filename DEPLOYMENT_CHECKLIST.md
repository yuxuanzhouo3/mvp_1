# PersonaLink 部署检查清单

## 🚀 生产部署前检查清单

### ✅ 环境配置检查

#### 1. 环境变量配置
- [ ] **Supabase 配置**
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```

- [ ] **Stripe 支付配置**
  ```env
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
  ```

- [ ] **OpenAI AI 配置**
  ```env
  OPENAI_API_KEY=sk-...
  OPENAI_MODEL=gpt-3.5-turbo
  ```

- [ ] **Twilio 短信配置**
  ```env
  TWILIO_ACCOUNT_SID=AC...
  TWILIO_AUTH_TOKEN=...
  TWILIO_PHONE_NUMBER=+1234567890
  ```

- [ ] **应用基础配置**
  ```env
  NEXT_PUBLIC_APP_URL=https://yourdomain.com
  NEXTAUTH_SECRET=your-secret-key
  NODE_ENV=production
  ```

#### 2. 数据库配置检查
- [ ] **Supabase 项目创建**
  - [ ] 创建新的 Supabase 项目
  - [ ] 记录项目 URL 和 API 密钥
  - [ ] 配置数据库区域（推荐：香港或新加坡）

- [ ] **数据库表创建**
  ```sql
  -- 执行数据库迁移脚本
  -- 创建所有必要的表
  -- 启用 Row Level Security (RLS)
  -- 配置 RLS 策略
  ```

- [ ] **存储桶配置**
  - [ ] 创建 `avatars` 存储桶
  - [ ] 创建 `chat-files` 存储桶
  - [ ] 配置存储桶权限策略

#### 3. 第三方服务配置
- [ ] **Stripe 账户设置**
  - [ ] 创建 Stripe 账户
  - [ ] 获取 API 密钥
  - [ ] 配置 Webhook 端点
  - [ ] 测试支付流程

- [ ] **OpenAI 账户设置**
  - [ ] 创建 OpenAI 账户
  - [ ] 获取 API 密钥
  - [ ] 设置使用限制

- [ ] **Twilio 账户设置**
  - [ ] 创建 Twilio 账户
  - [ ] 获取 Account SID 和 Auth Token
  - [ ] 购买电话号码
  - [ ] 配置 Webhook URL

### ✅ 代码质量检查

#### 1. 代码审查
- [ ] **TypeScript 类型检查**
  ```bash
  npm run type-check
  ```

- [ ] **ESLint 代码规范检查**
  ```bash
  npm run lint
  ```

- [ ] **构建测试**
  ```bash
  npm run build
  ```

#### 2. 安全检查
- [ ] **环境变量安全**
  - [ ] 确认敏感信息未提交到代码库
  - [ ] 检查 `.env.local` 文件是否在 `.gitignore` 中
  - [ ] 验证生产环境变量配置

- [ ] **依赖安全检查**
  ```bash
  npm audit
  ```

- [ ] **API 端点安全**
  - [ ] 验证所有 API 端点都有适当的认证
  - [ ] 检查 CORS 配置
  - [ ] 确认速率限制已启用

### ✅ 功能测试检查

#### 1. 核心功能测试
- [ ] **用户认证流程**
  - [ ] 邮箱注册/登录
  - [ ] Google OAuth 登录
  - [ ] 手机号验证
  - [ ] 双因子认证设置

- [ ] **支付功能测试**
  - [ ] Stripe 信用卡支付
  - [ ] USDT 加密货币支付
  - [ ] 支付宝支付
  - [ ] 支付记录查询

- [ ] **聊天功能测试**
  - [ ] 实时消息发送/接收
  - [ ] 文件上传/下载
  - [ ] AI 助手回复
  - [ ] 消息状态跟踪

- [ ] **匹配功能测试**
  - [ ] AI 匹配算法
  - [ ] 用户推荐
  - [ ] 匹配操作（喜欢/跳过）
  - [ ] 兼容性评分

#### 2. 管理功能测试
- [ ] **管理员登录**
- [ ] **用户管理**
- [ ] **支付监控**
- [ ] **数据分析**

### ✅ 性能优化检查

#### 1. 前端性能
- [ ] **Lighthouse 性能测试**
  ```bash
  npm run lighthouse
  ```
  - [ ] 性能分数 > 90
  - [ ] 可访问性分数 > 90
  - [ ] 最佳实践分数 > 90
  - [ ] SEO 分数 > 90

- [ ] **包大小检查**
  ```bash
  npm run analyze
  ```
  - [ ] 主包大小 < 500KB
  - [ ] 代码分割合理

#### 2. 后端性能
- [ ] **API 响应时间测试**
  - [ ] 平均响应时间 < 200ms
  - [ ] 95% 响应时间 < 500ms

- [ ] **数据库查询优化**
  - [ ] 检查慢查询
  - [ ] 优化索引
  - [ ] 连接池配置

### ✅ 部署配置检查

#### 1. Vercel 部署
- [ ] **项目连接**
  - [ ] 连接 GitHub 仓库
  - [ ] 配置构建命令
  - [ ] 设置环境变量

- [ ] **域名配置**
  - [ ] 配置自定义域名
  - [ ] 设置 SSL 证书
  - [ ] 配置重定向规则

#### 2. Docker 部署（可选）
- [ ] **镜像构建**
  ```bash
  docker build -t personalink .
  ```

- [ ] **容器运行测试**
  ```bash
  docker run -p 3000:3000 personalink
  ```

### ✅ 监控和日志检查

#### 1. 错误监控
- [ ] **Sentry 集成**
  - [ ] 配置 Sentry 项目
  - [ ] 设置错误通知
  - [ ] 测试错误捕获

#### 2. 性能监控
- [ ] **Vercel Analytics**
  - [ ] 启用 Web Analytics
  - [ ] 配置自定义事件

- [ ] **Supabase 监控**
  - [ ] 启用数据库监控
  - [ ] 设置性能警报

### ✅ 安全配置检查

#### 1. 网络安全
- [ ] **HTTPS 配置**
  - [ ] SSL 证书有效
  - [ ] 强制 HTTPS 重定向

- [ ] **安全头配置**
  - [ ] CSP 策略
  - [ ] HSTS 配置
  - [ ] X-Frame-Options

#### 2. 数据安全
- [ ] **数据库备份**
  - [ ] 配置自动备份
  - [ ] 测试备份恢复

- [ ] **敏感数据加密**
  - [ ] 数据库加密
  - [ ] API 密钥加密

### ✅ 上线前最终检查

#### 1. 功能完整性
- [ ] **所有核心功能正常工作**
- [ ] **用户流程完整**
- [ ] **错误处理完善**
- [ ] **响应式设计正常**

#### 2. 文档完整性
- [ ] **README.md 更新**
- [ ] **API 文档完整**
- [ ] **部署指南详细**
- [ ] **故障排除文档**

#### 3. 团队准备
- [ ] **开发团队培训**
- [ ] **运维团队准备**
- [ ] **客服团队培训**
- [ ] **应急预案准备**

## 🚀 部署命令

### Vercel 部署
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署项目
vercel --prod
```

### Docker 部署
```bash
# 构建镜像
docker build -t personalink .

# 运行容器
docker run -d \
  --name personalink \
  -p 3000:3000 \
  --env-file .env.local \
  personalink
```

### 本地测试
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 📊 部署后检查清单

### 立即检查项目
- [ ] **网站可访问性**
- [ ] **所有页面正常加载**
- [ ] **用户注册/登录功能**
- [ ] **支付功能测试**
- [ ] **聊天功能测试**
- [ ] **匹配功能测试**

### 24小时内检查
- [ ] **错误日志分析**
- [ ] **性能监控数据**
- [ ] **用户反馈收集**
- [ ] **系统稳定性评估**

### 一周内检查
- [ ] **用户增长数据**
- [ ] **功能使用统计**
- [ ] **性能优化调整**
- [ ] **安全漏洞扫描**

---

**部署完成后，您的 PersonaLink 应用就可以为用户提供服务了！** 🎉

如有问题，请查看 [项目文档](README.md) 或提交 [Issue](https://github.com/yourusername/personalink/issues)。 