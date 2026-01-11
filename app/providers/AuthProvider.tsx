"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { clearAllCaches } from '@/lib/utils/cache-cleaner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
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
    
    console.log('🚀 AuthProvider initializing...');
    isInitializedRef.current = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
        } else if (session) {
          console.log('📋 Initial session found:', session.user.email);
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
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        setLoading(true);
        
        try {
          if (event === 'SIGNED_IN' && session) {
            console.log('✅ User signed in');
            setSession(session);
            setUser(session.user);
            userRef.current = session.user;
          } else if (event === 'SIGNED_OUT') {
            console.log('🚪 User signed out');
            setSession(null);
            setUser(null);
            userRef.current = null;
          } else if (event === 'TOKEN_REFRESHED' && session) {
            console.log('🔄 Token refreshed');
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
      console.log('🧹 AuthProvider cleanup');
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔐 SignIn called with:', email);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = useCallback(async () => {
    console.log('🔐 SignInWithGoogle called');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { error };
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