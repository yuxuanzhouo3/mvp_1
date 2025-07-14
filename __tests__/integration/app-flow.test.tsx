import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import LoginPage from '@/app/(auth)/login/page'
import RegisterPage from '@/app/(auth)/register/page'
import MatchingPage from '@/app/matching/page'
import ChatPage from '@/app/chat/page'

// Mock all external dependencies
jest.mock('@/app/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
    signIn: jest.fn().mockResolvedValue({ error: null }),
    signUp: jest.fn().mockResolvedValue({ error: null }),
    signInWithGoogle: jest.fn(),
    signInWithPhone: jest.fn(),
    verifyPhoneOTP: jest.fn(),
  }),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock API calls
global.fetch = jest.fn()

describe('Complete App Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('User Registration Flow', () => {
    it('completes full registration process', async () => {
      // Step 1: User visits registration page
      render(<RegisterPage />)
      
      expect(screen.getByText('Create account')).toBeInTheDocument()
      expect(screen.getByText('Join PersonaLink to find your perfect AI friend match')).toBeInTheDocument()

      // Step 2: User fills out registration form
      const nameInput = screen.getByPlaceholderText('Full name')
      const emailInput = screen.getByPlaceholderText('Email')
      const passwordInput = screen.getByPlaceholderText('Password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm password')
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })

      // Step 3: User submits registration
      fireEvent.click(submitButton)

      // Step 4: Verify email verification screen appears
      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument()
        expect(screen.getByText(/we've sent you a verification link/i)).toBeInTheDocument()
      })

      // Step 5: User can retry or go back to login
      const backToLoginButton = screen.getByRole('button', { name: /back to login/i })
      expect(backToLoginButton).toBeInTheDocument()
    })

    it('handles registration validation errors', async () => {
      render(<RegisterPage />)

      const submitButton = screen.getByRole('button', { name: /create account/i })

      // Try to submit without filling required fields
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/full name must be at least 2 characters/i)).toBeInTheDocument()
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      })
    })
  })

  describe('User Login Flow', () => {
    it('completes login with email and password', async () => {
      render(<LoginPage />)

      // User fills login form
      const emailInput = screen.getByPlaceholderText('Email')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
      })
    })

    it('switches between login methods', async () => {
      render(<LoginPage />)

      // Switch to phone login
      const phoneTab = screen.getByRole('tab', { name: /phone/i })
      fireEvent.click(phoneTab)

      expect(screen.getByPlaceholderText(/phone number/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send sms/i })).toBeInTheDocument()

      // Switch to Google login
      const googleTab = screen.getByRole('tab', { name: /google/i })
      fireEvent.click(googleTab)

      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
    })
  })

  describe('Matching Flow', () => {
    it('loads and displays matching candidates', async () => {
      const mockCandidates = [
        {
          id: 'user-1',
          full_name: 'Jane Smith',
          avatar_url: 'https://example.com/avatar1.jpg',
          age: 25,
          location: 'San Francisco',
          bio: 'Tech enthusiast and music lover',
          interests: ['technology', 'music'],
          industry: 'Technology',
          communication_style: 'friendly',
          compatibility_score: 85,
          common_interests: ['technology', 'music'],
          match_reasons: ['Shared passion for technology', 'Both enjoy music'],
        },
        {
          id: 'user-2',
          full_name: 'Bob Wilson',
          avatar_url: 'https://example.com/avatar2.jpg',
          age: 28,
          location: 'New York',
          bio: 'Healthcare professional',
          interests: ['healthcare', 'travel'],
          industry: 'Healthcare',
          communication_style: 'professional',
          compatibility_score: 65,
          common_interests: ['travel'],
          match_reasons: ['Both enjoy traveling'],
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: mockCandidates }),
      })

      render(<MatchingPage />)

      // Wait for candidates to load
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('Tech enthusiast and music lover')).toBeInTheDocument()
      })

      // Verify candidate information is displayed
      expect(screen.getByText('85%')).toBeInTheDocument()
      expect(screen.getByText('San Francisco')).toBeInTheDocument()
      expect(screen.getByText('Technology')).toBeInTheDocument()
    })

    it('handles like action', async () => {
      const mockCandidates = [
        {
          id: 'user-1',
          full_name: 'Jane Smith',
          avatar_url: 'https://example.com/avatar1.jpg',
          age: 25,
          location: 'San Francisco',
          bio: 'Tech enthusiast',
          interests: ['technology'],
          industry: 'Technology',
          communication_style: 'friendly',
          compatibility_score: 85,
          common_interests: ['technology'],
          match_reasons: ['Shared passion for technology'],
        },
      ]

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ candidates: mockCandidates }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isMatch: false }),
        })

      render(<MatchingPage />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      // Click like button
      const likeButton = screen.getByRole('button', { name: /like/i })
      fireEvent.click(likeButton)

      // Verify API call was made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/matching/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId: 'user-1' }),
        })
      })
    })

    it('handles successful match', async () => {
      const mockCandidates = [
        {
          id: 'user-1',
          full_name: 'Jane Smith',
          avatar_url: 'https://example.com/avatar1.jpg',
          age: 25,
          location: 'San Francisco',
          bio: 'Tech enthusiast',
          interests: ['technology'],
          industry: 'Technology',
          communication_style: 'friendly',
          compatibility_score: 95,
          common_interests: ['technology'],
          match_reasons: ['Perfect match!'],
        },
      ]

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ candidates: mockCandidates }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            isMatch: true, 
            chatId: 'chat-123',
            message: "It's a match!" 
          }),
        })

      render(<MatchingPage />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      // Click like button
      const likeButton = screen.getByRole('button', { name: /like/i })
      fireEvent.click(likeButton)

      // Should show match success message
      await waitFor(() => {
        expect(screen.getByText(/🎉 匹配成功！/i)).toBeInTheDocument()
      })
    })
  })

  describe('Chat Flow', () => {
    it('loads chat list', async () => {
      const mockChats = [
        {
          id: 'chat-1',
          matched_user: {
            id: 'user-1',
            full_name: 'Jane Smith',
            avatar_url: 'https://example.com/avatar1.jpg',
            is_online: true,
            last_seen: '2024-01-01T12:00:00Z',
          },
          last_message: {
            content: 'Hello! How are you?',
            sender_id: 'user-1',
            created_at: '2024-01-01T12:00:00Z',
            message_type: 'text',
          },
          unread_count: 1,
          compatibility_score: 85,
          matched_at: '2024-01-01T10:00:00Z',
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chats: mockChats }),
      })

      render(<ChatPage />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('Hello! How are you?')).toBeInTheDocument()
      })

      // Verify chat information
      expect(screen.getByText('1')).toBeInTheDocument() // unread count
      expect(screen.getByText('85%')).toBeInTheDocument() // compatibility score
    })

    it('filters chats by search', async () => {
      const mockChats = [
        {
          id: 'chat-1',
          matched_user: {
            id: 'user-1',
            full_name: 'Jane Smith',
            avatar_url: 'https://example.com/avatar1.jpg',
            is_online: true,
            last_seen: '2024-01-01T12:00:00Z',
          },
          last_message: {
            content: 'Hello!',
            sender_id: 'user-1',
            created_at: '2024-01-01T12:00:00Z',
            message_type: 'text',
          },
          unread_count: 0,
          compatibility_score: 85,
          matched_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 'chat-2',
          matched_user: {
            id: 'user-2',
            full_name: 'Bob Wilson',
            avatar_url: 'https://example.com/avatar2.jpg',
            is_online: false,
            last_seen: '2024-01-01T11:00:00Z',
          },
          last_message: {
            content: 'Hi there!',
            sender_id: 'user-2',
            created_at: '2024-01-01T11:00:00Z',
            message_type: 'text',
          },
          unread_count: 0,
          compatibility_score: 70,
          matched_at: '2024-01-01T09:00:00Z',
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chats: mockChats }),
      })

      render(<ChatPage />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      })

      // Search for Jane
      const searchInput = screen.getByPlaceholderText('搜索聊天...')
      fireEvent.change(searchInput, { target: { value: 'Jane' } })

      // Should only show Jane's chat
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument()
      })
    })

    it('filters chats by status', async () => {
      const mockChats = [
        {
          id: 'chat-1',
          matched_user: {
            id: 'user-1',
            full_name: 'Jane Smith',
            avatar_url: 'https://example.com/avatar1.jpg',
            is_online: true,
            last_seen: '2024-01-01T12:00:00Z',
          },
          last_message: {
            content: 'Hello!',
            sender_id: 'user-1',
            created_at: '2024-01-01T12:00:00Z',
            message_type: 'text',
          },
          unread_count: 0,
          compatibility_score: 85,
          matched_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 'chat-2',
          matched_user: {
            id: 'user-2',
            full_name: 'Bob Wilson',
            avatar_url: 'https://example.com/avatar2.jpg',
            is_online: false,
            last_seen: '2024-01-01T11:00:00Z',
          },
          last_message: {
            content: 'Hi there!',
            sender_id: 'user-2',
            created_at: '2024-01-01T11:00:00Z',
            message_type: 'text',
          },
          unread_count: 1,
          compatibility_score: 70,
          matched_at: '2024-01-01T09:00:00Z',
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chats: mockChats }),
      })

      render(<ChatPage />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      })

      // Filter by unread messages
      const unreadButton = screen.getByRole('button', { name: /未读/i })
      fireEvent.click(unreadButton)

      // Should only show Bob's chat (has unread message)
      await waitFor(() => {
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      })
    })
  })

  describe('Complete User Journey', () => {
    it('simulates complete user journey from registration to chat', async () => {
      // This test simulates a complete user journey
      // Note: In a real integration test, you would use a test database
      // and actual API calls, but here we're testing the UI flow

      // Step 1: Registration
      const { rerender } = render(<RegisterPage />)
      
      const nameInput = screen.getByPlaceholderText('Full name')
      const emailInput = screen.getByPlaceholderText('Email')
      const passwordInput = screen.getByPlaceholderText('Password')
      const confirmPasswordInput = screen.getByPlaceholderText('Confirm password')
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument()
      })

      // Step 2: Login (after email verification)
      rerender(<LoginPage />)
      
      const loginEmailInput = screen.getByPlaceholderText('Email')
      const loginPasswordInput = screen.getByPlaceholderText('Password')
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.change(loginEmailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(loginPasswordInput, { target: { value: 'password123' } })
      fireEvent.click(loginButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
      })

      // Step 3: Matching
      rerender(<MatchingPage />)
      
      const mockCandidates = [
        {
          id: 'user-1',
          full_name: 'Jane Smith',
          avatar_url: 'https://example.com/avatar1.jpg',
          age: 25,
          location: 'San Francisco',
          bio: 'Tech enthusiast',
          interests: ['technology'],
          industry: 'Technology',
          communication_style: 'friendly',
          compatibility_score: 95,
          common_interests: ['technology'],
          match_reasons: ['Perfect match!'],
        },
      ]

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ candidates: mockCandidates }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            isMatch: true, 
            chatId: 'chat-123',
            message: "It's a match!" 
          }),
        })

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      const likeButton = screen.getByRole('button', { name: /like/i })
      fireEvent.click(likeButton)

      await waitFor(() => {
        expect(screen.getByText(/🎉 匹配成功！/i)).toBeInTheDocument()
      })

      // Step 4: Chat
      rerender(<ChatPage />)
      
      const mockChats = [
        {
          id: 'chat-123',
          matched_user: {
            id: 'user-1',
            full_name: 'Jane Smith',
            avatar_url: 'https://example.com/avatar1.jpg',
            is_online: true,
            last_seen: '2024-01-01T12:00:00Z',
          },
          last_message: {
            content: 'Hello! Nice to meet you!',
            sender_id: 'user-1',
            created_at: '2024-01-01T12:00:00Z',
            message_type: 'text',
          },
          unread_count: 1,
          compatibility_score: 95,
          matched_at: '2024-01-01T10:00:00Z',
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chats: mockChats }),
      })

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('Hello! Nice to meet you!')).toBeInTheDocument()
      })

      // Verify the complete journey worked
      expect(screen.getByText('95%')).toBeInTheDocument() // compatibility score
      expect(screen.getByText('1')).toBeInTheDocument() // unread count
    })
  })
}) 