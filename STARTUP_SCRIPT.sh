#!/bin/bash

# PersonaLink 项目启动脚本
# 用于快速部署和启动商业化运营

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    # 检查 Git
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装，请先安装 Git"
        exit 1
    fi
    
    # 检查 Docker (可选)
    if command -v docker &> /dev/null; then
        log_success "Docker 已安装"
    else
        log_warning "Docker 未安装，将使用传统部署方式"
    fi
    
    log_success "系统依赖检查完成"
}

# 环境变量配置
setup_environment() {
    log_info "配置环境变量..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log_success "已创建 .env 文件，请编辑配置"
        else
            log_error ".env.example 文件不存在"
            exit 1
        fi
    else
        log_warning ".env 文件已存在，跳过创建"
    fi
    
    # 提示用户配置环境变量
    echo ""
    log_info "请编辑 .env 文件，配置以下必要的环境变量："
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - OPENAI_API_KEY"
    echo "  - STRIPE_SECRET_KEY"
    echo "  - STRIPE_WEBHOOK_SECRET"
    echo "  - REDIS_URL"
    echo "  - JWT_SECRET"
    echo ""
    read -p "配置完成后按回车继续..."
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    if [ -f package-lock.json ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "依赖安装完成"
}

# 数据库初始化
init_database() {
    log_info "初始化数据库..."
    
    if [ -f scripts/init-db.sql ]; then
        log_info "数据库初始化脚本已准备就绪"
        log_warning "请手动在 Supabase 控制台执行 scripts/init-db.sql"
    else
        log_error "数据库初始化脚本不存在"
        exit 1
    fi
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    npm run build
    
    if [ $? -eq 0 ]; then
        log_success "项目构建成功"
    else
        log_error "项目构建失败"
        exit 1
    fi
}

# 本地测试
test_locally() {
    log_info "启动本地测试服务器..."
    
    echo ""
    log_info "本地服务器将在 http://localhost:3000 启动"
    log_info "按 Ctrl+C 停止服务器"
    echo ""
    
    npm start
}

# Docker 部署
deploy_docker() {
    log_info "使用 Docker 部署..."
    
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        log_info "启动 Docker 容器..."
        docker-compose up -d
        
        log_success "Docker 部署完成"
        log_info "应用地址: http://localhost:3000"
        log_info "管理命令: docker-compose logs -f"
    else
        log_error "Docker 或 docker-compose 未安装"
        exit 1
    fi
}

# Vercel 部署
deploy_vercel() {
    log_info "准备 Vercel 部署..."
    
    if command -v vercel &> /dev/null; then
        log_info "开始 Vercel 部署..."
        vercel --prod
    else
        log_warning "Vercel CLI 未安装，请手动部署："
        echo "1. 安装 Vercel CLI: npm i -g vercel"
        echo "2. 登录 Vercel: vercel login"
        echo "3. 部署项目: vercel --prod"
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查端口是否可用
    if curl -s http://localhost:3000 > /dev/null; then
        log_success "应用运行正常"
    else
        log_error "应用无法访问"
        return 1
    fi
    
    # 检查 API 端点
    if curl -s http://localhost:3000/api/health > /dev/null; then
        log_success "API 端点正常"
    else
        log_warning "API 健康检查端点不存在"
    fi
}

# 显示部署选项
show_deployment_options() {
    echo ""
    log_info "选择部署方式："
    echo "1) 本地开发测试"
    echo "2) Docker 容器部署"
    echo "3) Vercel 云部署"
    echo "4) 传统服务器部署"
    echo "5) 退出"
    echo ""
}

# 显示项目信息
show_project_info() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    PersonaLink 项目启动器                    ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║ 项目名称: PersonaLink - AI 驱动的智能社交匹配平台            ║"
    echo "║ 技术栈: Next.js 14 + TypeScript + Supabase + OpenAI         ║"
    echo "║ 状态: 生产就绪，可立即商业化运营                            ║"
    echo "║ 版本: v1.0.0                                                ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

# 显示后续步骤
show_next_steps() {
    echo ""
    log_info "部署完成后的后续步骤："
    echo "1. 配置域名和 SSL 证书"
    echo "2. 设置监控和告警"
    echo "3. 配置备份策略"
    echo "4. 建立客服支持系统"
    echo "5. 制定营销推广计划"
    echo "6. 建立用户反馈机制"
    echo ""
    log_info "详细指南请参考："
    echo "- DEPLOYMENT_GUIDE.md"
    echo "- QUICK_START_GUIDE.md"
    echo "- FINAL_DEPLOYMENT_CHECKLIST.md"
    echo ""
}

# 主函数
main() {
    show_project_info
    
    # 检查依赖
    check_dependencies
    
    # 设置环境变量
    setup_environment
    
    # 安装依赖
    install_dependencies
    
    # 初始化数据库
    init_database
    
    # 构建项目
    build_project
    
    # 显示部署选项
    while true; do
        show_deployment_options
        read -p "请选择部署方式 (1-5): " choice
        
        case $choice in
            1)
                test_locally
                break
                ;;
            2)
                deploy_docker
                break
                ;;
            3)
                deploy_vercel
                break
                ;;
            4)
                log_info "传统服务器部署指南："
                echo "1. 将构建后的文件上传到服务器"
                echo "2. 安装 Node.js 和 PM2"
                echo "3. 使用 PM2 启动应用: pm2 start npm --name 'personalink' -- start"
                echo "4. 配置 Nginx 反向代理"
                break
                ;;
            5)
                log_info "退出启动脚本"
                exit 0
                ;;
            *)
                log_error "无效选择，请重新输入"
                ;;
        esac
    done
    
    # 健康检查
    if [ "$choice" != "3" ]; then
        sleep 5
        health_check
    fi
    
    # 显示后续步骤
    show_next_steps
    
    log_success "PersonaLink 项目启动完成！"
    echo ""
    log_info "🎉 恭喜！您的 AI 社交匹配平台已准备就绪"
    log_info "🚀 立即开始您的创业之旅吧！"
    echo ""
}

# 错误处理
trap 'log_error "脚本执行失败，请检查错误信息"; exit 1' ERR

# 执行主函数
main "$@" 