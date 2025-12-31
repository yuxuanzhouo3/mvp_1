#!/bin/bash

# PersonaLink Vercel Setup Script
# This script configures environment variables and project settings for Vercel deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Setting up PersonaLink for Vercel deployment...${NC}"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Vercel CLI...${NC}"
    npm install -g vercel@latest
fi

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}🔐 Please log in to Vercel...${NC}"
    vercel login
fi

echo -e "${GREEN}✅ Vercel CLI ready${NC}"

# Initialize Vercel project if not already done
if [ ! -f ".vercel/project.json" ]; then
    echo -e "${YELLOW}🚀 Initializing Vercel project...${NC}"
    vercel --yes
fi

# Function to add environment variable
add_env_var() {
    local var_name=$1
    local var_value=$2
    local environment=${3:-production}
    
    echo -e "${YELLOW}🔧 Adding $var_name to $environment environment...${NC}"
    
    # Check if variable already exists
    if vercel env ls | grep -q "$var_name"; then
        echo -e "${BLUE}⚠️  $var_name already exists, updating...${NC}"
        vercel env rm "$var_name" "$environment" --yes
    fi
    
    echo "$var_value" | vercel env add "$var_name" "$environment"
    echo -e "${GREEN}✅ Added $var_name${NC}"
}

# Read from .env.local if it exists
if [ -f ".env.local" ]; then
    echo -e "${BLUE}📖 Reading environment variables from .env.local...${NC}"
    source .env.local
else
    echo -e "${RED}❌ .env.local not found. Please create it with your environment variables.${NC}"
    exit 1
fi

# Add environment variables to Vercel
echo -e "${YELLOW}🔧 Adding environment variables to Vercel...${NC}"

# Supabase variables
add_env_var "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL"
add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"

# Redis variables
add_env_var "UPSTASH_REDIS_URL" "$UPSTASH_REDIS_URL"
add_env_var "UPSTASH_REDIS_TOKEN" "$UPSTASH_REDIS_TOKEN"

# NextAuth variables
if [ -z "$NEXTAUTH_SECRET" ]; then
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo -e "${YELLOW}🔑 Generated new NEXTAUTH_SECRET${NC}"
fi
add_env_var "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"

# Stripe variables (if available)
if [ ! -z "$STRIPE_SECRET_KEY" ]; then
    add_env_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
fi

if [ ! -z "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then
    add_env_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
fi

if [ ! -z "$STRIPE_WEBHOOK_SECRET" ]; then
    add_env_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
fi

# Add preview environment variables
echo -e "${YELLOW}🔧 Adding environment variables to preview environment...${NC}"
add_env_var "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL" "preview"
add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "preview"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "preview"
add_env_var "UPSTASH_REDIS_URL" "$UPSTASH_REDIS_URL" "preview"
add_env_var "UPSTASH_REDIS_TOKEN" "$UPSTASH_REDIS_TOKEN" "preview"
add_env_var "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET" "preview"

# Enable Vercel features
echo -e "${YELLOW}🔧 Enabling Vercel features...${NC}"

# Enable function monitoring
vercel logs:enable 2>/dev/null || echo -e "${BLUE}⚠️  Logs already enabled${NC}"

# Enable development mode
vercel dev:enable 2>/dev/null || echo -e "${BLUE}⚠️  Dev mode already enabled${NC}"

# Enable CDN
vercel cdn:enable 2>/dev/null || echo -e "${BLUE}⚠️  CDN already enabled${NC}"

echo -e "${GREEN}✅ Vercel setup completed!${NC}"

# Display project information
echo -e "${BLUE}📊 Project Information:${NC}"
vercel ls --json | jq -r '.[0] | "Project: \(.name)\nURL: \(.url)\nCreated: \(.created)"' 2>/dev/null || echo "Project information not available"

echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "  1. Run './scripts/deploy.sh' to deploy to production"
echo -e "  2. Run './scripts/deploy.sh preview' to deploy to preview"
echo -e "  3. Monitor your deployment at https://vercel.com/dashboard" 