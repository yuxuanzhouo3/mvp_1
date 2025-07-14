import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 数据库错误处理器
class DatabaseErrorHandler {
  private static errorLog: Array<{ timestamp: string; error: string; context: string }> = [];

  static logError(error: any, context: string) {
    this.errorLog.push({
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      context
    });
  }

  static getErrorLog() {
    return this.errorLog;
  }

  static clearErrorLog() {
    this.errorLog = [];
  }

  static createErrorResponse(error: any, context: string) {
    this.logError(error, context);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Starting comprehensive database test...');
    
    const supabase = createClient();
    
    // 定义结果对象类型
    const results: {
      timestamp: string;
      environment: 'development' | 'production' | 'test';
      tests: {
        basicConnection: any;
        tableAccess: Record<string, any>;
        performance: Record<string, any>;
        concurrentConnections: any;
        rlsPolicies: any;
        environmentVariables: Record<string, any>;
        errorLog: any[];
      };
      summary?: {
        totalResponseTime: number;
        totalTests: number;
        failedTests: number;
        successRate: string;
        overallStatus: string;
      };
    } = {
      timestamp: new Date().toISOString(),
      environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      tests: {
        basicConnection: {},
        tableAccess: {},
        performance: {},
        concurrentConnections: {},
        rlsPolicies: {},
        environmentVariables: {},
        errorLog: []
      }
    };

    // 1. 基本连接测试
    console.log('🔍 Testing basic connection...');
    const connectionStart = Date.now();
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      results.tests.basicConnection = {
        status: error ? 'failed' : 'success',
        responseTime: Date.now() - connectionStart,
        error: error?.message || null
      };
    } catch (err) {
      results.tests.basicConnection = {
        status: 'failed',
        responseTime: Date.now() - connectionStart,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // 2. 表访问测试
    console.log('🔍 Testing table access...');
    const tables = [
      'profiles',
      'matches',
      'chats',
      'messages',
      'user_settings',
      'user_activity'
    ];

    results.tests.tableAccess = {};
    for (const table of tables) {
      const tableStart = Date.now();
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        results.tests.tableAccess[table] = {
          status: error ? 'failed' : 'success',
          responseTime: Date.now() - tableStart,
          error: error?.message || null
        };
      } catch (err) {
        results.tests.tableAccess[table] = {
          status: 'failed',
          responseTime: Date.now() - tableStart,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }

    // 3. 查询性能测试
    console.log('🔍 Testing query performance...');
    const performanceTests = [
      { name: 'simple_select', query: () => supabase.from('profiles').select('id, full_name').limit(10) },
      { name: 'complex_select', query: () => supabase.from('profiles').select('*').limit(5) },
      { name: 'count_query', query: () => supabase.from('profiles').select('count') },
      { name: 'filtered_query', query: () => supabase.from('profiles').select('*').limit(5) }
    ];

    results.tests.performance = {};
    for (const test of performanceTests) {
      const testStart = Date.now();
      try {
        const { data, error } = await test.query();
        results.tests.performance[test.name] = {
          status: error ? 'failed' : 'success',
          responseTime: Date.now() - testStart,
          resultCount: Array.isArray(data) ? data.length : 1,
          error: error?.message || null
        };
      } catch (err) {
        results.tests.performance[test.name] = {
          status: 'failed',
          responseTime: Date.now() - testStart,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }

    // 4. 并发连接测试
    console.log('🔍 Testing concurrent connections...');
    const concurrentTests = Array(5).fill(null).map(async (_, i) => {
      const start = Date.now();
      try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        return {
          index: i,
          success: !error,
          responseTime: Date.now() - start,
          error: error?.message || null
        };
      } catch (err) {
        return {
          index: i,
          success: false,
          responseTime: Date.now() - start,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    });

    const concurrentResults = await Promise.all(concurrentTests);
    results.tests.concurrentConnections = {
      total: concurrentResults.length,
      successful: concurrentResults.filter(r => r.success).length,
      failed: concurrentResults.filter(r => !r.success).length,
      averageResponseTime: concurrentResults.reduce((sum, r) => sum + r.responseTime, 0) / concurrentResults.length,
      details: concurrentResults
    };

    // 5. RLS 策略测试
    console.log('🔍 Testing RLS policies...');
    const rlsStart = Date.now();
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      results.tests.rlsPolicies = {
        status: error && error.message.includes('policy') ? 'working' : 'needs_configuration',
        responseTime: Date.now() - rlsStart,
        error: error?.message || null
      };
    } catch (err) {
      results.tests.rlsPolicies = {
        status: 'working',
        responseTime: Date.now() - rlsStart,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // 6. 环境变量检查
    console.log('🔍 Checking environment variables...');
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'UPSTASH_REDIS_URL',
      'UPSTASH_REDIS_TOKEN'
    ];

    results.tests.environmentVariables = {};
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      results.tests.environmentVariables[envVar] = {
        configured: !!value,
        value: value ? `${value.substring(0, 10)}...` : null
      };
    }

    // 7. 错误日志
    results.tests.errorLog = DatabaseErrorHandler.getErrorLog().slice(-10);

    // 8. 总体状态
    const totalResponseTime = Date.now() - startTime;
    const allTests = [
      results.tests.basicConnection,
      ...Object.values(results.tests.tableAccess),
      ...Object.values(results.tests.performance),
      results.tests.concurrentConnections,
      results.tests.rlsPolicies
    ];

    const failedTests = allTests.filter(test => test.status === 'failed').length;
    const totalTests = allTests.length;

    results.summary = {
      totalResponseTime,
      totalTests,
      failedTests,
      successRate: ((totalTests - failedTests) / totalTests * 100).toFixed(2) + '%',
      overallStatus: failedTests === 0 ? 'healthy' : failedTests < 3 ? 'degraded' : 'unhealthy'
    };

    console.log('✅ Database test completed');
    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Database test failed:', error);
    return DatabaseErrorHandler.createErrorResponse(error, 'database test');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'clear_error_log':
        DatabaseErrorHandler.clearErrorLog();
        return NextResponse.json({ 
          status: 'success', 
          message: 'Error log cleared' 
        });

      case 'test_write_operation':
        // 测试写操作
        const supabase = createClient();
        const { data: writeResult, error: writeError } = await supabase
          .from('user_settings')
          .insert({
            user_id: 'test-user-' + Date.now(),
            notifications_enabled: true
          })
          .select()
          .single();

        if (writeError) {
          return NextResponse.json({
            status: 'failed',
            error: writeError.message
          }, { status: 400 });
        }

        return NextResponse.json({
          status: 'success',
          message: 'Write operation successful',
          data: writeResult
        });

      default:
        return NextResponse.json({
          status: 'error',
          message: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('POST test error:', error);
    return DatabaseErrorHandler.createErrorResponse(error, 'database test POST');
  }
} 