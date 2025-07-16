import { renderHook, act } from '@testing-library/react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useAuth } from '@/app/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

// Mock the dependencies
jest.mock('@/app/providers/AuthProvider');
jest.mock('next/navigation');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('useAuthGuard', () => {
  const mockRouter = {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    role: 'authenticated',
    identities: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  it('should redirect unauthenticated users to login page', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      session: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signInWithPhone: jest.fn(),
      verifyPhoneOTP: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      enable2FA: jest.fn(),
      verify2FA: jest.fn(),
      supabase: {} as any,
    });

    const { result } = renderHook(() => useAuthGuard({ requireAuth: true }));

    expect(result.current.isAuthenticated).toBe(false);
    expect(mockRouter.replace).toHaveBeenCalledWith('/auth/login');
  });

  it('should redirect authenticated users away from login page', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      session: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signInWithPhone: jest.fn(),
      verifyPhoneOTP: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      enable2FA: jest.fn(),
      verify2FA: jest.fn(),
      supabase: {} as any,
    });

    const { result } = renderHook(() => useAuthGuard({ requireAuth: false }));

    expect(result.current.isAuthenticated).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
  });

  it('should not redirect multiple times for the same user state', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      session: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signInWithPhone: jest.fn(),
      verifyPhoneOTP: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      enable2FA: jest.fn(),
      verify2FA: jest.fn(),
      supabase: {} as any,
    });

    const { result, rerender } = renderHook(() => useAuthGuard({ requireAuth: false }));

    // First render should trigger redirect
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');

    // Clear the mock to track subsequent calls
    mockRouter.replace.mockClear();

    // Re-render with same user state should not trigger another redirect
    rerender();

    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should reset redirect state when user logs out', () => {
    // Start with authenticated user
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      session: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signInWithPhone: jest.fn(),
      verifyPhoneOTP: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      enable2FA: jest.fn(),
      verify2FA: jest.fn(),
      supabase: {} as any,
    });

    const { rerender } = renderHook(() => useAuthGuard({ requireAuth: false }));

    // First render should trigger redirect
    expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    mockRouter.replace.mockClear();

    // Simulate user logout
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      session: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signInWithPhone: jest.fn(),
      verifyPhoneOTP: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      enable2FA: jest.fn(),
      verify2FA: jest.fn(),
      supabase: {} as any,
    });

    rerender();

    // Should not redirect on logout
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('should wait for loading to complete before checking auth', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      session: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signInWithPhone: jest.fn(),
      verifyPhoneOTP: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      enable2FA: jest.fn(),
      verify2FA: jest.fn(),
      supabase: {} as any,
    });

    const { result } = renderHook(() => useAuthGuard({ requireAuth: true }));

    expect(result.current.loading).toBe(true);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
}); 