# 使用多阶段构建减小镜像大小
FROM node:20-alpine AS base

# 设置时区为中国
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata

ENV TZ=Asia/Shanghai

# 安装pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# ========== 构建时环境变量声明 ==========
ARG NODE_ENV=production
ARG NEXT_PUBLIC_DEPLOYMENT_REGION=CN
ENV NODE_ENV=$NODE_ENV
ENV NEXT_PUBLIC_DEPLOYMENT_REGION=$NEXT_PUBLIC_DEPLOYMENT_REGION

# 复制包管理文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 1. 声明构建参数 (ARG) 并提供【默认占位符】
ARG NEXT_PUBLIC_SUPABASE_URL=https://build-placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=build-placeholder-key

# 2. 将 ARG 转为 ENV
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# 构建应用
RUN pnpm build

# 生产阶段
FROM node:20-alpine AS production

# 设置时区为中国
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata

ENV TZ=Asia/Shanghai

# 安装pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# ========== 运行时配置说明 ==========
ARG PORT=3000
ARG NEXT_PUBLIC_DEPLOYMENT_REGION=CN
ENV PORT=$PORT
ENV NEXT_PUBLIC_DEPLOYMENT_REGION=$NEXT_PUBLIC_DEPLOYMENT_REGION

# 从构建阶段复制必要的文件
COPY --from=base /app/package.json /app/pnpm-lock.yaml ./
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.js ./

# 安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 更改文件所有权
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["pnpm", "start"]