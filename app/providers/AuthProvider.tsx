'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithPhone: (phone: string) => Promise<{ error: any }>;
  verifyPhoneOTP: (phone: string, token: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  enable2FA: () => Promise<{ error: any; data?: any }>;
  verify2FA: (token: string) => Promise<{ error: any }>;
  supabase: SupabaseClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for testing when Supabase is not configured
const MOCK_USER: User = {
  id: 'mock-user-id-123',
  email: 'test@personalink.ai',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  role: 'authenticated',
  identities: []
};

const MOCK_SESSION: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: MOCK_USER
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if we're in mock mode (no Supabase config)
  const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Memoize Supabase client to prevent recreation
  const supabase = useMemo(() => {
    if (isMockMode) {
      // Return a mock client
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          signInWithPassword: async () => ({ data: { session: null, user: null }, error: null }),
          signUp: async () => ({ data: { session: null, user: null }, error: null }),
          signInWithOAuth: async () => ({ data: { session: null, user: null }, error: null }),
          signInWithOtp: async () => ({ data: { session: null, user: null }, error: null }),
          verifyOtp: async () => ({ data: { session: null, user: null }, error: null }),
          signOut: async () => ({ error: null }),
          resetPasswordForEmail: async () => ({ data: null, error: null }),
          updateUser: async () => ({ data: { user: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          functions: {
            invoke: async () => ({ data: null, error: null })
          }
        },
        from: () => ({
          select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
          upsert: async () => ({ data: null, error: null })
        })
      } as any;
    }
    
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, [isMockMode]);

  // Memoize captureUserMetadata to prevent recreation
  const captureUserMetadata = useCallback(async (user: User) => {
    if (isMockMode) {
      console.log('Mock mode: Skipping user metadata capture');
      return;
    }

    try {
      // Only capture metadata on first sign in, not on every auth state change
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        // User already has a profile, skip metadata capture
        return;
      }

      // Only fetch geo data if we don't have a profile yet
      const response = await fetch('https://ipapi.co/json/');
      const geoData = await response.json();

      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url,
        updated_at: new Date().toISOString(),
        device_info: {
          user_agent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
        location_info: {
          ip: geoData.ip,
          country: geoData.country_name,
          region: geoData.region,
          city: geoData.city,
          timezone: geoData.timezone,
        }
      });
    } catch (error) {
      console.error('Error capturing user metadata:', error);
    }
  }, [supabase, isMockMode]);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        if (isMockMode) {
          // In mock mode, check localStorage for mock session
          const mockSession = localStorage.getItem('mock-session');
          if (mockSession && mounted) {
            setSession(MOCK_SESSION);
            setUser(MOCK_USER);
            setLoading(false);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Only capture metadata on SIGNED_IN event
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => {
            captureUserMetadata(session.user);
          }, 0);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, captureUserMetadata, isMockMode]);

  // Memoize all auth functions to prevent unnecessary re-renders
  const signIn = useCallback(async (email: string, password: string) => {
    if (isMockMode) {
      // Mock authentication
      if (email === 'test@personalink.ai' && password === 'test123') {
        setSession(MOCK_SESSION);
        setUser(MOCK_USER);
        localStorage.setItem('mock-session', 'true');
        return { error: null };
      } else {
        return { error: { message: 'Invalid email or password' } };
      }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, [supabase, isMockMode]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (isMockMode) {
      // Mock registration
      const mockNewUser = {
        ...MOCK_USER,
        id: `mock-user-${Date.now()}`,
        email,
        user_metadata: { full_name: fullName }
      };
      setSession({ ...MOCK_SESSION, user: mockNewUser });
      setUser(mockNewUser);
      localStorage.setItem('mock-session', 'true');
      return { error: null };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  }, [supabase, isMockMode]);

  const signInWithGoogle = useCallback(async () => {
    if (isMockMode) {
      return { error: { message: 'Google sign-in not available in mock mode' } };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, [supabase, isMockMode]);

  const signInWithPhone = useCallback(async (phone: string) => {
    if (isMockMode) {
      return { error: { message: 'Phone sign-in not available in mock mode' } };
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error };
  }, [supabase, isMockMode]);

  const verifyPhoneOTP = useCallback(async (phone: string, token: string) => {
    if (isMockMode) {
      return { error: { message: 'Phone verification not available in mock mode' } };
    }

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    return { error };
  }, [supabase, isMockMode]);

  const signOut = useCallback(async () => {
    if (isMockMode) {
      setSession(null);
      setUser(null);
      localStorage.removeItem('mock-session');
      router.push('/');
      return;
    }

    await supabase.auth.signOut();
    router.push('/');
  }, [supabase, router, isMockMode]);

  const resetPassword = useCallback(async (email: string) => {
    if (isMockMode) {
      return { error: { message: 'Password reset not available in mock mode' } };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    return { error };
  }, [supabase, isMockMode]);

  const updatePassword = useCallback(async (password: string) => {
    if (isMockMode) {
      return { error: { message: 'Password update not available in mock mode' } };
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });
    return { error };
  }, [supabase, isMockMode]);

  const enable2FA = useCallback(async () => {
    if (isMockMode) {
      return { error: { message: '2FA not available in mock mode' } };
    }

    try {
      const { data, error } = await supabase.functions.invoke('enable-2fa', {
        body: { userId: user?.id },
      });
      return { error, data };
    } catch (error) {
      return { error: { message: 'Failed to enable 2FA' } };
    }
  }, [supabase, user, isMockMode]);

  const verify2FA = useCallback(async (token: string) => {
    if (isMockMode) {
      return { error: { message: '2FA verification not available in mock mode' } };
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa', {
        body: { userId: user?.id, token },
      });
      return { error, data };
    } catch (error) {
      return { error: { message: 'Failed to verify 2FA' } };
    }
  }, [supabase, user, isMockMode]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithPhone,
    verifyPhoneOTP,
    signOut,
    resetPassword,
    updatePassword,
    enable2FA,
    verify2FA,
    supabase,
  }), [
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithPhone,
    verifyPhoneOTP,
    signOut,
    resetPassword,
    updatePassword,
    enable2FA,
    verify2FA,
    supabase,
  ]);

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