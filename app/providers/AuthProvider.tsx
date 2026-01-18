"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { clearAllCaches } from '@/lib/utils/cache-cleaner';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { getAuthServiceAsync } from '@/lib/services/auth';

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

    const initializeAuth = async () => {
      try {
        // CN 环境：从 localStorage 恢复用户状态
        if (isChinaDeployment()) {
          const cnUserData = localStorage.getItem('cn_user');
          if (cnUserData) {
            try {
              const cnUser = JSON.parse(cnUserData) as User;
              setUser(cnUser);
              userRef.current = cnUser;
              // CN 环境：创建模拟 session，使用 cn_ 前缀的 token
              setSession({
                access_token: `cn_${cnUser.id}`,
                refresh_token: '',
                expires_in: 0,
                token_type: 'bearer',
                user: cnUser,
              } as Session);
              // 重要：恢复 cn_session cookie，否则 middleware 会认为未登录
              // 在 HTTPS 环境下需要添加 Secure 属性
              const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
              const secureFlag = isSecure ? '; Secure' : '';
              document.cookie = `cn_session=${cnUser.id}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secureFlag}`;
            } catch (e) {
              console.error('Failed to parse CN user data:', e);
              localStorage.removeItem('cn_user');
              document.cookie = 'cn_session=; path=/; max-age=0';
            }
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

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
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
        setUser(cnUser);
        userRef.current = cnUser;
        // CN 环境：创建模拟 session
        setSession({
          access_token: `cn_${result.user.id}`,
          refresh_token: '',
          expires_in: 0,
          token_type: 'bearer',
          user: cnUser,
        } as Session);

        // 设置 CN session cookie（供中间件验证）
        // 在 HTTPS 环境下需要添加 Secure 属性
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const secureFlag = isSecure ? '; Secure' : '';
        document.cookie = `cn_session=${result.user.id}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secureFlag}`;
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

    // INTL 环境不支持微信登录
    if (!isChinaDeployment()) {
      return { error: { message: 'WeChat login is not available in international region' } };
    }

    const authService = await getAuthServiceAsync();
    const result = await authService.signInWithOAuth('wechat', `${window.location.origin}/api/auth/wechat/callback`);

    if (!result.success) {
      return { error: { message: result.error || '微信登录失败' } };
    }

    // 如果返回的是重定向 URL，则跳转
    if (result.session?.accessToken && result.session.accessToken.startsWith('http')) {
      window.location.href = result.session.accessToken;
    }

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

      // CN 环境：清除 CN session cookie 和 localStorage
      if (isChinaDeployment()) {
        document.cookie = 'cn_session=; path=/; max-age=0';
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