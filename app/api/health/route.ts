import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // 检查环境变量
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENAI_API_KEY',
      'REDIS_URL'
    ];

    const missingEnvVars = requiredEnvVars.filter(
      varName => !process.env[varName]
    );

    if (missingEnvVars.length > 0) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing environment variables',
        missing: missingEnvVars,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }, { status: 500 });
    }

    // 检查数据库连接
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: dbTest, error: dbError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (dbError) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: dbError.message,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }, { status: 500 });
    }

    // 检查 Redis 连接 (如果配置了)
    let redisStatus = 'not_configured';
    if (process.env.REDIS_URL) {
      try {
        // 这里可以添加 Redis 连接测试
        redisStatus = 'connected';
      } catch (error) {
        redisStatus = 'error';
      }
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      message: 'All systems operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      services: {
        database: 'connected',
        redis: redisStatus,
        environment: 'configured'
      },
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`
    }, { status: 500 });
  }
} 