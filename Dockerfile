# 使用多阶段构建减小镜像大小
FROM node:20-alpine AS base

# 设置工作目录
WORKDIR /app

# ========== 构建时环境变量声明 ==========
ARG NODE_ENV=production
ARG NEXT_PUBLIC_DEPLOYMENT_REGION=CN

ENV NODE_ENV=$NODE_ENV
ENV NEXT_PUBLIC_DEPLOYMENT_REGION=$NEXT_PUBLIC_DEPLOYMENT_REGION

# 复制包管理文件
COPY package.json package-lock.json ./

# 安装依赖（使用 npm ci 保证锁一致）
RUN npm ci

# 复制源代码
COPY . .

# 1. 构建参数提供默认占位符
ARG NEXT_PUBLIC_SUPABASE_URL=https://build-placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=build-placeholder-key

# 2. ARG 转 ENV（给 Next.js 构建用）
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# 构建 Next.js 应用
RUN npm run build

# ============================
# 生产镜像
# ============================
FROM node:20-alpine AS production

WORKDIR /app

# ========== 运行时环境变量（真正的配置在容器启动时注入） ==========
ARG PORT=3000
ARG NEXT_PUBLIC_DEPLOYMENT_REGION=CN

ENV PORT=$PORT
ENV NEXT_PUBLIC_DEPLOYMENT_REGION=$NEXT_PUBLIC_DEPLOYMENT_REGION

# 复制构建产物
COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.mjs ./next.config.js

# 安装生产依赖
RUN npm ci --omit=dev

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# 修改权限
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
