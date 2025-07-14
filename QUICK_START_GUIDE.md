# PersonaLink 快速启动指南

## 🚀 5分钟快速部署

### 第一步：环境准备

1. **克隆项目**
   ```bash
   git clone https://github.com/yourusername/personalink.git
   cd personalink
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **创建环境变量文件**
   ```bash
   cp .env.example .env.local
   ```

### 第二步：配置第三方服务

#### 1. Supabase 设置 (2分钟)
1. 访问 [Supabase](https://supabase.com)
2. 创建新项目
3. 复制项目 URL 和 API 密钥到 `.env.local`

#### 2. Stripe 设置 (2分钟)
1. 访问 [Stripe](https://stripe.com)
2. 注册账户并获取 API 密钥
3. 配置到 `.env.local`

#### 3. OpenAI 设置 (1分钟)
1. 访问 [OpenAI](https://platform.openai.com)
2. 创建 API 密钥
3. 配置到 `.env.local`

### 第三步：启动应用

```bash
# 开发模式
npm run dev

# 或构建生产版本
npm run build
npm start
```

访问 `http://localhost:3000` 查看应用！

## 🎯 核心功能测试

### 用户认证测试
1. **注册新用户**
   - 访问 `/auth/register`
   - 填写邮箱和密码
   - 验证邮箱

2. **登录测试**
   - 访问 `/auth/login`
   - 使用注册的账户登录
   - 测试 Google OAuth

3. **双因子认证**
   - 在设置中启用 2FA
   - 扫描 QR 码
   - 验证 TOTP 代码

### 支付功能测试
1. **充值积分**
   - 访问 `/payment/recharge`
   - 选择充值套餐
   - 测试 Stripe 支付

2. **支付记录**
   - 查看支付历史
   - 验证积分到账

### 聊天功能测试
1. **创建聊天**
   - 在匹配页面找到用户
   - 点击开始聊天
   - 发送测试消息

2. **实时通信**
   - 打开两个浏览器窗口
   - 测试实时消息
   - 验证文件上传

### 匹配功能测试
1. **AI 匹配**
   - 完善个人资料
   - 查看匹配推荐
   - 测试喜欢/跳过功能

2. **匹配分析**
   - 查看兼容性评分
   - 阅读匹配原因

## 🔧 常见问题解决

### 环境变量问题
```bash
# 检查环境变量
echo $NEXT_PUBLIC_SUPABASE_URL

# 重新加载环境变量
source .env.local
```

### 数据库连接问题
```bash
# 测试 Supabase 连接
curl -X GET "https://your-project.supabase.co/rest/v1/profiles" \
  -H "apikey: your-anon-key"
```

### 构建错误
```bash
# 清理缓存
rm -rf .next
npm run build
```

### 端口占用
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

## 📱 移动端测试

### 响应式设计测试
1. **Chrome DevTools**
   - 打开开发者工具
   - 切换到移动设备模式
   - 测试不同屏幕尺寸

2. **真机测试**
   - 在手机上访问应用
   - 测试触摸交互
   - 验证性能表现

## 🔒 安全测试

### 认证安全
- [ ] 未登录用户无法访问受保护页面
- [ ] JWT 令牌正确验证
- [ ] 密码强度要求
- [ ] 会话超时处理

### 数据安全
- [ ] 用户只能访问自己的数据
- [ ] API 端点有适当的权限控制
- [ ] 敏感数据加密存储
- [ ] SQL 注入防护

## 📊 性能测试

### 前端性能
```bash
# Lighthouse 测试
npm run lighthouse

# 包大小分析
npm run analyze
```

### 后端性能
```bash
# API 响应时间测试
curl -w "@curl-format.txt" -o /dev/null -s "https://yourdomain.com/api/user/profile"

# 数据库查询测试
# 在 Supabase Dashboard 中查看查询性能
```

## 🚀 生产部署

### Vercel 一键部署
1. **连接 GitHub**
   - Fork 项目到你的 GitHub
   - 在 Vercel 中导入项目

2. **配置环境变量**
   - 在 Vercel 项目设置中添加所有环境变量
   - 确保使用生产环境的 API 密钥

3. **部署**
   - 点击 "Deploy"
   - 等待构建完成

### 自定义域名
1. **添加域名**
   - 在 Vercel 项目设置中添加自定义域名
   - 配置 DNS 记录

2. **SSL 证书**
   - Vercel 自动配置 SSL 证书
   - 验证 HTTPS 访问

## 📈 监控设置

### 错误监控
1. **Sentry 集成**
   ```bash
   npm install @sentry/nextjs
   ```

2. **配置 Sentry**
   - 创建 Sentry 项目
   - 添加 DSN 到环境变量

### 性能监控
1. **Vercel Analytics**
   - 在 Vercel 中启用 Analytics
   - 配置自定义事件

2. **Supabase 监控**
   - 在 Supabase Dashboard 中查看性能
   - 设置性能警报

## 🎉 上线检查清单

### 功能检查
- [ ] 用户注册/登录正常
- [ ] 支付功能测试通过
- [ ] 聊天功能实时通信
- [ ] 匹配算法正常工作
- [ ] 管理后台可访问

### 性能检查
- [ ] 页面加载时间 < 3秒
- [ ] API 响应时间 < 500ms
- [ ] 移动端体验良好
- [ ] 并发用户支持

### 安全检查
- [ ] HTTPS 强制重定向
- [ ] 环境变量安全
- [ ] 数据库权限正确
- [ ] 错误信息不泄露敏感数据

### 用户体验检查
- [ ] 界面响应式设计
- [ ] 错误提示友好
- [ ] 加载状态清晰
- [ ] 操作流程顺畅

## 🔄 持续集成

### GitHub Actions
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
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: amondnet/vercel-action@v20
```

### 自动化测试
```bash
# 运行所有测试
npm test

# 运行 E2E 测试
npm run test:e2e

# 运行性能测试
npm run test:performance
```

---

**恭喜！您的 PersonaLink 应用已经成功部署并运行！** 🎉

现在您可以：
1. 邀请用户测试应用
2. 收集反馈并优化
3. 开始营销推广
4. 持续迭代功能

如有问题，请查看 [完整文档](README.md) 或联系技术支持。 