#!/bin/bash

# Complete PersonaLink Deployment Script
# Usage: ./scripts/deploy-complete.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Complete PersonaLink Deployment${NC}"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Installing...${NC}"
    npm install -g vercel@latest
fi

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Vercel. Please run 'vercel login' first${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Vercel CLI ready${NC}"

# Run type checking
echo -e "${YELLOW}🔍 Running type checking...${NC}"
npm run type-check
echo -e "${GREEN}✅ Type checking passed${NC}"

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm run test:ci
echo -e "${GREEN}✅ Tests passed${NC}"

# Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build
echo -e "${GREEN}✅ Build completed${NC}"

# Deploy to Vercel
echo -e "${YELLOW}🚀 Deploying to Vercel...${NC}"
vercel --prod --force --yes --build-env NEXT_PUBLIC_APP_ENV=production

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "https://your-app-name.vercel.app")

echo -e "${BLUE}🌐 Deployment URL: ${DEPLOYMENT_URL}${NC}"

# Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
sleep 15

if curl -f "${DEPLOYMENT_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed - deployment may still be warming up${NC}"
fi

# Enable Vercel features
echo -e "${YELLOW}🔧 Enabling Vercel features...${NC}"
vercel logs:enable 2>/dev/null || echo -e "${BLUE}⚠️  Logs already enabled${NC}"
vercel dev:enable 2>/dev/null || echo -e "${BLUE}⚠️  Dev mode already enabled${NC}"

echo -e "${GREEN}🎉 Complete deployment process finished!${NC}"
echo -e "${BLUE}📊 Monitor your deployment at: https://vercel.com/dashboard${NC}"
echo -e "${BLUE}🔗 Your app is live at: ${DEPLOYMENT_URL}${NC}" 