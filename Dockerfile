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

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建时环境变量占位符
ARG NEXT_PUBLIC_SUPABASE_URL=https://build-placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=build-placeholder-key

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# 构建应用
RUN npm run build

# 生产阶段
FROM node:20-alpine AS production

# 设置工作目录
WORKDIR /app

# ========== 运行时配置说明 ==========
# 真实的配置通过环境变量注入到容器中，
# 前端通过 /api/auth/config 接口在运行时获取这些 MY_NEXT_PUBLIC_... 变量。

ARG PORT=3000
ARG NEXT_PUBLIC_DEPLOYMENT_REGION=CN

ENV PORT=$PORT
ENV NEXT_PUBLIC_DEPLOYMENT_REGION=$NEXT_PUBLIC_DEPLOYMENT_REGION

# 从构建阶段复制必要的文件
COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.js ./

# 安装生产依赖
RUN npm ci --omit=dev

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 更改文件所有权
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]