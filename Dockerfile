# 使用多阶段构建减小镜像大小
FROM node:20-alpine AS base

# 安装 Puppeteer 所需的系统依赖
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# 告诉 Puppeteer 跳过下载 Chromium，使用系统安装的版本
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 设置工作目录
WORKDIR /app

# ========== 构建阶段 ==========
FROM base AS builder

ARG NEXT_PUBLIC_DEPLOYMENT_REGION=CN

ENV NEXT_PUBLIC_DEPLOYMENT_REGION=$NEXT_PUBLIC_DEPLOYMENT_REGION

# 复制包管理文件
COPY package.json package-lock.json ./

# 安装依赖（包括 devDependencies，构建时需要）
RUN npm ci

# 复制源代码
COPY . .

# 构建时环境变量占位符（避免构建失败）
ARG NEXT_PUBLIC_SUPABASE_URL=https://build-placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=build-placeholder-key

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# 设置 Next.js 输出模式为 standalone（Docker 部署必需）
ENV NEXT_OUTPUT_MODE=standalone

# 跳过 Google Fonts 优化（避免网络问题）
ENV NEXT_FONT_GOOGLE_MOCKED_RESPONSES='[{"url":"https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap","content":"","contentType":"text/css"}]'

# 构建应用
RUN npm run build

# 构建完成后设置生产环境
ENV NODE_ENV=production

# ========== 生产阶段 ==========
FROM base AS production

ARG PORT=3000
ARG NEXT_PUBLIC_DEPLOYMENT_REGION=CN

ENV PORT=$PORT
ENV NEXT_PUBLIC_DEPLOYMENT_REGION=$NEXT_PUBLIC_DEPLOYMENT_REGION
ENV NODE_ENV=production

# 从构建阶段复制必要的文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]
