#!/bin/bash

# Emergency Rollback Script for PersonaLink
# Usage: ./scripts/rollback-emergency.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🚨 EMERGENCY ROLLBACK INITIATED${NC}"

# Get the last stable deployment
echo -e "${YELLOW}🔍 Finding last stable deployment...${NC}"

# List recent deployments and find the second one (previous stable)
LAST_STABLE=$(vercel ls --json | jq -r '.[1].uid' 2>/dev/null)

if [ -z "$LAST_STABLE" ] || [ "$LAST_STABLE" = "null" ]; then
    echo -e "${RED}❌ No previous deployment found for rollback${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Rolling back to deployment: $LAST_STABLE${NC}"

# Perform rollback
vercel rollback "$LAST_STABLE" --yes

echo -e "${GREEN}✅ Emergency rollback completed!${NC}"

# Health check after rollback
echo -e "${YELLOW}🏥 Running health check after rollback...${NC}"
sleep 10

DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "https://your-app-name.vercel.app")

if curl -f "$DEPLOYMENT_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed after rollback${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed - deployment may still be warming up${NC}"
fi

echo -e "${BLUE}🌐 Current deployment URL: ${DEPLOYMENT_URL}${NC}"
echo -e "${GREEN}🎉 Emergency rollback process completed!${NC}" 