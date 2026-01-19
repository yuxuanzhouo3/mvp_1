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
        // 调试日志：显示环境检测结果
        const isCN = isChinaDeployment();
        const envRegion = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION;
        console.log(`🌍 AuthProvider initializeAuth: isChinaDeployment=${isCN}, NEXT_PUBLIC_DEPLOYMENT_REGION=${envRegion}`);
        
        // 检查 localStorage 中是否有 CN 用户数据（无论环境如何）
        const cnUserData = localStorage.getItem('cn_user');
        const cnSessionCookie = document.cookie
          .split(';')
          .find((c) => c.trim().startsWith('cn_session=') || c.trim().startsWith('cn_session_cross='));
        console.log(`🔍 AuthProvider: localStorage cn_user=${cnUserData ? 'exists' : 'null'}, cn_session cookie=${cnSessionCookie ? 'exists' : 'null'}`);
        
        // CN 环境：从 localStorage 恢复用户状态
        // 即使 isChinaDeployment() 返回 false，如果有 cn_user 数据也尝试恢复
        if (isCN || cnUserData || cnSessionCookie) {
          if (cnUserData) {
            try {
              const cnUser = JSON.parse(cnUserData) as User;
              
              // 🔒 重要：验证 localStorage 数据与 cookie 数据的一致性
              // 防止身份混淆问题
              if (cnSessionCookie) {
                const cookieValue = cnSessionCookie.split('=')[1]?.trim();
                if (cookieValue && cookieValue !== cnUser.id) {
                  console.error('⚠️ CN auth data mismatch! localStorage user:', cnUser.id, 'cookie user:', cookieValue);
                  console.log('🧹 Clearing inconsistent auth data...');
                  // 数据不一致，清除所有认证数据，强制重新登录
                  localStorage.removeItem('cn_user');
                  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
                  document.cookie = 'cn_session=; path=/; max-age=0; SameSite=Lax';
                  if (isSecure) {
                    document.cookie = 'cn_session_cross=; path=/; max-age=0; SameSite=None; Secure';
                  }
                  setLoading(false);
                  return;
                }
              }
              
              console.log('🔐 CN user restoring from localStorage, ID:', cnUser.id, 'Email:', cnUser.email);
              
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
              
              // 检查 cn_session cookie 是否存在，如果不存在则恢复
              // 这是一个备份机制，确保 cookie 始终存在
              if (!cnSessionCookie) {
                console.log('🔄 CN session cookie missing, restoring from localStorage...');
                const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
                const secureFlag = isSecure ? '; Secure' : '';
                // 不设置 Domain 属性，让浏览器自动使用当前域名（更可靠，避免无痕模式问题）
                document.cookie = `cn_session=${cnUser.id}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secureFlag}`;
                if (isSecure) {
                  document.cookie = `cn_session_cross=${cnUser.id}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=None; Secure`;
                }
                console.log('✅ CN session cookie restored from localStorage');
              }
              
              console.log('✅ CN user restored from localStorage:', cnUser.email);
            } catch (e) {
              console.error('Failed to parse CN user data:', e);
              localStorage.removeItem('cn_user');
              // 不设置 Domain 属性，确保与设置时一致
              document.cookie = 'cn_session=; path=/; max-age=0; SameSite=Lax';
            }
          } else if (cnSessionCookie) {
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
                  setSession({
                    access_token: `cn_${cnUser.id}`,
                    refresh_token: '',
                    expires_in: 0,
                    token_type: 'bearer',
                    user: cnUser,
                  } as Session);

                  localStorage.setItem('cn_user', JSON.stringify(cnUser));
                  console.log('✅ CN user restored from cookie via /api/auth/cn-me:', cnUser.email);
                } else {
                  console.error('Invalid CN user payload from /api/auth/cn-me:', result);
                  document.cookie = 'cn_session=; path=/; max-age=0; SameSite=Lax';
                }
              } else {
                console.error('CN /api/auth/cn-me failed:', response.status);
                document.cookie = 'cn_session=; path=/; max-age=0; SameSite=Lax';
              }
            } catch (e) {
              console.error('CN /api/auth/cn-me error:', e);
              document.cookie = 'cn_session=; path=/; max-age=0; SameSite=Lax';
            }
          } else {
            console.log('📋 CN environment: No saved user data in localStorage');
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
        // CN 环境：创建模拟 session
        setSession({
          access_token: `cn_${result.user.id}`,
          refresh_token: '',
          expires_in: 0,
          token_type: 'bearer',
          user: cnUser,
        } as Session);

        // 保存用户数据到 localStorage（供页面刷新后恢复）
        localStorage.setItem('cn_user', JSON.stringify(cnUser));

        // 重要：在客户端也设置 cn_session cookie 作为备份
        // 即使 API 响应头已经设置了 cookie，在某些情况下（如无痕模式）可能失败
        // 客户端设置确保 cookie 一定存在
        if (typeof window !== 'undefined') {
          const isSecure = window.location.protocol === 'https:';
          const secureFlag = isSecure ? '; Secure' : '';
          // 不设置 Domain 属性，让浏览器使用当前域名（更可靠）
          document.cookie = `cn_session=${result.user.id}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secureFlag}`;
          if (isSecure) {
            document.cookie = `cn_session_cross=${result.user.id}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=None; Secure`;
          }
          console.log('✅ CN session cookie set on client side for user:', result.user.id);
        }

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

      // CN 环境：通过 API 清除服务端 cookie，并清除 localStorage
      if (isChinaDeployment()) {
        try {
          // 调用登出 API 来清除服务端 cookie
          await fetch('/api/auth/cn-logout', { method: 'POST', credentials: 'include' });
          console.log('✅ CN logout API called');
        } catch (e) {
          console.error('CN logout API error:', e);
        }
        // 同时也在客户端清除（作为备份）
        // 不设置 Domain 属性，确保与设置时一致
        document.cookie = 'cn_session=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'cn_session_cross=; path=/; max-age=0; SameSite=None; Secure';
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
