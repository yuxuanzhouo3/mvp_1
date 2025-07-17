'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; requiresConfirmation?: boolean }>;
  signOut: () => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithPhone: (phone: string) => Promise<{ error: any }>;
  verifyPhoneOTP: (phone: string, token: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  updateProfile: (updates: any) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Only log once per mount to reduce console spam
  console.log('🚀 AuthProvider component loaded!');
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const userRef = useRef<User | null>(null);
  const isInitializedRef = useRef(false);

  // Use singleton Supabase client
  console.log('🌐 Using singleton Supabase client');

  // Capture user metadata to database
  const captureUserMetadata = useCallback(async (user: User) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error capturing user metadata:', error);
      }
    } catch (error) {
      console.error('Error in captureUserMetadata:', error);
    }
  }, []);

  // Log user session information
  const logUserSession = useCallback(async (user: User, session: Session, loginMethod: string = 'email') => {
    try {
      // Get client information
      const userAgent = navigator.userAgent;
      const deviceType = getDeviceType(userAgent);
      const browser = getBrowser(userAgent);
      const os = getOS(userAgent);
      
      // Get IP address (this would need to be passed from the server in a real app)
      const ipAddress = null; // Will be set by server-side logging
      
      // Log the session using the database function
      const { data, error } = await supabase.rpc('log_user_login', {
        p_user_id: user.id,
        p_session_id: session.access_token,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_device_type: deviceType,
        p_browser: browser,
        p_os: os,
        p_location: null, // Could be determined by IP geolocation
        p_login_method: loginMethod,
        p_login_status: 'success',
        p_failure_reason: null
      });

      if (error) {
        // Don't log as error if function doesn't exist (404)
        if (error.code === 'PGRST116' || error.message?.includes('404')) {
          console.log('ℹ️ User session logging not available (function not created yet)');
        } else {
          console.error('Error logging user session:', error);
        }
      } else {
        console.log('✅ User session logged successfully');
      }
    } catch (error) {
      // Don't log as error if function doesn't exist
      if (error instanceof Error && error.message?.includes('404')) {
        console.log('ℹ️ User session logging not available (function not created yet)');
      } else {
        console.error('Error in logUserSession:', error);
      }
    }
  }, []);

  // Helper functions to detect device and browser information
  const getDeviceType = (userAgent: string): string => {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  };

  const getBrowser = (userAgent: string): string => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  const getOS = (userAgent: string): string => {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  };

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) {
      console.log('⚠️ AuthProvider already initialized, skipping...');
      return;
    }
    
    console.log('🚀 AuthProvider useEffect started');
    isInitializedRef.current = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
        } else if (session) {
          console.log('📋 Initial session found:', session.user.email);
          setSession(session);
          setUser(session.user);
          
          // Log the session if user is authenticated
          if (session.user) {
            await logUserSession(session.user, session, 'email');
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    console.log('👂 Setting up auth state change listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        // Set loading state for auth transitions
        setLoading(true);
        
        try {
          if (event === 'SIGNED_IN' && session) {
            console.log('✅ User signed in, updating state...');
          setSession(session);
            setUser(session.user);
            userRef.current = session.user;
            
            // Capture user metadata
            await captureUserMetadata(session.user);
            
            // Log the session
            await logUserSession(session.user, session, 'email');
            
          } else if (event === 'SIGNED_OUT') {
            console.log('🚪 User signed out, clearing state...');
            // Store the current user before clearing it
            const currentUser = userRef.current;
            
            // Clear state immediately
            setSession(null);
            setUser(null);
            userRef.current = null;
            
            // Log logout if we have the previous user info
            if (currentUser && session) {
              try {
                await supabase.rpc('log_user_logout', {
                  p_user_id: currentUser.id,
                  p_session_id: session.access_token,
                  p_reason: 'user_logout'
                });
                console.log('✅ User logout logged successfully');
              } catch (error) {
                console.error('Error logging logout:', error);
              }
            }
          } else if (event === 'TOKEN_REFRESHED' && session) {
            console.log('🔄 Token refreshed, updating session...');
            setSession(session);
            setUser(session.user);
          } else if (event === 'INITIAL_SESSION') {
            console.log('📋 Initial session event, updating state...');
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
          // Always set loading to false after state changes
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('🧹 AuthProvider cleanup - unmounting');
      subscription.unsubscribe();
    };
  }, []); // Remove dependencies to prevent infinite loop

  // Memoize all auth functions to prevent unnecessary re-renders
  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔐 AuthProvider.signIn called with:', { email });
    console.log('📊 Current user state before signIn:', user);
    
    console.log('🌐 Real mode: Calling Supabase auth...');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('🌐 Supabase auth result:', { error });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    console.log('📝 AuthProvider.signUp called with:', { email, fullName });
    
    try {
      const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
      console.log('🌐 Supabase signup result:', { data, error });
      
      if (error) {
        console.error('❌ Signup error:', error);
    return { error };
      }
      
      if (data.user && !data.session) {
        // User created but needs email confirmation
        console.log('📧 User created, email confirmation required');
        return { error: null, requiresConfirmation: true };
      }
      
      if (data.user && data.session) {
        // User created and automatically signed in
        console.log('✅ User created and signed in automatically');
        return { error: null, requiresConfirmation: false };
      }
      
      return { error: null };
    } catch (error) {
      console.error('💥 Unexpected error during signup:', error);
      return { error: { message: 'An unexpected error occurred during registration' } };
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('🚪 AuthProvider.signOut called');
    
    // Reset initialization flag to allow fresh auth state
    isInitializedRef.current = false;
    
    // Don't manually set state here - let the auth state change listener handle it
    const { error } = await supabase.auth.signOut();
    
    // The auth state change listener will automatically handle the state cleanup
    console.log('🚪 SignOut completed, auth state listener will handle cleanup');
    
    return { error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, []);

  const signInWithPhone = useCallback(async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error };
  }, []);

  const verifyPhoneOTP = useCallback(async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    return { error };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  }, []);

  const updateProfile = useCallback(async (updates: any) => {
    const { error } = await supabase.auth.updateUser(updates);
    return { error };
  }, []);

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithPhone,
    verifyPhoneOTP,
    resetPassword,
    updatePassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 