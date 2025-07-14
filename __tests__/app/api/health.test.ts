import { NextRequest } from 'next/server'
import { GET } from '@/app/api/health/route'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.OPENAI_API_KEY = 'test-openai-key'

describe('Health API', () => {
  it('returns 200 status with health information', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('version')
    expect(data).toHaveProperty('environment')
    expect(data).toHaveProperty('services')
    
    expect(data.status).toBe('healthy')
    expect(data.environment).toBe('test')
    expect(data.services).toBeDefined()
  })

  it('includes all required service checks', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()
    
    expect(data.services).toHaveProperty('database')
    expect(data.services).toHaveProperty('redis')
    expect(data.services).toHaveProperty('openai')
    expect(data.services).toHaveProperty('stripe')
    expect(data.services).toHaveProperty('twilio')
  })

  it('returns proper response headers', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate')
  })

  it('handles missing environment variables gracefully', async () => {
    // Temporarily remove environment variables
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const originalRedisUrl = process.env.REDIS_URL
    
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.REDIS_URL
    
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.status).toBe('degraded') // Should be degraded when some services are unavailable
    
    // Restore environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    process.env.REDIS_URL = originalRedisUrl
  })

  it('includes uptime information', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()
    
    expect(data).toHaveProperty('uptime')
    expect(typeof data.uptime).toBe('number')
    expect(data.uptime).toBeGreaterThan(0)
  })

  it('includes memory usage information', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()
    
    expect(data).toHaveProperty('memory')
    expect(data.memory).toHaveProperty('used')
    expect(data.memory).toHaveProperty('total')
    expect(typeof data.memory.used).toBe('number')
    expect(typeof data.memory.total).toBe('number')
  })

  it('handles different request methods', async () => {
    const request = new NextRequest('http://localhost:3000/api/health', {
      method: 'POST'
    })
    
    // Should still work with POST method
    const response = await GET(request)
    expect(response.status).toBe(200)
  })

  it('includes version information', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()
    
    expect(data.version).toBeDefined()
    expect(typeof data.version).toBe('string')
  })

  it('includes timestamp in ISO format', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()
    
    expect(data.timestamp).toBeDefined()
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp)
  })
}) 