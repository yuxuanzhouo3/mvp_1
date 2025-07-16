'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';

interface UseAuthGuardOptions {
  redirectTo?: string;
  requireAuth?: boolean;
  onUnauthorized?: () => void;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const {
    redirectTo = '/auth/login',
    requireAuth = true,
    onUnauthorized
  } = options;

  const { user, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const hasRedirectedRef = useRef(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Don't check until loading is complete
    if (loading) {
      return;
    }

    console.log('🛡️ AuthGuard check:', {
      user: !!user,
      requireAuth,
      hasRedirected,
      hasRedirectedRef: hasRedirectedRef.current,
      isChecking
    });

    // If auth is required and user is not authenticated
    if (requireAuth && !user && !hasRedirected && !hasRedirectedRef.current) {
      console.log('🚫 AuthGuard: User not authenticated, redirecting to login');
      setHasRedirected(true);
      hasRedirectedRef.current = true;
      
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        router.replace(redirectTo);
      }
      return;
    }

    // If auth is not required and user is authenticated (e.g., login page)
    if (!requireAuth && user && !hasRedirected && !hasRedirectedRef.current) {
      console.log('✅ AuthGuard: User already authenticated, redirecting to dashboard');
      setHasRedirected(true);
      hasRedirectedRef.current = true;
      router.replace('/dashboard');
      return;
    }

    // Reset redirect state if user state changes appropriately
    if (!user && (hasRedirected || hasRedirectedRef.current)) {
      console.log('🔄 AuthGuard: User logged out, resetting redirect state');
      setHasRedirected(false);
      hasRedirectedRef.current = false;
    }

    setIsChecking(false);
  }, [user, loading, requireAuth, redirectTo, onUnauthorized, router, hasRedirected]);

  return {
    user,
    loading: loading || isChecking,
    isAuthenticated: !!user,
    isChecking
  };
} 