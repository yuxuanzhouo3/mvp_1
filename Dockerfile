FROM node:20-alpine AS base

# 1. 依赖阶段：安装依赖
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
# 安装 pnpm 并安装依赖 (利用缓存)
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 2. 构建阶段：生成 Standalone 文件
FROM base AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 恢复构建时环境变量（保持你原有的逻辑）
ARG NEXT_PUBLIC_DEPLOYMENT_REGION=CN
ARG NEXT_PUBLIC_SUPABASE_URL=https://build-placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=build-placeholder-key
ARG NEXT_PUBLIC_EASEMOB_APP_KEY="your_org#your_app_name"

ENV NEXT_PUBLIC_DEPLOYMENT_REGION=$NEXT_PUBLIC_DEPLOYMENT_REGION
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_EASEMOB_APP_KEY=$NEXT_PUBLIC_EASEMOB_APP_KEY

# 运行构建（会自动生成 .next/standalone）
RUN pnpm build

# 3. 生产运行阶段：只复制极小的必要文件
FROM base AS runner
WORKDIR /app

# 设置时区
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata

ENV TZ=Asia/Shanghai
ENV NODE_ENV=production

# 创建用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 只需要复制 public 文件夹（如果有静态资源）
COPY --from=builder /app/public ./public

# 【关键】自动生成的 standalone 文件夹包含了一个微型 node_modules 和 server.js
# 只要复制这个文件夹，就不需要再运行 pnpm install
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 复制静态资源（CSS/JS/Images）
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 设置运行时环境变量
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 切换用户
USER nextjs

EXPOSE 3000

# 【注意】Standalone 模式的启动命令是 node server.js，而不是 pnpm start
CMD ["node", "server.js"]