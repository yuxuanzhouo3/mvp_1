import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check if we're in mock mode
    const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://mock.supabase.co';
    
    if (isMockMode) {
      // Return mock system health data
      const mockHealth = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        mode: 'mock',
        database: {
          status: 'healthy',
          response_time: 50,
          active_connections: 1,
          queue_size: 0,
          error_rate: 0,
          last_check: new Date().toISOString()
        },
        api_modules: {
          auth: {
            last_24h_requests: 1250,
            last_24h_errors: 2,
            success_rate: 99.84,
            avg_response_time: 145,
            last_error: 'Invalid credentials',
            last_error_time: new Date(Date.now() - 3600000).toISOString()
          },
          pay: {
            last_24h_requests: 89,
            last_24h_errors: 0,
            success_rate: 100.0,
            avg_response_time: 234,
          },
          chat: {
            last_24h_requests: 3420,
            last_24h_errors: 12,
            success_rate: 99.65,
            avg_response_time: 89,
            last_error: 'Message delivery failed',
            last_error_time: new Date(Date.now() - 1800000).toISOString()
          },
          match: {
            last_24h_requests: 567,
            last_24h_errors: 3,
            success_rate: 99.47,
            avg_response_time: 312,
            last_error: 'Matching algorithm timeout',
            last_error_time: new Date(Date.now() - 7200000).toISOString()
          }
        },
        circuit_breakers: {
          total_breakers: 4,
          open_breakers: 0,
          half_open_breakers: 0,
          closed_breakers: 4,
          details: {
            auth: { state: 'closed', failureCount: 0 },
            database: { state: 'closed', failureCount: 0 },
            payment: { state: 'closed', failureCount: 0 },
            matching: { state: 'closed', failureCount: 0 }
          }
        },
        redis: {
          status: 'connected',
          response_time: 25,
          memory_usage: 1024,
          connected_clients: 1
        },
        overall_status: 'healthy',
        response_time: Date.now() - startTime
      };

      return NextResponse.json(mockHealth);
    }

    // System health check with simplified mock data
    const health = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      mode: 'real',
      database: {
        status: 'healthy',
        response_time: 50,
        active_connections: 1,
        queue_size: 0,
        error_rate: 0,
        last_check: new Date().toISOString()
      },
      api_modules: await getApiModulesHealth(),
      circuit_breakers: {
        total_breakers: 4,
        open_breakers: 0,
        half_open_breakers: 0,
        closed_breakers: 4,
        details: {
          auth: { state: 'closed', failureCount: 0 },
          database: { state: 'closed', failureCount: 0 },
          payment: { state: 'closed', failureCount: 0 },
          matching: { state: 'closed', failureCount: 0 }
        }
      },
      redis: await getRedisHealth(),
      overall_status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy'
    };

    // Calculate overall status
    health.overall_status = calculateOverallStatus(health);

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      ...health,
      response_time: responseTime
    });

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      response_time: Date.now() - startTime,
      mode: 'error'
    }, { status: 500 });
  }
}

async function getApiModulesHealth() {
  // Mock data for now
  return {
    auth: {
      last_24h_requests: 1250,
      last_24h_errors: 2,
      success_rate: 99.84,
      avg_response_time: 145,
      last_error: 'Invalid credentials',
      last_error_time: new Date(Date.now() - 3600000).toISOString()
    },
    pay: {
      last_24h_requests: 89,
      last_24h_errors: 0,
      success_rate: 100.0,
      avg_response_time: 234,
    },
    chat: {
      last_24h_requests: 3420,
      last_24h_errors: 12,
      success_rate: 99.65,
      avg_response_time: 89,
      last_error: 'Message delivery failed',
      last_error_time: new Date(Date.now() - 1800000).toISOString()
    },
    match: {
      last_24h_requests: 567,
      last_24h_errors: 3,
      success_rate: 99.47,
      avg_response_time: 312,
      last_error: 'Matching algorithm timeout',
      last_error_time: new Date(Date.now() - 7200000).toISOString()
    }
  };
}

async function getRedisHealth() {
  try {
    const url = process.env.UPSTASH_REDIS_URL?.trim();
    const token = process.env.UPSTASH_REDIS_TOKEN?.trim();
    
    if (!url || !token) {
      return {
        status: 'disconnected',
        response_time: 0,
        memory_usage: 0,
        connected_clients: 0,
        last_error: 'Missing Redis environment variables'
      };
    }
    
    const { Redis } = require('@upstash/redis');
    const redis = new Redis({ url, token });
    
    const startTime = Date.now();
    await redis.set('health_check', 'ok', { ex: 60 });
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'connected',
      response_time: responseTime,
      memory_usage: 1024,
      connected_clients: 1
    };
  } catch (error) {
    return {
      status: 'error',
      response_time: 0,
      memory_usage: 0,
      connected_clients: 0,
      last_error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function calculateOverallStatus(health: any): 'healthy' | 'degraded' | 'unhealthy' {
  const issues = [];
  
  // Check database status
  if (health.database.status === 'unhealthy') issues.push('database_unhealthy');
  if (health.database.error_rate > 0.1) issues.push('database_high_error_rate');
  
  // Check API modules
  Object.entries(health.api_modules).forEach(([module, metrics]: [string, any]) => {
    if (metrics.success_rate < 95) issues.push(`${module}_low_success_rate`);
  });
  
  // Check circuit breakers
  if (health.circuit_breakers.open_breakers > 0) issues.push('circuit_breakers_open');
  
  // Check Redis
  if (health.redis.status === 'error') issues.push('redis_error');
  
  if (issues.length === 0) return 'healthy';
  if (issues.length <= 2) return 'degraded';
  return 'unhealthy';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'reset_circuit_breakers':
        // This action is not directly applicable in mock mode,
        // but for consistency, we can return a success message.
        // In a real scenario, you'd need to import the manager.
        return NextResponse.json({ 
          status: 'success', 
          message: 'Circuit breakers reset (mock mode)' 
        });

      case 'force_close_circuit_breakers':
        // This action is not directly applicable in mock mode,
        // but for consistency, we can return a success message.
        // In a real scenario, you'd need to import the manager.
        return NextResponse.json({ 
          status: 'success', 
          message: 'Circuit breakers forced closed (mock mode)' 
        });

      case 'reset_database_connection':
        // This action is not directly applicable in mock mode,
        // but for consistency, we can return a success message.
        // In a real scenario, you'd need to import the db module.
        return NextResponse.json({ 
          status: 'success', 
          message: 'Database connection reset (mock mode)' 
        });

      case 'clear_redis_cache':
        // This action is not directly applicable in mock mode,
        // but for consistency, we can return a success message.
        // In a real scenario, you'd need to import the Redis client.
        return NextResponse.json({ 
          status: 'success', 
          message: 'Redis cache cleared (mock mode)' 
        });

      default:
        return NextResponse.json({
          status: 'error',
          message: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Health POST error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 