#!/bin/bash

# PersonaLink 项目设置脚本
echo "🚀 欢迎使用 PersonaLink 设置脚本！"
echo "=================================="

# 检查 Node.js 版本
echo "📋 检查系统要求..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js v18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 v18+，当前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $(node -v)"

# 检查包管理器
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
    echo "✅ 使用 pnpm 作为包管理器"
elif command -v yarn &> /dev/null; then
    PACKAGE_MANAGER="yarn"
    echo "✅ 使用 yarn 作为包管理器"
else
    PACKAGE_MANAGER="npm"
    echo "✅ 使用 npm 作为包管理器"
fi

# 安装依赖
echo "📦 安装项目依赖..."
$PACKAGE_MANAGER install

# 检查环境变量文件
if [ ! -f ".env.local" ]; then
    echo "🔧 创建环境变量文件..."
    cp .env.example .env.local
    echo "✅ 已创建 .env.local 文件"
    echo "⚠️  请编辑 .env.local 文件并填入您的配置信息"
else
    echo "✅ 环境变量文件已存在"
fi

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p public/uploads
mkdir -p public/avatars
echo "✅ 目录创建完成"

# 检查 TypeScript 配置
if [ ! -f "tsconfig.json" ]; then
    echo "📝 创建 TypeScript 配置..."
    cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
    echo "✅ TypeScript 配置创建完成"
fi

# 检查 Tailwind 配置
if [ ! -f "tailwind.config.js" ]; then
    echo "🎨 创建 Tailwind 配置..."
    cat > tailwind.config.js << EOF
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
EOF
    echo "✅ Tailwind 配置创建完成"
fi

echo ""
echo "🎉 设置完成！"
echo "=================================="
echo "📝 下一步操作："
echo "1. 编辑 .env.local 文件，填入您的配置信息"
echo "2. 在 Supabase 中创建项目并执行数据库脚本"
echo "3. 运行 'npm run dev' 启动开发服务器"
echo "4. 访问 http://localhost:3000 查看应用"
echo ""
echo "📚 更多信息请查看 README.md 文件"
echo "==================================" 