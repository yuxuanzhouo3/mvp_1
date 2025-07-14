import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';
import { circuitBreakerManager } from '@/lib/utils/circuitBreaker';

// 确保数据库已初始化
if (!db.getStats) {
  initializeDatabase();
}

// 创建 Redis 客户端的函数，处理环境变量中的空白字符
function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_URL?.trim();
  const token = process.env.UPSTASH_REDIS_TOKEN?.trim();
  
  if (!url || !token) {
    throw new Error('Missing Redis environment variables');
  }
  
  const { Redis } = require('@upstash/redis');
  return new Redis({ url, token });
}

export interface SystemHealth {
  timestamp: string;
  environment: string;
  database: DatabaseHealth;
  api_modules: ApiModuleHealth;
  circuit_breakers: CircuitBreakerHealth;
  redis: RedisHealth;
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
}

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time: number;
  active_connections: number;
  queue_size: number;
  error_rate: number;
  last_check: string;
}

export interface ApiModuleHealth {
  auth: ModuleMetrics;
  pay: ModuleMetrics;
  chat: ModuleMetrics;
  match: ModuleMetrics;
}

export interface ModuleMetrics {
  last_24h_requests: number;
  last_24h_errors: number;
  success_rate: number;
  avg_response_time: number;
  last_error?: string;
  last_error_time?: string;
}

export interface CircuitBreakerHealth {
  total_breakers: number;
  open_breakers: number;
  half_open_breakers: number;
  closed_breakers: number;
  details: Record<string, any>;
}

export interface RedisHealth {
  status: 'connected' | 'disconnected' | 'error';
  response_time: number;
  memory_usage: number;
  connected_clients: number;
  last_error?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const health: SystemHealth = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: await getDatabaseHealth(),
      api_modules: await getApiModulesHealth(),
      circuit_breakers: getCircuitBreakersHealth(),
      redis: await getRedisHealth(),
      overall_status: 'healthy'
    };

    // 计算整体状态
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
      response_time: Date.now() - startTime
    }, { status: 500 });
  }
}

async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const dbStats = db.getStats();
  const healthStatus = db.getHealthStatus();
  
  return {
    status: healthStatus.status,
    response_time: healthStatus.responseTime,
    active_connections: healthStatus.activeConnections,
    queue_size: healthStatus.queueSize,
    error_rate: healthStatus.errorCount / Math.max(healthStatus.successCount + healthStatus.errorCount, 1),
    last_check: healthStatus.lastCheck.toISOString()
  };
}

async function getApiModulesHealth(): Promise<ApiModuleHealth> {
  // 这里可以从实际的监控数据中获取，现在使用模拟数据
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

function getCircuitBreakersHealth(): CircuitBreakerHealth {
  const status = circuitBreakerManager.getStatus();
  const breakers = Object.values(status);
  
  return {
    total_breakers: breakers.length,
    open_breakers: breakers.filter(b => b.state === 'open').length,
    half_open_breakers: breakers.filter(b => b.state === 'half-open').length,
    closed_breakers: breakers.filter(b => b.state === 'closed').length,
    details: status
  };
}

async function getRedisHealth(): Promise<RedisHealth> {
  try {
    const startTime = Date.now();
    
    // 测试 Redis 连接
    await createRedisClient().set('health_check', 'ok', { ex: 60 });
    const responseTime = Date.now() - startTime;
    
    // 简化 Redis 内存使用检查
    const memoryUsage = 0; // 简化版本，实际应该从 Redis 获取
    
    return {
      status: 'connected',
      response_time: responseTime,
      memory_usage: memoryUsage,
      connected_clients: 1 // 简化版本
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



function calculateOverallStatus(health: SystemHealth): 'healthy' | 'degraded' | 'unhealthy' {
  const issues = [];
  
  // 检查数据库状态
  if (health.database.status === 'unhealthy') issues.push('database_unhealthy');
  if (health.database.error_rate > 0.1) issues.push('database_high_error_rate');
  
  // 检查 API 模块
  Object.entries(health.api_modules).forEach(([module, metrics]) => {
    if (metrics.success_rate < 95) issues.push(`${module}_low_success_rate`);
  });
  
  // 检查断路器
  if (health.circuit_breakers.open_breakers > 0) issues.push('circuit_breakers_open');
  
  // 检查 Redis
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
        circuitBreakerManager.resetAll();
        return NextResponse.json({ 
          status: 'success', 
          message: 'All circuit breakers reset' 
        });

      case 'force_close_circuit_breakers':
        circuitBreakerManager.forceCloseAll();
        return NextResponse.json({ 
          status: 'success', 
          message: 'All circuit breakers forced closed' 
        });

      case 'reset_database_connection':
        await db.resetConnection();
        return NextResponse.json({ 
          status: 'success', 
          message: 'Database connection reset' 
        });

      case 'clear_redis_cache':
        await createRedisClient().flushdb();
        return NextResponse.json({ 
          status: 'success', 
          message: 'Redis cache cleared' 
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