# 🔧 Update Production Supabase Settings

## 🚨 **Current Issue**
The dashboard loading spinner never disappears, suggesting API rate limits or authentication issues in production.

## 🔧 **Updated Settings to Apply**

### **1. Go to Supabase Dashboard**
Visit: https://supabase.com/dashboard/project/bamratexknmqvdbalzen

### **2. Authentication → Settings**

#### **Rate Limits:**
- **Email sending**: Increase from 100 to **200 per hour**
- **Sign ups/sign ins**: Increase from 60 to **100 per 5 minutes**
- **Token refresh**: Increase from 300 to **500 per 5 minutes**
- **Token verifications**: Increase from 500 to **1000 per 5 minutes**
- **Anonymous users**: Increase from 50 to **100 per hour**
- **Web3 logins**: Increase from 50 to **100 per 5 minutes**

#### **Email Settings:**
- **Enable email confirmations**: Turn OFF (set to false)
- **Max frequency**: Keep at `1s`
- **OTP expiry**: Keep at `3600` (1 hour)

#### **Session Settings:**
- **Session timebox**: Increase from 7 days to **30 days**
- **Inactivity timeout**: Increase from 24 hours to **7 days**

### **3. Apply Changes**
1. Save all settings
2. Wait 1-2 minutes for changes to propagate
3. Test the dashboard again

## 🧪 **Test After Changes**
Run the test script again to see if the dashboard loading issue is resolved:

```bash
node scripts/test-production-dashboard.js
```

## 📊 **Expected Results**
- Dashboard should load within 2-3 seconds
- No infinite loading spinner
- All three accounts should work properly
- Logout button should be visible

## 🔍 **If Issues Persist**
The problem might be:
1. **API endpoint issues** (not rate limits)
2. **Database connection problems**
3. **Frontend state management issues**

Let me know the results after applying these changes! 