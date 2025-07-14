import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import LoginPage from '@/app/(auth)/login/page'

// Mock the auth provider
jest.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    signIn: jest.fn(),
    signInWithGoogle: jest.fn(),
    signInWithPhone: jest.fn(),
    verifyPhoneOTP: jest.fn(),
  }),
}))

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders login form with all tabs', () => {
    render(<LoginPage />)
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByText('Sign in to your PersonaLink account')).toBeInTheDocument()
    
    // Check for tab buttons
    expect(screen.getByRole('tab', { name: /email/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /phone/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /google/i })).toBeInTheDocument()
  })

  it('shows email login form by default', () => {
    render(<LoginPage />)
    
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('switches to phone tab when clicked', () => {
    render(<LoginPage />)
    
    const phoneTab = screen.getByRole('tab', { name: /phone/i })
    fireEvent.click(phoneTab)
    
    expect(screen.getByPlaceholderText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send sms/i })).toBeInTheDocument()
  })

  it('switches to Google tab when clicked', () => {
    render(<LoginPage />)
    
    const googleTab = screen.getByRole('tab', { name: /google/i })
    fireEvent.click(googleTab)
    
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })

  it('validates email format', async () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('validates password length', async () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Enter short password
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: '123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  it('validates phone number format', async () => {
    render(<LoginPage />)
    
    // Switch to phone tab
    const phoneTab = screen.getByRole('tab', { name: /phone/i })
    fireEvent.click(phoneTab)
    
    const phoneInput = screen.getByPlaceholderText(/phone number/i)
    const submitButton = screen.getByRole('button', { name: /send sms/i })
    
    // Enter invalid phone number
    fireEvent.change(phoneInput, { target: { value: '123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument()
    })
  })

  it('validates OTP format', async () => {
    render(<LoginPage />)
    
    // Switch to phone tab and enter valid phone
    const phoneTab = screen.getByRole('tab', { name: /phone/i })
    fireEvent.click(phoneTab)
    
    const phoneInput = screen.getByPlaceholderText(/phone number/i)
    fireEvent.change(phoneInput, { target: { value: '+1234567890' } })
    
    const sendButton = screen.getByRole('button', { name: /send sms/i })
    fireEvent.click(sendButton)
    
    // Wait for OTP input to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/otp/i)).toBeInTheDocument()
    })
    
    const otpInput = screen.getByPlaceholderText(/otp/i)
    const verifyButton = screen.getByRole('button', { name: /verify/i })
    
    // Enter invalid OTP
    fireEvent.change(otpInput, { target: { value: '123' } })
    fireEvent.click(verifyButton)
    
    await waitFor(() => {
      expect(screen.getByText(/otp must be 6 digits/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during form submission', async () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    // Button should show loading state
    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
  })

  it('shows forgot password link', () => {
    render(<LoginPage />)
    
    const forgotPasswordLink = screen.getByText(/forgot password/i)
    expect(forgotPasswordLink).toBeInTheDocument()
    expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/auth/forgot-password')
  })

  it('shows register link', () => {
    render(<LoginPage />)
    
    const registerLink = screen.getByText(/don't have an account/i)
    expect(registerLink).toBeInTheDocument()
    expect(registerLink.closest('a')).toHaveAttribute('href', '/auth/register')
  })

  it('handles successful email login', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({ error: null })
    jest.doMock('@/app/providers/AuthProvider', () => ({
      useAuth: () => ({
        signIn: mockSignIn,
        signInWithGoogle: jest.fn(),
        signInWithPhone: jest.fn(),
        verifyPhoneOTP: jest.fn(),
      }),
    }))
    
    render(<LoginPage />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('handles login error', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({ 
      error: { message: 'Invalid credentials' } 
    })
    const mockToast = jest.fn()
    
    jest.doMock('@/app/providers/AuthProvider', () => ({
      useAuth: () => ({
        signIn: mockSignIn,
        signInWithGoogle: jest.fn(),
        signInWithPhone: jest.fn(),
        verifyPhoneOTP: jest.fn(),
      }),
    }))
    
    jest.doMock('@/hooks/use-toast', () => ({
      useToast: () => ({
        toast: mockToast,
      }),
    }))
    
    render(<LoginPage />)
    
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Login failed',
        description: 'Invalid credentials',
        variant: 'destructive',
      })
    })
  })
}) 