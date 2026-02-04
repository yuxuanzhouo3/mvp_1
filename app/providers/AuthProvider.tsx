"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { clearAllCaches } from '@/lib/utils/cache-cleaner';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { getAuthServiceAsync } from '@/lib/services/auth';
import { isWechatMiniProgramWebView } from '@/lib/utils/miniprogram-compat';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithWeChat: () => Promise<{ error: any }>;
  signInWithPhone: (phone: string) => Promise<{ error: any }>;
  verifyPhoneOTP: (phone: string, otp: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitializedRef = useRef(false);
  const userRef = useRef<User | null>(null);

  const supabase = getSupabaseClient();

  // Initialize auth state only once
  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;

    const isAdminRoute =
      typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    if (isAdminRoute) {
      setUser(null);
      userRef.current = null;
      setSession(null);
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        const isCN = isChinaDeployment();
        const cnUserData = localStorage.getItem('cn_user');

        if (isCN) {
          if (typeof window !== 'undefined') {
            try {
              const url = new URL(window.location.href);
              const params = url.searchParams;
              const token = params.get('token');
              const mpCode = params.get('mpCode');
              const openid = params.get('openid');
              const mpNickName = params.get('mpNickName');
              const mpAvatarUrl = params.get('mpAvatarUrl');

              if (token || mpCode) {
                let finalToken = token;
                let finalOpenid = openid;

                if (!finalToken && mpCode) {
                  const checkRes = await fetch('/api/wxlogin/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: mpCode }),
                    credentials: 'include',
                    cache: 'no-store',
                  });
                  const checkJson = await checkRes.json();
                  if (checkRes.ok && checkJson?.success && typeof checkJson?.token === 'string') {
                    finalToken = checkJson.token;
                    finalOpenid = typeof checkJson?.openid === 'string' ? checkJson.openid : finalOpenid;
                  }
                }

                if (finalToken) {
                  await fetch('/api/auth/mp-callback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      token: finalToken,
                      openid: finalOpenid,
                      nickName: mpNickName,
                      avatarUrl: mpAvatarUrl,
                    }),
                    credentials: 'include',
                    cache: 'no-store',
                  });
                }

                ['token', 'openid', 'expiresIn', 'mpCode', 'mpNickName', 'mpAvatarUrl', 'mpProfileTs'].forEach((k) =>
                  params.delete(k)
                );
                window.history.replaceState({}, '', url.toString());
              }
            } catch {}
          }

          if (cnUserData) {
            try {
              const cnUser = JSON.parse(cnUserData) as User;

              setUser(cnUser);
              userRef.current = cnUser;
              setSession(null);
            } catch (e) {
              localStorage.removeItem('cn_user');
              setUser(null);
              userRef.current = null;
              setSession(null);
            }
          }

          try {
            const response = await fetch('/api/auth/cn-me', {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
            });

            if (response.ok) {
              const result = await response.json();
              const serverUser = result?.user;

              if (serverUser?.id) {
                const cnUser = {
                  id: serverUser.id,
                  email: serverUser.email,
                  user_metadata: {
                    display_name: serverUser.displayName,
                    avatar_url: serverUser.avatarUrl,
                  },
                } as any;

                setUser(cnUser);
                userRef.current = cnUser;
                setSession(null);

                localStorage.setItem('cn_user', JSON.stringify(cnUser));
              } else {
                localStorage.removeItem('cn_user');
                setUser(null);
                userRef.current = null;
                setSession(null);
              }
            } else {
              localStorage.removeItem('cn_user');
              setUser(null);
              userRef.current = null;
              setSession(null);
            }
          } catch {
            localStorage.removeItem('cn_user');
            setUser(null);
            userRef.current = null;
            setSession(null);
          }

          setLoading(false);
          return;
        }

        // INTL 环境：Get initial session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting initial session:', error);
        } else if (session) {
          setSession(session);
          setUser(session.user);
          userRef.current = session.user;
        }
      } catch (error) {
        console.error('Error in initializeAuth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change listener (only for INTL environment)
    // CN environment uses localStorage/cookie based auth, not Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        // CN 环境：忽略 Supabase auth state changes，因为使用独立的认证系统
        // 同时检查 localStorage 中是否有 cn_user 数据，作为 CN 环境的备用判断
        const cnUserData = localStorage.getItem('cn_user');
        if (isChinaDeployment() || cnUserData) {
          console.log(`📋 CN environment: Ignoring Supabase auth event: ${event} (isCN=${isChinaDeployment()}, cnUserData=${!!cnUserData})`);
          return;
        }

        setLoading(true);

        try {
          if (event === 'SIGNED_IN' && session) {
            setSession(session);
            setUser(session.user);
            userRef.current = session.user;
          } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            userRef.current = null;
          } else if (event === 'TOKEN_REFRESHED' && session) {
            setSession(session);
            setUser(session.user);
          } else if (event === 'INITIAL_SESSION') {
            console.log('📋 Initial session event');
            if (session) {
              setSession(session);
              setUser(session.user);
              userRef.current = session.user;
            } else {
              setSession(null);
              setUser(null);
              userRef.current = null;
            }
          }
        } catch (error) {
          console.error('❌ Error in auth state change handler:', error);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once

  const signIn = useCallback(async (email: string, password: string) => {
    // CN 环境使用 Cloudbase Auth
    if (isChinaDeployment()) {
      // 🔒 重要：登录前先清除旧的认证数据，防止身份混淆
      // 这是修复用户 A 登录后读取用户 B 数据的关键
      console.log('🧹 CN Login: Clearing old auth data before login...');
      localStorage.removeItem('cn_user');
      if (typeof window !== 'undefined') {
        const isSecure = window.location.protocol === 'https:';
        // 清除旧的 cookies
        document.cookie = 'cn_session=; path=/; max-age=0; SameSite=Lax';
        if (isSecure) {
          document.cookie = 'cn_session_cross=; path=/; max-age=0; SameSite=None; Secure';
        }
      }
      // 清除内存中的旧状态
      setUser(null);
      userRef.current = null;
      setSession(null);

      const authService = await getAuthServiceAsync();
      const result = await authService.signInWithEmail(email, password);
      if (!result.success) {
        return { error: { message: result.error || '登录失败' } };
      }

      // CN 环境：手动设置 user 状态（因为没有 Supabase 的 onAuthStateChange）
      if (result.user) {
        const cnUser = {
          id: result.user.id,
          email: result.user.email,
          user_metadata: {
            display_name: result.user.displayName,
            avatar_url: result.user.avatarUrl,
          },
        } as any;
        
        console.log('🔐 CN Login: Setting new user data for:', result.user.email, 'ID:', result.user.id);
        
        setUser(cnUser);
        userRef.current = cnUser;
        setSession(null);

        // 保存用户数据到 localStorage（供页面刷新后恢复）
        localStorage.setItem('cn_user', JSON.stringify(cnUser));

        console.log('✅ CN user state updated:', cnUser.email);
      }

      return { error: null };
    }

    // INTL 环境使用 Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = useCallback(async () => {
    console.log('🔐 SignInWithGoogle called');

    // CN 环境不支持 Google 登录
    if (isChinaDeployment()) {
      return { error: { message: 'Google 登录在中国区不可用' } };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { error };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithWeChat = useCallback(async () => {
    console.log('🔐 SignInWithWeChat called');
    console.log('📱 Environment check - isChinaDeployment:', isChinaDeployment());
    console.log('🌐 Current URL:', window.location.href);
    console.log('🔍 User Agent:', navigator.userAgent);

    // INTL 环境不支持微信登录
    if (!isChinaDeployment()) {
      console.log('❌ Not in China deployment, WeChat login not available');
      return { error: { message: 'WeChat login is not available in international region' } };
    }

    if (isWechatMiniProgramWebView()) {
      const returnUrl = window.location.href;
      const encodedUrl = encodeURIComponent(returnUrl);
      const mp = (window as any)?.wx?.miniProgram;

      try {
        if (mp && typeof mp.navigateTo === 'function') {
          mp.navigateTo({ url: `/pages/webshell/login?returnUrl=${encodedUrl}` });
          return { error: null };
        }
      } catch {}

      try {
        if (mp && typeof mp.postMessage === 'function') {
          mp.postMessage({ type: 'REQUEST_WX_LOGIN', returnUrl });
          return { error: null };
        }
      } catch {}

      try {
        if ((window as any)?.wx?.miniProgram?.postMessage) {
          (window as any).wx.miniProgram.postMessage({ type: 'REQUEST_WX_LOGIN', returnUrl });
          return { error: null };
        }
      } catch {}

      return { error: { message: '当前微信小程序环境不支持登录调用方式' } };
    }

    const redirectPath = '/dashboard';

    // Check for Android WebView bridge with retry mechanism
    const checkAndroidBridge = () => {
      console.log('🔍 Checking for AndroidWeChatBridge...');
      console.log('🔍 window object keys:', Object.keys(window).filter(k => k.includes('Android') || k.includes('WeChat')));
      const androidBridge = (window as any)?.AndroidWeChatBridge;
      console.log('🔍 AndroidWeChatBridge exists:', !!androidBridge);
      console.log('🔍 AndroidWeChatBridge type:', typeof androidBridge);
      if (androidBridge) {
        console.log('🔍 AndroidWeChatBridge.login exists:', !!androidBridge.login);
        console.log('🔍 AndroidWeChatBridge.login type:', typeof androidBridge.login);
      }
      return androidBridge;
    };

    let androidBridge = checkAndroidBridge();

    // If bridge not found, retry after a short delay
    if (!androidBridge || typeof androidBridge.login !== 'function') {
      console.log('⏳ Bridge not found, retrying after 100ms...');
      await new Promise(resolve => setTimeout(resolve, 100));
      androidBridge = checkAndroidBridge();
    }

    if (androidBridge && typeof androidBridge.login === 'function') {
      try {
        const response = await fetch(
          `/api/auth/wechat/app/start?redirect=${encodeURIComponent(redirectPath)}`,
          { method: 'GET', cache: 'no-store' }
        );
        const data = await response.json();
        const state = typeof data?.state === 'string' ? data.state : null;

        if (!response.ok || !state) {
          return { error: { message: data?.error || '无法初始化微信登录' } };
        }

        sessionStorage.setItem('wechat_mobile_app_state', state);

        if (typeof androidBridge.startLogin === 'function') {
          androidBridge.startLogin(state);
          return { error: null };
        }

        if (typeof androidBridge.loginWithState === 'function') {
          androidBridge.loginWithState(state);
          return { error: null };
        }

        console.error('❌ Android bridge missing signed state methods');
        return { error: { message: 'Android bridge 不支持签名 state，请更新应用' } };
      } catch (e) {
        console.error('❌ Android WeChat bridge error:', e);
        return { error: { message: '无法初始化微信登录' } };
      }
    }

    // Check for React Native WebView
    const rnWebView = (window as any)?.ReactNativeWebView;
    if (rnWebView && typeof rnWebView.postMessage === 'function') {
      try {
        const response = await fetch(
          `/api/auth/wechat/app/start?redirect=${encodeURIComponent(redirectPath)}`,
          { method: 'GET', cache: 'no-store' }
        );
        const data = await response.json();
        if (response.ok && data?.appId && data?.state) {
          rnWebView.postMessage(
            JSON.stringify({
              type: 'WECHAT_MOBILE_APP_LOGIN',
              appId: data.appId,
              state: data.state,
              scope: data.scope,
            })
          );
          return { error: null };
        }
      } catch {}
    }

    window.location.href = `/api/auth/wechat/start?redirect=${encodeURIComponent(redirectPath)}`;

    return { error: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithPhone = useCallback(async (phone: string) => {
    console.log('🔐 SignInWithPhone called');

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    return { error };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyPhoneOTP = useCallback(async (phone: string, otp: string) => {
    console.log('🔐 VerifyPhoneOTP called');

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms'
    });

    return { error };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    console.log('🔐 SignUp called');

    // CN 环境使用 Cloudbase Auth
    if (isChinaDeployment()) {
      const authService = await getAuthServiceAsync();
      const result = await authService.signUpWithEmail({ email, password });
      if (!result.success) {
        return { error: { message: result.error || '注册失败' } };
      }
      return { error: null };
    }

    // INTL 环境使用 Supabase
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    return { error };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    console.log('🚪 SignOut called');

    try {
      // Get user ID before clearing state (for cache cleanup)
      const currentUserId = userRef.current?.id;

      // Clear all caches first (before Supabase signOut)
      await clearAllCaches({ userId: currentUserId });

      // CN 环境：通过 API 清除服务端 cookie，并清除 localStorage
      if (isChinaDeployment()) {
        try {
          // 调用登出 API 来清除服务端 cookie
          await fetch('/api/auth/cn-logout', { method: 'POST', credentials: 'include' });
          console.log('✅ CN logout API called');
        } catch (e) {
          console.error('CN logout API error:', e);
        }
        localStorage.removeItem('cn_user');
      }

      // Clear Supabase session
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('SignOut error:', error);
        // Continue with redirect even if there's an error
      }

      // Clear local state immediately
      setSession(null);
      setUser(null);
      userRef.current = null;

      console.log('✅ SignOut completed successfully, redirecting to home...');

      // Force redirect to root domain (hard refresh to clear all state)
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('SignOut error:', error);
      // Still redirect even on error
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    user,
    session,
    loading,
    signIn,
    signInWithGoogle,
    signInWithWeChat,
    signInWithPhone,
    verifyPhoneOTP,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
