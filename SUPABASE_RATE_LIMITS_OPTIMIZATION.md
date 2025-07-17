# 🚀 Supabase Rate Limits & Session Optimization Guide

## 📊 **Current vs Optimized Settings**

### **Rate Limits (Before → After)**

| Feature | Current | Optimized | Improvement |
|---------|---------|-----------|-------------|
| **Email sending** | 2/hour | **10/hour** | +400% capacity |
| **SMS messages** | 30/hour | **100/hour** | +233% capacity |
| **Token refreshes** | 150/5min | **300/5min** | +100% capacity |
| **Token verifications** | 30/5min | **500/5min** | +1567% capacity |
| **Sign ups/sign ins** | 30/5min | **60/5min** | +100% capacity |
| **Anonymous users** | 30/hour | **50/hour** | +67% capacity |
| **Web3 logins** | 30/5min | **50/5min** | +67% capacity |

### **Session Settings (New)**

| Setting | Value | Purpose |
|---------|-------|---------|
| **Session timebox** | 7 days | Force logout after 7 days for security |
| **Inactivity timeout** | 24 hours | Auto-logout after 24h of inactivity |
| **Refresh token reuse** | 10 seconds | Prevent replay attacks |
| **Token rotation** | Enabled | Enhanced security |

## 🎯 **Why These Changes Matter**

### **For Your Production App (mornhub.lat)**

1. **Better User Experience**
   - Users can stay logged in longer (7 days vs 1 hour)
   - Less frequent re-authentication required
   - Smoother session management

2. **Higher Capacity**
   - Support more concurrent users
   - Handle peak traffic better
   - Reduce rate limit errors

3. **Enhanced Security**
   - Automatic logout on inactivity
   - Refresh token rotation prevents attacks
   - Compromised token detection

## 🔧 **How to Apply Changes**

### **Option 1: Automated Script (Recommended)**
```bash
./scripts/update-supabase-config.sh
```

### **Option 2: Manual Dashboard Update**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/bamratexknmqvdbalzen)
2. Navigate to **Authentication > Settings**
3. Update rate limits in the UI
4. Configure session timeouts

### **Option 3: CLI Update**
```bash
# Link to your project
supabase link --project-ref bamratexknmqvdbalzen

# Push configuration
supabase db push
```

## 📈 **Expected Impact**

### **User Registration & Login**
- **Before**: 30 sign-ups per 5 minutes
- **After**: 60 sign-ups per 5 minutes
- **Result**: Handle 2x more new user registrations

### **Active User Sessions**
- **Before**: 150 token refreshes per 5 minutes
- **After**: 300 token refreshes per 5 minutes
- **Result**: Support 2x more active users

### **Phone/Magic Link Auth**
- **Before**: 30 OTP verifications per 5 minutes
- **After**: 500 OTP verifications per 5 minutes
- **Result**: Handle 16x more phone authentication

### **Email Notifications**
- **Before**: 2 emails per hour
- **After**: 10 emails per hour
- **Result**: Send 5x more user notifications

## 🔍 **Monitoring & Alerts**

### **Track Usage in Supabase Dashboard**
1. Go to **Authentication > Rate Limits**
2. Monitor real-time usage
3. Set up alerts for high usage

### **Key Metrics to Watch**
- Token refresh rate
- Sign-up/sign-in frequency
- Email/SMS sending volume
- Session duration patterns

## ⚠️ **Important Notes**

### **Free Plan Limitations**
- These settings work within Supabase's free tier
- Consider Pro plan for higher limits if needed
- Monitor usage to avoid hitting limits

### **Security Considerations**
- 7-day sessions are secure with proper token rotation
- 24-hour inactivity timeout balances UX and security
- Refresh token reuse interval prevents attacks

### **Production Recommendations**
1. **Set up proper email provider** (SendGrid, AWS SES)
2. **Configure SMS provider** (Twilio, MessageBird)
3. **Enable MFA** for enhanced security
4. **Monitor rate limit usage** regularly

## 🚀 **Next Steps**

1. **Apply the configuration** using the script
2. **Test the changes** with your app
3. **Monitor usage** in Supabase dashboard
4. **Consider Pro plan** if you need higher limits
5. **Set up proper email/SMS providers** for production

## 📞 **Support**

If you encounter any issues:
1. Check Supabase dashboard for error logs
2. Monitor rate limit usage
3. Consider upgrading to Pro plan for higher limits
4. Contact Supabase support if needed

---

**Last Updated**: $(date)
**Project**: mornhub.lat
**Supabase Project**: bamratexknmqvdbalzen 