import { MatchingEngine, UserProfile, MatchResult } from '@/lib/matching/engine'

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      neq: jest.fn(() => ({
        not: jest.fn(() => ({
          limit: jest.fn(() => ({
            order: jest.fn(),
          })),
        })),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(),
    })),
  })),
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}))

describe('Matching Engine', () => {
  let matchingEngine: MatchingEngine

  beforeEach(() => {
    jest.clearAllMocks()
    matchingEngine = MatchingEngine.getInstance()
  })

  describe('MatchingEngine Instance', () => {
    it('returns singleton instance', () => {
      const instance1 = MatchingEngine.getInstance()
      const instance2 = MatchingEngine.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('loadUserProfiles', () => {
    it('loads user profiles from database', async () => {
      const mockProfiles = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          full_name: 'John Doe',
          hobbies: ['technology', 'music'],
          personality_traits: { extroversion: 0.8 },
          timezone: '+8',
          industry: 'Technology',
          language: 'en',
          bio: 'Tech enthusiast',
          interests: ['programming', 'AI'],
          communication_style: 'friendly',
          availability: { weekdays: true },
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          full_name: 'Jane Smith',
          hobbies: ['music', 'travel'],
          personality_traits: { extroversion: 0.6 },
          timezone: '+8',
          industry: 'Healthcare',
          language: 'en',
          bio: 'Healthcare professional',
          interests: ['medicine', 'travel'],
          communication_style: 'professional',
          availability: { weekdays: true },
        },
      ]

      mockSupabase.from().select.mockResolvedValue({
        data: mockProfiles,
        error: null,
      })

      await matchingEngine.loadUserProfiles()

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.from().select).toHaveBeenCalledWith('*')
    })

    it('handles database errors gracefully', async () => {
      mockSupabase.from().select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      await matchingEngine.loadUserProfiles()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading user profiles:',
        { message: 'Database error' }
      )

      consoleSpy.mockRestore()
    })
  })

  describe('findMatches', () => {
    it('finds matches for a user', async () => {
      const mockProfiles = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          full_name: 'John Doe',
          hobbies: ['technology', 'music'],
          personality_traits: { extroversion: 0.8 },
          timezone: '+8',
          industry: 'Technology',
          language: 'en',
          bio: 'Tech enthusiast',
          interests: ['programming', 'AI'],
          communication_style: 'friendly',
          availability: { weekdays: true },
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          full_name: 'Jane Smith',
          hobbies: ['music', 'travel'],
          personality_traits: { extroversion: 0.6 },
          timezone: '+8',
          industry: 'Healthcare',
          language: 'en',
          bio: 'Healthcare professional',
          interests: ['medicine', 'travel'],
          communication_style: 'professional',
          availability: { weekdays: true },
        },
      ]

      mockSupabase.from().select.mockResolvedValue({
        data: mockProfiles,
        error: null,
      })

      await matchingEngine.loadUserProfiles()
      const matches = await matchingEngine.findMatches('user-1', 5)

      expect(matches).toHaveLength(1)
      expect(matches[0].user.id).toBe('user-2')
      expect(matches[0].score).toBeGreaterThan(0)
      expect(matches[0].score).toBeLessThanOrEqual(100)
      expect(matches[0].reasons).toBeInstanceOf(Array)
      expect(matches[0].compatibility_factors).toBeDefined()
    })

    it('throws error for non-existent user', async () => {
      const mockProfiles = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          full_name: 'John Doe',
          hobbies: ['technology'],
          personality_traits: {},
          timezone: '+8',
          industry: 'Technology',
          language: 'en',
          bio: 'Tech enthusiast',
          interests: ['programming'],
          communication_style: 'friendly',
          availability: {},
        },
      ]

      mockSupabase.from().select.mockResolvedValue({
        data: mockProfiles,
        error: null,
      })

      await matchingEngine.loadUserProfiles()

      await expect(matchingEngine.findMatches('non-existent-user')).rejects.toThrow(
        'User profile not found'
      )
    })

    it('respects limit parameter', async () => {
      const mockProfiles = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        full_name: `User ${i}`,
        hobbies: ['technology'],
        personality_traits: {},
        timezone: '+8',
        industry: 'Technology',
        language: 'en',
        bio: 'Tech enthusiast',
        interests: ['programming'],
        communication_style: 'friendly',
        availability: {},
      }))

      mockSupabase.from().select.mockResolvedValue({
        data: mockProfiles,
        error: null,
      })

      await matchingEngine.loadUserProfiles()
      const matches = await matchingEngine.findMatches('user-0', 3)

      expect(matches).toHaveLength(3)
    })

    it('excludes current user from matches', async () => {
      const mockProfiles = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          full_name: 'John Doe',
          hobbies: ['technology'],
          personality_traits: {},
          timezone: '+8',
          industry: 'Technology',
          language: 'en',
          bio: 'Tech enthusiast',
          interests: ['programming'],
          communication_style: 'friendly',
          availability: {},
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          full_name: 'Jane Smith',
          hobbies: ['music'],
          personality_traits: {},
          timezone: '+8',
          industry: 'Healthcare',
          language: 'en',
          bio: 'Healthcare professional',
          interests: ['medicine'],
          communication_style: 'professional',
          availability: {},
        },
      ]

      mockSupabase.from().select.mockResolvedValue({
        data: mockProfiles,
        error: null,
      })

      await matchingEngine.loadUserProfiles()
      const matches = await matchingEngine.findMatches('user-1', 10)

      expect(matches).toHaveLength(1)
      expect(matches[0].user.id).toBe('user-2')
    })
  })

  describe('Compatibility Calculations', () => {
    it('calculates high compatibility for similar users', async () => {
      const mockProfiles = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          full_name: 'John Doe',
          hobbies: ['technology', 'music'],
          personality_traits: { extroversion: 0.8 },
          timezone: '+8',
          industry: 'Technology',
          language: 'en',
          bio: 'Tech enthusiast',
          interests: ['programming', 'AI'],
          communication_style: 'friendly',
          availability: { weekdays: true },
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          full_name: 'Jane Smith',
          hobbies: ['technology', 'music'],
          personality_traits: { extroversion: 0.7 },
          timezone: '+8',
          industry: 'Technology',
          language: 'en',
          bio: 'Tech enthusiast',
          interests: ['programming', 'AI'],
          communication_style: 'friendly',
          availability: { weekdays: true },
        },
      ]

      mockSupabase.from().select.mockResolvedValue({
        data: mockProfiles,
        error: null,
      })

      await matchingEngine.loadUserProfiles()
      const matches = await matchingEngine.findMatches('user-1', 1)

      expect(matches[0].score).toBeGreaterThan(70)
    })

    it('calculates low compatibility for different users', async () => {
      const mockProfiles = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          full_name: 'John Doe',
          hobbies: ['technology'],
          personality_traits: { extroversion: 0.9 },
          timezone: '+8',
          industry: 'Technology',
          language: 'en',
          bio: 'Tech enthusiast',
          interests: ['programming'],
          communication_style: 'friendly',
          availability: { weekdays: true },
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          full_name: 'Jane Smith',
          hobbies: ['cooking'],
          personality_traits: { extroversion: 0.2 },
          timezone: '-5',
          industry: 'Healthcare',
          language: 'en',
          bio: 'Healthcare professional',
          interests: ['medicine'],
          communication_style: 'formal',
          availability: { weekends: true },
        },
      ]

      mockSupabase.from().select.mockResolvedValue({
        data: mockProfiles,
        error: null,
      })

      await matchingEngine.loadUserProfiles()
      const matches = await matchingEngine.findMatches('user-1', 1)

      expect(matches[0].score).toBeLessThan(50)
    })
  })

  describe('saveMatch', () => {
    it('saves match to database', async () => {
      const userId = 'user-1'
      const matchedUserId = 'user-2'
      const score = 85
      const reasons = ['Shared interests', 'Similar personality']

      mockSupabase.from().insert().select.mockResolvedValue({
        data: { id: 'match-123' },
        error: null,
      })

      await matchingEngine.saveMatch(userId, matchedUserId, score, reasons)

      expect(mockSupabase.from).toHaveBeenCalledWith('matches')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user1_id: userId,
        user2_id: matchedUserId,
        compatibility_score: score,
        match_reasons: reasons,
        created_at: expect.any(String),
      })
    })

    it('handles save errors gracefully', async () => {
      const userId = 'user-1'
      const matchedUserId = 'user-2'
      const score = 85
      const reasons = ['Shared interests']

      mockSupabase.from().insert().select.mockResolvedValue({
        data: null,
        error: { message: 'Save failed' },
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      await matchingEngine.saveMatch(userId, matchedUserId, score, reasons)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error saving match:',
        { message: 'Save failed' }
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Integration Tests', () => {
    it('complete matching workflow', async () => {
      const mockProfiles = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          full_name: 'John Doe',
          hobbies: ['technology', 'music'],
          personality_traits: { extroversion: 0.8, openness: 0.7 },
          timezone: '+8',
          industry: 'Technology',
          language: 'en',
          bio: 'Tech enthusiast',
          interests: ['programming', 'AI'],
          communication_style: 'friendly',
          availability: { weekdays: true },
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          full_name: 'Jane Smith',
          hobbies: ['music', 'technology'],
          personality_traits: { extroversion: 0.7, openness: 0.8 },
          timezone: '+8',
          industry: 'Technology',
          language: 'en',
          bio: 'Tech enthusiast',
          interests: ['AI', 'programming'],
          communication_style: 'friendly',
          availability: { weekdays: true },
        },
        {
          id: 'user-3',
          email: 'user3@example.com',
          full_name: 'Bob Wilson',
          hobbies: ['cooking'],
          personality_traits: { extroversion: 0.3 },
          timezone: '-5',
          industry: 'Healthcare',
          language: 'en',
          bio: 'Healthcare professional',
          interests: ['medicine'],
          communication_style: 'formal',
          availability: { weekends: true },
        },
      ]

      mockSupabase.from().select.mockResolvedValue({
        data: mockProfiles,
        error: null,
      })

      mockSupabase.from().insert().select.mockResolvedValue({
        data: { id: 'match-123' },
        error: null,
      })

      // Load profiles
      await matchingEngine.loadUserProfiles()

      // Find matches
      const matches = await matchingEngine.findMatches('user-1', 2)

      expect(matches).toHaveLength(2)
      expect(matches[0].user.id).toBe('user-2') // Should be highest compatibility
      expect(matches[0].score).toBeGreaterThan(matches[1].score)

      // Save a match
      await matchingEngine.saveMatch('user-1', 'user-2', matches[0].score, matches[0].reasons)

      expect(mockSupabase.from().insert).toHaveBeenCalled()
    })
  })
})