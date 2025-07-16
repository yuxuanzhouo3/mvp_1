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

  // Check if we're in mock mode (no Supabase config or using mock credentials)
  const isMockMode = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const isMock = !supabaseUrl || 
           !supabaseKey ||
           supabaseUrl === 'https://mock.supabase.co' ||
           supabaseKey === 'mock-key' ||
           supabaseUrl === 'your_supabase_url_here' ||
           supabaseKey === 'your_supabase_anon_key_here';
    
    return isMock;
  }, []);

  // Check for mock mode override from localStorage (client-side only)
  const [mockModeOverride, setMockModeOverride] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const override = localStorage.getItem('mock-mode-override');
        if (override === 'true') {
          console.log('🎭 Mock mode enabled via localStorage override');
          setMockModeOverride(true);
        }
      } catch (error) {
        console.error('Error reading mock mode override from localStorage:', error);
      }
      
      // Only log once during initialization to avoid spam
      if (!(window as any).__mockModeLogged) {
        console.log('🎭 Mock mode detection:', {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + '...',
          isMock: isMockMode || mockModeOverride
        });
        (window as any).__mockModeLogged = true;
      }
    }
  }, [isMockMode]);

  const finalMockMode = isMockMode || mockModeOverride;

  // Memoize Supabase client to prevent recreation
  const supabase = useMemo(() => {
    if (finalMockMode) {
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
          onAuthStateChange: (callback: any) => {
            // Store the callback for mock auth state changes
            if (typeof window !== 'undefined') {
              (window as any).__mockAuthCallback = callback;
            }
            return { 
              data: { 
                subscription: { 
                  unsubscribe: () => {
                    if (typeof window !== 'undefined') {
                      delete (window as any).__mockAuthCallback;
                    }
                  } 
                } 
              } 
            };
          },
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
    if (finalMockMode) {
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
    console.log('🚀 AuthProvider useEffect started');
    console.log('🎭 Mock mode status:', isMockMode);

    // Get initial session
    const getInitialSession = async () => {
      try {
        if (finalMockMode) {
          // In mock mode, check both localStorage and cookies for mock session
          let mockSessionLocalStorage = null;
          let mockSessionCookie = false;
          
          // Only access localStorage and document.cookie on the client side
          if (typeof window !== 'undefined') {
            try {
              mockSessionLocalStorage = localStorage.getItem('mock-session');
              mockSessionCookie = document.cookie.includes('mock-session=true');
            } catch (error) {
              console.error('Error reading mock session from storage:', error);
            }
          }
          
          if ((mockSessionLocalStorage || mockSessionCookie) && mounted) {
            console.log('✅ Mock session found, setting user state');
            setSession(MOCK_SESSION);
            setUser(MOCK_USER);
            return;
          }
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && mounted) {
            setSession(session);
            setUser(session.user);
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      }
    };

    getInitialSession();

    // Listen for auth changes
    console.log('👂 Setting up auth state change listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (!mounted) return;

        console.log('🔄 Auth state change event:', event);
        console.log('📊 Session data:', session);
        console.log('👤 User data:', session?.user);

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        console.log('✅ Auth state updated - User:', session?.user);

        // Only capture metadata on SIGNED_IN event
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🎯 SIGNED_IN event detected, capturing metadata...');
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => {
            captureUserMetadata(session.user);
          }, 0);
        }
      }
    );

    return () => {
      console.log('🧹 AuthProvider cleanup - unmounting');
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, captureUserMetadata, finalMockMode]);

  // Memoize all auth functions to prevent unnecessary re-renders
  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔐 AuthProvider.signIn called with:', { email, finalMockMode });
    console.log('🎭 Mock mode status:', finalMockMode);
    console.log('📊 Current user state before signIn:', user);
    
    if (finalMockMode) {
      console.log('🎭 Mock mode: Checking credentials...');
      // Mock authentication
      if (email === 'test@personalink.ai' && password === 'test123') {
        console.log('✅ Mock credentials valid, setting user state...');
        setSession(MOCK_SESSION);
        setUser(MOCK_USER);
        localStorage.setItem('mock-session', 'true');
        
        // Set cookie for middleware authentication with longer expiry
        document.cookie = 'mock-session=true; path=/; max-age=86400; SameSite=Lax';
        console.log('🍪 Mock session cookie set');
        console.log('💾 Mock session saved to localStorage');
        console.log('👤 User state set to:', MOCK_USER);
        console.log('🔄 Triggering auth state change...');
        
        // Trigger the auth state change callback
        if (typeof window !== 'undefined' && (window as any).__mockAuthCallback) {
          setTimeout(() => {
            (window as any).__mockAuthCallback('SIGNED_IN', MOCK_SESSION);
          }, 100);
        }
        
        return { error: null };
      } else {
        console.log('❌ Mock credentials invalid:', { email, password });
        return { error: { message: 'Invalid email or password' } };
      }
    }

    console.log('🌐 Real mode: Calling Supabase auth...');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('🌐 Supabase auth result:', { error });
    return { error };
  }, [supabase, finalMockMode, user]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (finalMockMode) {
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
      
      // Set cookie for middleware authentication with longer expiry
      document.cookie = 'mock-session=true; path=/; max-age=86400; SameSite=Lax';
      console.log('🍪 Mock signup session cookie set');
      
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
  }, [supabase, finalMockMode]);

  const signInWithGoogle = useCallback(async () => {
    if (finalMockMode) {
      // In mock mode, simulate Google sign-in by creating a mock user
      console.log('🎭 Mock mode: Simulating Google sign-in...');
      const mockGoogleUser = {
        ...MOCK_USER,
        id: `mock-google-user-${Date.now()}`,
        email: 'mock-google-user@personalink.ai',
        user_metadata: { 
          full_name: 'Mock Google User',
          avatar_url: 'https://via.placeholder.com/150',
          provider: 'google'
        }
      };
      
      setSession({ ...MOCK_SESSION, user: mockGoogleUser });
      setUser(mockGoogleUser);
      localStorage.setItem('mock-session', 'true');
      
      // Set cookie for middleware authentication with longer expiry
      document.cookie = 'mock-session=true; path=/; max-age=86400; SameSite=Lax';
      console.log('🍪 Mock Google session cookie set');
      
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, [supabase, finalMockMode]);

  const signInWithPhone = useCallback(async (phone: string) => {
    if (finalMockMode) {
      // In mock mode, simulate phone sign-in
      console.log('🎭 Mock mode: Simulating phone sign-in for:', phone);
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error };
  }, [supabase, finalMockMode]);

  const verifyPhoneOTP = useCallback(async (phone: string, token: string) => {
    if (finalMockMode) {
      // In mock mode, accept any 6-digit code
      console.log('🎭 Mock mode: Verifying phone OTP:', { phone, token });
      if (token.length === 6 && /^\d+$/.test(token)) {
        const mockPhoneUser = {
          ...MOCK_USER,
          id: `mock-phone-user-${Date.now()}`,
          email: `${phone}@personalink.ai`,
          phone,
          user_metadata: { 
            full_name: 'Mock Phone User',
            phone
          }
        };
        
        setSession({ ...MOCK_SESSION, user: mockPhoneUser });
        setUser(mockPhoneUser);
        localStorage.setItem('mock-session', 'true');
        
        // Set cookie for middleware authentication with longer expiry
        document.cookie = 'mock-session=true; path=/; max-age=86400; SameSite=Lax';
        console.log('🍪 Mock phone session cookie set');
        
        return { error: null };
      } else {
        return { error: { message: 'Please enter a valid 6-digit code' } };
      }
    }

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    return { error };
  }, [supabase, finalMockMode]);

  const signOut = useCallback(async () => {
    if (finalMockMode) {
      setSession(null);
      setUser(null);
      localStorage.removeItem('mock-session');
      
      // Clear cookie for middleware authentication
      document.cookie = 'mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      console.log('🍪 Mock session cookie cleared');
      
      // Trigger the auth state change callback
      if (typeof window !== 'undefined' && (window as any).__mockAuthCallback) {
        setTimeout(() => {
          (window as any).__mockAuthCallback('SIGNED_OUT', null);
        }, 100);
      }
      
      router.push('/');
      return;
    }

    await supabase.auth.signOut();
    router.push('/');
  }, [supabase, router, finalMockMode]);

  const resetPassword = useCallback(async (email: string) => {
    if (finalMockMode) {
      return { error: { message: 'Password reset not available in mock mode' } };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    return { error };
  }, [supabase, finalMockMode]);

  const updatePassword = useCallback(async (password: string) => {
    if (finalMockMode) {
      return { error: { message: 'Password update not available in mock mode' } };
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });
    return { error };
  }, [supabase, finalMockMode]);

  const enable2FA = useCallback(async () => {
    if (finalMockMode) {
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
  }, [supabase, user, finalMockMode]);

  const verify2FA = useCallback(async (token: string) => {
    if (finalMockMode) {
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
  }, [supabase, user, finalMockMode]);

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