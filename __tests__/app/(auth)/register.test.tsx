import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import RegisterPage from '@/app/(auth)/register/page'

// Mock the auth provider
jest.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    signUp: jest.fn(),
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

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders registration form', () => {
    render(<RegisterPage />)
    
    expect(screen.getByText('Create account')).toBeInTheDocument()
    expect(screen.getByText('Join PersonaLink to find your perfect AI friend match')).toBeInTheDocument()
    
    // Check for form fields
    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('validates full name length', async () => {
    render(<RegisterPage />)
    
    const nameInput = screen.getByPlaceholderText('Full name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm password')
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    // Enter short name
    fireEvent.change(nameInput, { target: { value: 'A' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/full name must be at least 2 characters/i)).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    render(<RegisterPage />)
    
    const nameInput = screen.getByPlaceholderText('Full name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm password')
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    // Enter invalid email
    fireEvent.change(nameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('validates password length', async () => {
    render(<RegisterPage />)
    
    const nameInput = screen.getByPlaceholderText('Full name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm password')
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    // Enter short password
    fireEvent.change(nameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: '123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('validates password confirmation', async () => {
    render(<RegisterPage />)
    
    const nameInput = screen.getByPlaceholderText('Full name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm password')
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    // Enter mismatched passwords
    fireEvent.change(nameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during form submission', async () => {
    render(<RegisterPage />)
    
    const nameInput = screen.getByPlaceholderText('Full name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm password')
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    // Button should show loading state
    expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument()
  })

  it('shows success message after successful registration', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({ error: null })
    const mockToast = jest.fn()
    
    jest.doMock('@/app/providers/AuthProvider', () => ({
      useAuth: () => ({
        signUp: mockSignUp,
      }),
    }))
    
    jest.doMock('@/hooks/use-toast', () => ({
      useToast: () => ({
        toast: mockToast,
      }),
    }))
    
    render(<RegisterPage />)
    
    const nameInput = screen.getByPlaceholderText('Full name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm password')
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', 'John Doe')
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Registration successful',
        description: 'Please check your email to verify your account',
      })
    })
  })

  it('shows email verification screen after successful registration', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({ error: null })
    
    jest.doMock('@/app/providers/AuthProvider', () => ({
      useAuth: () => ({
        signUp: mockSignUp,
      }),
    }))
    
    const { rerender } = render(<RegisterPage />)
    
    // Simulate successful registration
    const nameInput = screen.getByPlaceholderText('Full name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm password')
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument()
      expect(screen.getByText(/we've sent you a verification link/i)).toBeInTheDocument()
    })
  })

  it('handles registration error', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({ 
      error: { message: 'Email already exists' } 
    })
    const mockToast = jest.fn()
    
    jest.doMock('@/app/providers/AuthProvider', () => ({
      useAuth: () => ({
        signUp: mockSignUp,
      }),
    }))
    
    jest.doMock('@/hooks/use-toast', () => ({
      useToast: () => ({
        toast: mockToast,
      }),
    }))
    
    render(<RegisterPage />)
    
    const nameInput = screen.getByPlaceholderText('Full name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm password')
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Registration failed',
        description: 'Email already exists',
        variant: 'destructive',
      })
    })
  })

  it('shows login link', () => {
    render(<RegisterPage />)
    
    const loginLink = screen.getByText(/already have an account/i)
    expect(loginLink).toBeInTheDocument()
    expect(loginLink.closest('a')).toHaveAttribute('href', '/auth/login')
  })

  it('allows retry after email verification screen', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({ error: null })
    
    jest.doMock('@/app/providers/AuthProvider', () => ({
      useAuth: () => ({
        signUp: mockSignUp,
      }),
    }))
    
    render(<RegisterPage />)
    
    // Complete registration to show verification screen
    const nameInput = screen.getByPlaceholderText('Full name')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm password')
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument()
    })
    
    // Click try again button
    const tryAgainButton = screen.getByText(/try again/i)
    fireEvent.click(tryAgainButton)
    
    // Should show registration form again
    expect(screen.getByText('Create account')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument()
  })
}) 