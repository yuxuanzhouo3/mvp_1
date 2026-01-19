# 使用多阶段构建减小镜像大小（虽然非 standalone，但多阶段仍能优化）
FROM node:20-alpine AS base

# 设置时区为中国
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata

ENV TZ=Asia/Shanghai

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# ========== 构建时环境变量声明 ==========
ARG NODE_ENV=production
ARG NEXT_PUBLIC_DEPLOYMENT_REGION=CN
ENV NODE_ENV=$NODE_ENV
ENV NEXT_PUBLIC_DEPLOYMENT_REGION=$NEXT_PUBLIC_DEPLOYMENT_REGION

# 复制包管理文件（先 COPY 依赖，利用缓存加速）
COPY package.json pnpm-lock.yaml ./

# 安装所有依赖（包括 devDependencies，因为 build 需要）
RUN pnpm install --frozen-lockfile

# 复制全部源代码
COPY . .

# 声明构建时 NEXT_PUBLIC_ 变量（默认占位符，部署时可覆盖）
ARG NEXT_PUBLIC_SUPABASE_URL=https://build-placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=build-placeholder-key

# 转为 ENV（构建时生效）
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# 执行构建
RUN pnpm build

# ========== 生产阶段 ==========
FROM node:20-alpine AS production

# 设置时区为中国（重复设置，确保独立）
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata

ENV TZ=Asia/Shanghai

# 安装 pnpm（生产阶段也需要）
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# ========== 运行时环境变量 ==========
ARG PORT=3000
ARG NEXT_PUBLIC_DEPLOYMENT_REGION=CN
ARG NEXT_PUBLIC_SUPABASE_URL=https://build-placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=build-placeholder-key

ENV PORT=$PORT
ENV NEXT_PUBLIC_DEPLOYMENT_REGION=$NEXT_PUBLIC_DEPLOYMENT_REGION
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# 强制监听所有网络接口（CloudBase Run / Docker 容器内必须！否则 probe 连不上）
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# 从构建阶段复制文件
COPY --from=base /app/package.json /app/pnpm-lock.yaml ./

# 复制完整 .next（非 standalone 模式下必须完整复制，包括 cache 等）
COPY --from=base /app/.next ./.next

# 复制 public（如果项目有静态资源）
COPY --from=base /app/public ./public

# 复制 next.config.js（必须，否则配置不生效）
COPY --from=base /app/next.config.js ./

# 可选：如果有其他必要文件（如 .env.production、prisma schema 等），在这里 COPY
# COPY --from=base /app/.env.production ./

# 安装生产依赖（--prod 跳过 devDependencies，--ignore-scripts 避免不必要的 postinstall）
# 注意：因为是非 standalone，必须重新安装依赖
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

# 暴露端口
EXPOSE 3000

# 启动命令：使用 pnpm start（即 next start）
CMD ["pnpm", "start"]