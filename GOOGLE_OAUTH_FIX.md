# 🔧 Google OAuth Fix - Multiple Redirect URLs

## 🚨 **Current Issues:**

1. **Header showing on auth pages** ✅ FIXED with auth layout
2. **Google OAuth not working** - Only `morhhub.lat` configured

## 🔧 **Step 1: Fix Google Cloud Console**

Go to: https://console.cloud.google.com/apis/credentials

**Add ALL these redirect URIs:**

```
# Development URLs
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
http://localhost:3002/auth/callback
http://localhost:3003/auth/callback

# Production URLs (your Vercel deployments)
https://mvp1-3w14fse1u-yzcmf94-4399s-projects.vercel.app/auth/callback
https://mvp1-nt6fa4k4j-yzcmf94-4399s-projects.vercel.app/auth/callback
https://mvp1-kkx9rzp6e-yzcmf94-4399s-projects.vercel.app/auth/callback
https://mvp1-7fdl13xk2-yzcmf94-4399s-projects.vercel.app/auth/callback
```

## 🔧 **Step 2: Fix Supabase Configuration**

Go to: https://supabase.com/dashboard/project/bamratexknmqvdbalzen

**Authentication → URL Configuration:**

```
Site URL: https://mvp1-3w14fse1u-yzcmf94-4399s-projects.vercel.app

Redirect URLs (add all):
https://mvp1-3w14fse1u-yzcmf94-4399s-projects.vercel.app/auth/callback
https://mvp1-nt6fa4k4j-yzcmf94-4399s-projects.vercel.app/auth/callback
https://mvp1-kkx9rzp6e-yzcmf94-4399s-projects.vercel.app/auth/callback
https://mvp1-7fdl13xk2-yzcmf94-4399s-projects.vercel.app/auth/callback
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
http://localhost:3002/auth/callback
http://localhost:3003/auth/callback
```

## 🧪 **Test After Configuration**

### **Test All URLs:**

1. **Main URL**: https://mvp1-3w14fse1u-yzcmf94-4399s-projects.vercel.app/auth/login
2. **Alternative 1**: https://mvp1-nt6fa4k4j-yzcmf94-4399s-projects.vercel.app/auth/login
3. **Alternative 2**: https://mvp1-kkx9rzp6e-yzcmf94-4399s-projects.vercel.app/auth/login
4. **Alternative 3**: https://mvp1-7fdl13xk2-yzcmf94-4399s-projects.vercel.app/auth/login

### **What Should Happen:**

1. ✅ **No header** on auth pages (fixed with auth layout)
2. ✅ **Google button works** on all URLs
3. ✅ **OAuth flow completes** successfully
4. ✅ **Redirects back** to your app
5. ✅ **User logged in** after OAuth

## 🚨 **Common Errors & Solutions**

### **Error: "Invalid redirect URI"**
- Make sure ALL URLs are added to Google Cloud Console
- Check for exact URL matches (no trailing slashes)
- Verify protocol (http vs https)

### **Error: "OAuth consent screen"**
- Add all domains to OAuth consent screen:
  ```
  mvp1-3w14fse1u-yzcmf94-4399s-projects.vercel.app
  mvp1-nt6fa4k4j-yzcmf94-4399s-projects.vercel.app
  mvp1-kkx9rzp6e-yzcmf94-4399s-projects.vercel.app
  mvp1-7fdl13xk2-yzcmf94-4399s-projects.vercel.app
  ```

### **Error: "Supabase redirect URL"**
- Make sure ALL URLs are added to Supabase
- Check Site URL is set correctly
- Verify redirect URLs list includes all URLs

## ✅ **Verification Checklist**

- [ ] All 8 redirect URLs added to Google Cloud Console
- [ ] All 8 redirect URLs added to Supabase
- [ ] Site URL set to main production URL
- [ ] OAuth consent screen includes all domains
- [ ] No header on auth pages
- [ ] Google button works on all URLs
- [ ] OAuth flow completes successfully
- [ ] Users can sign in from any URL

## 🎯 **Next Steps**

1. **Add all redirect URLs** to Google Cloud Console
2. **Add all redirect URLs** to Supabase
3. **Test each URL** individually
4. **Monitor for errors** in browser console
5. **Check Supabase logs** for authentication events

## 📞 **Support**

If you still have issues:
1. Check browser console for specific error messages
2. Verify each URL is added exactly as shown
3. Test with browser developer tools open
4. Check Supabase logs for authentication errors 