#!/bin/bash

# PersonaLink Vercel Rollback Script
# Usage: ./scripts/rollback.sh [deployment-id]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DEPLOYMENT_ID=${1:-"last"}

echo -e "${BLUE}🔄 Rolling back PersonaLink deployment...${NC}"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found${NC}"
    exit 1
fi

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Vercel${NC}"
    exit 1
fi

# List recent deployments
echo -e "${YELLOW}📋 Recent deployments:${NC}"
vercel ls --json | jq -r '.[0:5] | .[] | "\(.uid) - \(.name) (\(.created))"' 2>/dev/null || echo "No deployments found"

# Perform rollback
echo -e "${YELLOW}🔄 Rolling back to deployment: $DEPLOYMENT_ID${NC}"

if [ "$DEPLOYMENT_ID" = "last" ]; then
    vercel rollback --yes
else
    vercel rollback "$DEPLOYMENT_ID" --yes
fi

echo -e "${GREEN}✅ Rollback completed successfully!${NC}"

# Get current deployment URL
DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "https://personalink.vercel.app")

echo -e "${BLUE}🌐 Current deployment URL: ${DEPLOYMENT_URL}${NC}"

# Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
sleep 10

if curl -f "${DEPLOYMENT_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed - deployment may still be warming up${NC}"
fi

echo -e "${GREEN}🎉 Rollback process completed!${NC}" 