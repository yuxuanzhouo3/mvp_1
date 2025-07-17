# 🔧 Fix Production Supabase Email Settings

## 🚨 **Current Issue**
You're hitting the email rate limit in your **production Supabase project** (`bamratexknmqvdbalzen.supabase.co`). The local config changes don't affect the production project.

## 🔧 **Step 1: Update Production Supabase Settings**

Go to: https://supabase.com/dashboard/project/bamratexknmqvdbalzen

### **Authentication → Settings**

1. **Email Settings:**
   - ✅ **Enable email confirmations** (turn ON)
   - ✅ **Enable email signups** (should be ON)
   - Set **Max frequency** to `1s` (minimum)
   - Set **OTP expiry** to `3600` (1 hour)

2. **Rate Limits:**
   - **Email sending**: Increase from 10 to **100 per hour**
   - **Sign ups/sign ins**: Increase to **60 per 5 minutes**
   - **Token verifications**: Increase to **500 per 5 minutes**

3. **URL Configuration:**
   - **Site URL**: `https://mornhub.lat`
   - **Redirect URLs**: Add all your domains:
     ```
     https://mornhub.lat/auth/callback
     http://localhost:3000/auth/callback
     http://localhost:3001/auth/callback
     http://localhost:3002/auth/callback
     http://localhost:3003/auth/callback
     ```

## 🔧 **Step 2: Test Email Registration**

After updating the settings, try registering again with `jimzh580@gmail.com`.

## 🔧 **Step 3: Check Email Provider**

If still no emails, check if you have a proper email provider configured:

### **Option A: Use Supabase Default Email (Free)**
- Supabase provides free email sending (up to 100/hour)
- No additional setup needed

### **Option B: Configure Custom SMTP (Recommended for Production)**
1. Go to **Authentication → Email Templates**
2. Click **Configure SMTP**
3. Add your SMTP settings (Gmail, SendGrid, etc.)

## 🔧 **Step 4: Monitor Email Usage**

Go to **Authentication → Rate Limits** to see:
- How many emails you've sent
- Current usage vs limits
- Reset times

## 🧪 **Test After Changes**

1. Try registering with `jimzh580@gmail.com` again
2. Check your email inbox (and spam folder)
3. Click the confirmation link
4. Try logging in

## 📞 **If Still No Emails**

1. **Check spam folder**
2. **Verify email address is correct**
3. **Check Supabase logs** in Dashboard → Logs
4. **Contact Supabase support** if needed

## 🚀 **Quick Fix Script**

Run this to test the current email settings:

```bash
node scripts/test-email-registration.js
``` 