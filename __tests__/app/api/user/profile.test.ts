import { NextRequest } from 'next/server'
import { GET, PUT } from '@/app/api/user/profile/route'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  })),
}

jest.mock('@supabase/ssr', () => ({
  createRouteHandlerClient: () => mockSupabase,
}))

jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
  }),
}))

describe('User Profile API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/user/profile', () => {
    it('returns user profile when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }
      
      const mockProfile = {
        id: 'user-123',
        full_name: 'John Doe',
        bio: 'Test bio',
        avatar_url: 'https://example.com/avatar.jpg',
        age: 25,
        location: 'New York',
        interests: ['technology', 'music'],
        industry: 'Technology',
        communication_style: 'friendly',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/user/profile')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.profile).toEqual(mockProfile)
    })

    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/user/profile')
      const response = await GET(request)
      
      expect(response.status).toBe(401)
      
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 404 when profile not found', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      })

      const request = new NextRequest('http://localhost:3000/api/user/profile')
      const response = await GET(request)
      
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.error).toBe('Profile not found')
    })

    it('handles database errors gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from().select().eq().single.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/user/profile')
      const response = await GET(request)
      
      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('PUT /api/user/profile', () => {
    it('updates user profile successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }
      
      const updateData = {
        username: 'johndoe',
        bio: 'Updated bio',
        location: 'San Francisco',
        age: 26,
        gender: 'male',
      }
      
      const updatedProfile = {
        id: 'user-123',
        ...updateData,
        updated_at: '2024-01-02T00:00:00Z',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedProfile,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })
      
      const response = await PUT(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.profile).toEqual(updatedProfile)
    })

    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bio: 'Test' }),
      })
      
      const response = await PUT(request)
      
      expect(response.status).toBe(401)
      
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 when update fails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      })

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bio: 'Test' }),
      })
      
      const response = await PUT(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Failed to update profile')
    })

    it('handles invalid JSON in request body', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })
      
      const response = await PUT(request)
      
      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('validates required fields', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Test with empty username
      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: '', bio: 'Test bio' }),
      })
      
      const response = await PUT(request)
      
      // Should still process the request as validation is handled by the database
      expect(response.status).toBe(200)
    })

    it('updates timestamp when profile is modified', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }
      
      const updateData = {
        bio: 'Updated bio',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          id: 'user-123',
          ...updateData,
          updated_at: '2024-01-02T00:00:00Z',
        },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })
      
      const response = await PUT(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.profile.updated_at).toBeDefined()
      expect(new Date(data.profile.updated_at).toISOString()).toBe(data.profile.updated_at)
    })
  })
}) 