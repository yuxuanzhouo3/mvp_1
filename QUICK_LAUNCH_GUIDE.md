# PersonaLink 快速启动指南

## 🚀 5分钟快速启动

### 第一步：环境准备 (1分钟)

1. **确保系统要求**
   ```bash
   # 检查 Node.js 版本 (需要 18+)
   node --version
   
   # 检查 npm 版本
   npm --version
   
   # 检查 Git
   git --version
   ```

2. **克隆项目** (如果还没有)
   ```bash
   git clone <your-repository-url>
   cd mvp_1
   ```

### 第二步：一键启动 (2分钟)

1. **运行启动脚本**
   ```bash
   ./STARTUP_SCRIPT.sh
   ```

2. **按照提示操作**
   - 脚本会自动检查依赖
   - 创建环境变量文件
   - 安装项目依赖
   - 构建项目
   - 提供部署选项

### 第三步：配置环境变量 (1分钟)

编辑 `.env` 文件，配置必要的 API 密钥：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key

# Stripe 配置
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Redis 配置
REDIS_URL=your_redis_url

# JWT 密钥
JWT_SECRET=your_jwt_secret
```

### 第四步：选择部署方式 (1分钟)

#### 选项1：本地开发测试 (推荐新手)
```bash
npm run dev
# 访问 http://localhost:3000
```

#### 选项2：Vercel 部署 (推荐生产)
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录并部署
vercel login
vercel --prod
```

#### 选项3：Docker 部署
```bash
docker-compose up -d
# 访问 http://localhost:3000
```

---

## 📋 详细启动步骤

### 1. 环境变量配置详解

#### 必需的环境变量
| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | Supabase 控制台 → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | Supabase 控制台 → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 | Supabase 控制台 → Settings → API |
| `OPENAI_API_KEY` | OpenAI API 密钥 | OpenAI 官网 → API Keys |
| `STRIPE_SECRET_KEY` | Stripe 密钥 | Stripe 控制台 → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 密钥 | Stripe 控制台 → Developers → Webhooks |
| `REDIS_URL` | Redis 连接 URL | Upstash 控制台 → 创建数据库 |
| `JWT_SECRET` | JWT 签名密钥 | 生成随机字符串 |

#### 可选的环境变量
| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NEXTAUTH_URL` | NextAuth 回调 URL | http://localhost:3000 |
| `NEXTAUTH_SECRET` | NextAuth 密钥 | 自动生成 |
| `TWILIO_ACCOUNT_SID` | Twilio 账户 SID | - |
| `TWILIO_AUTH_TOKEN` | Twilio 认证令牌 | - |

### 2. 数据库初始化

1. **访问 Supabase 控制台**
   - 登录 [supabase.com](https://supabase.com)
   - 选择您的项目

2. **执行数据库脚本**
   - 进入 SQL Editor
   - 复制 `scripts/init-db.sql` 内容
   - 执行脚本

3. **验证表结构**
   ```sql
   -- 检查表是否创建成功
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

### 3. 功能测试清单

#### 用户认证测试
- [ ] 邮箱注册
- [ ] Google 登录
- [ ] 手机号验证
- [ ] 2FA 设置和验证
- [ ] 密码重置

#### 核心功能测试
- [ ] 个人资料编辑
- [ ] AI 匹配推荐
- [ ] 实时聊天
- [ ] 支付流程
- [ ] 用户仪表盘

#### 管理功能测试
- [ ] 用户管理
- [ ] 支付监控
- [ ] 数据分析
- [ ] 系统设置

---

## 🔧 常见问题解决

### 启动问题

#### 问题1：Node.js 版本过低
```bash
# 解决方案：升级 Node.js
# 使用 nvm (推荐)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 或直接从官网下载
# https://nodejs.org/
```

#### 问题2：依赖安装失败
```bash
# 解决方案：清理缓存重新安装
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### 问题3：环境变量未配置
```bash
# 解决方案：检查 .env 文件
ls -la .env
cat .env.example
cp .env.example .env
# 然后编辑 .env 文件
```

### 部署问题

#### 问题1：Vercel 部署失败
```bash
# 解决方案：检查构建日志
vercel logs

# 常见原因：
# 1. 环境变量未配置
# 2. 依赖版本冲突
# 3. 构建脚本错误
```

#### 问题2：Docker 容器启动失败
```bash
# 解决方案：检查容器日志
docker-compose logs

# 常见原因：
# 1. 端口冲突
# 2. 环境变量未传递
# 3. 网络连接问题
```

### 功能问题

#### 问题1：聊天功能不工作
- 检查 WebSocket 连接
- 验证 Supabase Realtime 配置
- 确认用户认证状态

#### 问题2：支付功能异常
- 检查 Stripe 密钥配置
- 验证 Webhook 端点
- 确认支付流程完整性

#### 问题3：AI 匹配不准确
- 检查 OpenAI API 密钥
- 验证匹配算法参数
- 确认用户数据完整性

---

## 📊 性能优化建议

### 开发环境优化
```bash
# 启用开发模式热重载
npm run dev

# 使用生产模式测试性能
npm run build
npm start
```

### 生产环境优化
1. **启用压缩**
   ```javascript
   // next.config.js
   module.exports = {
     compress: true,
     poweredByHeader: false,
   }
   ```

2. **配置缓存**
   ```javascript
   // 静态资源缓存
   // 数据库查询缓存
   // API 响应缓存
   ```

3. **监控性能**
   - 使用 Vercel Analytics
   - 配置错误监控
   - 设置性能告警

---

## 🎯 下一步行动

### 立即行动 (今天)
1. ✅ 完成项目启动
2. ✅ 配置环境变量
3. ✅ 测试核心功能
4. 🔄 邀请测试用户

### 本周目标
1. **用户测试**
   - 邀请 10-20 个种子用户
   - 收集用户反馈
   - 修复发现的问题

2. **性能优化**
   - 监控页面加载速度
   - 优化数据库查询
   - 改进用户体验

3. **安全加固**
   - 进行安全审计
   - 配置监控告警
   - 建立备份策略

### 本月目标
1. **正式发布**
   - 配置生产域名
   - 设置 SSL 证书
   - 发布正式版本

2. **用户增长**
   - 制定营销策略
   - 开始用户获取
   - 建立反馈机制

3. **功能迭代**
   - 基于反馈优化
   - 添加新功能
   - 改进匹配算法

---

## 📞 技术支持

### 文档资源
- 📖 [完整文档](README.md)
- 🚀 [部署指南](DEPLOYMENT_GUIDE.md)
- 📋 [检查清单](FINAL_DEPLOYMENT_CHECKLIST.md)
- 📊 [项目状态](PROJECT_STATUS_OVERVIEW.md)

### 社区支持
- GitHub Issues
- 技术论坛
- 开发者社区

### 紧急联系
- 项目维护者
- 技术支持团队
- 社区管理员

---

## 🎉 启动成功！

恭喜您成功启动 PersonaLink 项目！

**项目状态**: 🚀 **运行中**

**下一步**: 开始您的创业之旅，让 AI 驱动的社交匹配平台帮助更多人找到真正的连接！

---

*指南版本: v1.0.0*  
*最后更新: 2024年12月* 