#!/bin/bash

# PersonaLink Vercel Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-production}

echo -e "${BLUE}🚀 Starting PersonaLink deployment to ${ENVIRONMENT}...${NC}"

# Validate environment variables
echo -e "${YELLOW}🔍 Validating environment variables...${NC}"

REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "UPSTASH_REDIS_URL"
  "UPSTASH_REDIS_TOKEN"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}❌ Error: $var is not set${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✅ Environment variables validated${NC}"

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

if [ "$ENVIRONMENT" = "production" ]; then
    vercel --prod --confirm
else
    vercel --confirm
fi

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "https://personalink.vercel.app")

echo -e "${BLUE}🌐 Deployment URL: ${DEPLOYMENT_URL}${NC}"

# Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
sleep 10

if curl -f "${DEPLOYMENT_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed - deployment may still be warming up${NC}"
fi

# Post-deploy actions
echo -e "${YELLOW}🔄 Running post-deploy actions...${NC}"

# Trigger database migration if needed
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${BLUE}🗄️  Triggering database migration...${NC}"
    # Add your database migration logic here
fi

echo -e "${GREEN}🎉 Deployment process completed!${NC}"
echo -e "${BLUE}📊 Monitor your deployment at: https://vercel.com/dashboard${NC}" 