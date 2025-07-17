#!/bin/bash

# Update Supabase Configuration Script
# This script helps update your Supabase project with optimized rate limits and session settings

echo "🚀 Updating Supabase Configuration for Production..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this from your project root."
    exit 1
fi

echo "📋 Current configuration has been updated with:"
echo ""
echo "🔧 Rate Limits (Increased for Production):"
echo "   • Email sending: 2 → 10 per hour"
echo "   • SMS messages: 30 → 100 per hour"
echo "   • Token refreshes: 150 → 300 per 5 minutes"
echo "   • Token verifications: 30 → 500 per 5 minutes"
echo "   • Sign ups/sign ins: 30 → 60 per 5 minutes"
echo "   • Anonymous users: 30 → 50 per hour"
echo "   • Web3 logins: 30 → 50 per 5 minutes"
echo ""
echo "⏰ Session Settings (Added):"
echo "   • Session timebox: 7 days (force logout after 7 days)"
echo "   • Inactivity timeout: 24 hours (force logout after 24h inactive)"
echo ""

# Ask user if they want to apply changes
read -p "🤔 Do you want to apply these changes to your Supabase project? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Applying configuration changes..."
    
    # Link to project if not already linked
    if [ ! -f ".supabase/project.toml" ]; then
        echo "🔗 Linking to Supabase project..."
        supabase link --project-ref bamratexknmqvdbalzen
    fi
    
    # Apply the configuration
    echo "📤 Pushing configuration to Supabase..."
    supabase db push
    
    if [ $? -eq 0 ]; then
        echo "✅ Configuration updated successfully!"
        echo ""
        echo "🎉 Your Supabase project now has optimized settings for production use."
        echo ""
        echo "📊 New Rate Limits Summary:"
        echo "   • Better support for user registration and login"
        echo "   • Higher capacity for token refreshes (active users)"
        echo "   • More OTP verifications for phone/magic link auth"
        echo "   • Increased email/SMS limits for notifications"
        echo ""
        echo "🔒 Session Security:"
        echo "   • Users stay logged in for up to 7 days"
        echo "   • Auto-logout after 24 hours of inactivity"
        echo "   • Refresh token rotation enabled for security"
        echo ""
        echo "🌐 Your app at mornhub.lat should now handle more concurrent users!"
    else
        echo "❌ Failed to update configuration. Please check your Supabase project settings."
        exit 1
    fi
else
    echo "⏭️ Skipping configuration update."
    echo ""
    echo "💡 You can manually apply these changes by:"
    echo "   1. Going to your Supabase Dashboard"
    echo "   2. Navigate to Authentication > Settings"
    echo "   3. Update the rate limits and session settings"
    echo "   4. Or run this script again when ready"
fi

echo ""
echo "📚 Additional Recommendations:"
echo "   • Monitor your rate limit usage in Supabase Dashboard"
echo "   • Consider upgrading to Pro plan for higher limits if needed"
echo "   • Set up proper email/SMS providers for production"
echo "   • Enable MFA for enhanced security" 