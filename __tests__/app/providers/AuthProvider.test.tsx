import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signInWithOAuth: jest.fn(),
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
  },
  from: jest.fn(() => ({
    upsert: jest.fn(),
  })),
  functions: {
    invoke: jest.fn(),
  },
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}))

// Mock fetch for geolocation
global.fetch = jest.fn()

// Test component to access auth context
const TestComponent = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <button onClick={() => signIn('test@example.com', 'password')}>
        Sign In
      </button>
      <button onClick={() => signUp('test@example.com', 'password', 'Test User')}>
        Sign Up
      </button>
      <button onClick={() => signOut()}>
        Sign Out
      </button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        ip: '127.0.0.1',
        country_name: 'United States',
        region: 'California',
        city: 'San Francisco',
        timezone: 'America/Los_Angeles',
      }),
    })
  })

  it('renders children and provides auth context', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toBeInTheDocument()
    expect(screen.getByTestId('user')).toBeInTheDocument()
  })

  it('initializes with loading state', () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('true')
  })

  it('loads initial session', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User',
        },
      },
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })
  })

  it('handles sign in successfully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const signInButton = screen.getByText('Sign In')
    fireEvent.click(signInButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      })
    })
  })

  it('handles sign in error', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid credentials' },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const signInButton = screen.getByText('Sign In')
    fireEvent.click(signInButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled()
    })
  })

  it('handles sign up successfully', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const signUpButton = screen.getByText('Sign Up')
    fireEvent.click(signUpButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: {
          data: {
            full_name: 'Test User',
          },
        },
      })
    })
  })

  it('handles sign up error', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already exists' },
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const signUpButton = screen.getByText('Sign Up')
    fireEvent.click(signUpButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalled()
    })
  })

  it('handles sign out', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.auth.signOut.mockResolvedValue({
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })
  })

  it('captures user metadata on sign in', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    // Simulate auth state change
    let authStateCallback: any
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      }
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Trigger sign in event
    await act(async () => {
      authStateCallback('SIGNED_IN', { session: { user: mockUser } })
    })

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        updated_at: expect.any(String),
        device_info: expect.any(Object),
        location_info: expect.any(Object),
      })
    })
  })

  it('handles Google OAuth sign in', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const TestOAuthComponent = () => {
      const { signInWithGoogle } = useAuth()
      return (
        <button onClick={() => signInWithGoogle()}>
          Sign in with Google
        </button>
      )
    }

    render(
      <AuthProvider>
        <TestOAuthComponent />
      </AuthProvider>
    )

    const googleButton = screen.getByText('Sign in with Google')
    fireEvent.click(googleButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      })
    })
  })

  it('handles phone sign in', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.auth.signInWithOtp.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const TestPhoneComponent = () => {
      const { signInWithPhone } = useAuth()
      return (
        <button onClick={() => signInWithPhone('+1234567890')}>
          Send SMS
        </button>
      )
    }

    render(
      <AuthProvider>
        <TestPhoneComponent />
      </AuthProvider>
    )

    const smsButton = screen.getByText('Send SMS')
    fireEvent.click(smsButton)

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: '+1234567890',
      })
    })
  })

  it('handles phone OTP verification', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.auth.verifyOtp.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const TestOTPComponent = () => {
      const { verifyPhoneOTP } = useAuth()
      return (
        <button onClick={() => verifyPhoneOTP('+1234567890', '123456')}>
          Verify OTP
        </button>
      )
    }

    render(
      <AuthProvider>
        <TestOTPComponent />
      </AuthProvider>
    )

    const verifyButton = screen.getByText('Verify OTP')
    fireEvent.click(verifyButton)

    await waitFor(() => {
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        phone: '+1234567890',
        token: '123456',
        type: 'sms',
      })
    })
  })

  it('handles password reset', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const TestResetComponent = () => {
      const { resetPassword } = useAuth()
      return (
        <button onClick={() => resetPassword('test@example.com')}>
          Reset Password
        </button>
      )
    }

    render(
      <AuthProvider>
        <TestResetComponent />
      </AuthProvider>
    )

    const resetButton = screen.getByText('Reset Password')
    fireEvent.click(resetButton)

    await waitFor(() => {
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: 'http://localhost:3000/auth/update-password',
        }
      )
    })
  })

  it('handles password update', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const TestUpdateComponent = () => {
      const { updatePassword } = useAuth()
      return (
        <button onClick={() => updatePassword('newpassword123')}>
          Update Password
        </button>
      )
    }

    render(
      <AuthProvider>
        <TestUpdateComponent />
      </AuthProvider>
    )

    const updateButton = screen.getByText('Update Password')
    fireEvent.click(updateButton)

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      })
    })
  })

  it('handles 2FA enable', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.functions.invoke.mockResolvedValue({
      data: { qrCode: 'test-qr-code' },
      error: null,
    })

    const Test2FAComponent = () => {
      const { enable2FA } = useAuth()
      return (
        <button onClick={() => enable2FA()}>
          Enable 2FA
        </button>
      )
    }

    render(
      <AuthProvider>
        <Test2FAComponent />
      </AuthProvider>
    )

    const enableButton = screen.getByText('Enable 2FA')
    fireEvent.click(enableButton)

    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('enable-2fa', {
        body: { userId: undefined },
      })
    })
  })

  it('handles 2FA verification', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    mockSupabase.functions.invoke.mockResolvedValue({
      data: { success: true },
      error: null,
    })

    const Test2FAVerifyComponent = () => {
      const { verify2FA } = useAuth()
      return (
        <button onClick={() => verify2FA('123456')}>
          Verify 2FA
        </button>
      )
    }

    render(
      <AuthProvider>
        <Test2FAVerifyComponent />
      </AuthProvider>
    )

    const verifyButton = screen.getByText('Verify 2FA')
    fireEvent.click(verifyButton)

    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('verify-2fa', {
        body: { userId: undefined, token: '123456' },
      })
    })
  })

  it('handles geolocation API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    let authStateCallback: any
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      }
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Trigger sign in event
    await act(async () => {
      authStateCallback('SIGNED_IN', { session: { user: mockUser } })
    })

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error capturing user metadata:',
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })
}) 