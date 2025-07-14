const { createClient } = require('@supabase/supabase-js');

// 配置
const supabaseUrl = 'https://bamratexknmqvdbalzen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTM4NzEsImV4cCI6MjA2ODA4OTg3MX0.yYa98ioJLLouUgHWITGb7U_VjNCTUuM-5NcraM7f3zA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseDatabaseConnections() {
  console.log('🔍 Database Connection Diagnostic Report\n');
  console.log('=' .repeat(60));

  // 1. 基本连接测试
  console.log('\n1. BASIC CONNECTION TEST');
  console.log('-'.repeat(30));
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.log('❌ Basic connection failed:', error.message);
      return;
    }
    console.log('✅ Basic connection successful');
  } catch (err) {
    console.log('❌ Connection error:', err.message);
    return;
  }

  // 2. 表结构验证
  console.log('\n2. TABLE STRUCTURE VALIDATION');
  console.log('-'.repeat(30));
  
  const requiredTables = [
    'profiles',
    'user_settings',
    'match_preferences', 
    'matches',
    'chat_rooms',
    'messages',
    'payments',
    'user_balance',
    'transactions',
    'user_interests',
    'user_photos'
  ];

  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: OK`);
      }
    } catch (err) {
      console.log(`❌ Table ${table}: ${err.message}`);
    }
  }

  // 3. API 模块连接测试
  console.log('\n3. API MODULE CONNECTION TESTS');
  console.log('-'.repeat(30));

  // Auth API 测试
  console.log('\n🔐 Authentication API:');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('❌ Auth connection failed:', error.message);
    } else {
      console.log('✅ Auth connection successful');
    }
  } catch (err) {
    console.log('❌ Auth error:', err.message);
  }

  // Payment API 测试
  console.log('\n💳 Payment API:');
  try {
    const { data, error } = await supabase.from('payments').select('*').limit(1);
    if (error) {
      console.log('❌ Payment table access failed:', error.message);
    } else {
      console.log('✅ Payment table accessible');
    }
  } catch (err) {
    console.log('❌ Payment error:', err.message);
  }

  // Chat API 测试
  console.log('\n💬 Chat API:');
  try {
    const { data, error } = await supabase.from('messages').select('*').limit(1);
    if (error) {
      console.log('❌ Chat table access failed:', error.message);
    } else {
      console.log('✅ Chat table accessible');
    }
  } catch (err) {
    console.log('❌ Chat error:', err.message);
  }

  // Matching API 测试
  console.log('\n🎯 Matching API:');
  try {
    const { data, error } = await supabase.from('matches').select('*').limit(1);
    if (error) {
      console.log('❌ Matching table access failed:', error.message);
    } else {
      console.log('✅ Matching table accessible');
    }
  } catch (err) {
    console.log('❌ Matching error:', err.message);
  }

  // 4. 性能测试
  console.log('\n4. PERFORMANCE TESTS');
  console.log('-'.repeat(30));

  // 查询性能测试
  const startTime = Date.now();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, age, location')
      .limit(10);
    
    const queryTime = Date.now() - startTime;
    if (error) {
      console.log('❌ Performance test failed:', error.message);
    } else {
      console.log(`✅ Query performance: ${queryTime}ms for 10 records`);
    }
  } catch (err) {
    console.log('❌ Performance test error:', err.message);
  }

  // 5. RLS 策略测试
  console.log('\n5. ROW LEVEL SECURITY (RLS) TESTS');
  console.log('-'.repeat(30));

  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error && error.message.includes('policy')) {
      console.log('✅ RLS is working (blocked unauthorized access)');
    } else if (error) {
      console.log('⚠️  RLS error:', error.message);
    } else {
      console.log('⚠️  RLS might not be properly configured');
    }
  } catch (err) {
    console.log('✅ RLS is working');
  }

  // 6. 环境变量检查
  console.log('\n6. ENVIRONMENT VARIABLES CHECK');
  console.log('-'.repeat(30));

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'UPSTASH_REDIS_URL',
    'UPSTASH_REDIS_TOKEN'
  ];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: Configured`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
    }
  }

  // 7. 连接池和超时测试
  console.log('\n7. CONNECTION POOL & TIMEOUT TESTS');
  console.log('-'.repeat(30));

  // 并发连接测试
  const concurrentTests = Array(5).fill().map(async (_, i) => {
    const start = Date.now();
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      const duration = Date.now() - start;
      return { success: !error, duration, index: i };
    } catch (err) {
      const duration = Date.now() - start;
      return { success: false, duration, index: i, error: err.message };
    }
  });

  const results = await Promise.all(concurrentTests);
  const successful = results.filter(r => r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`✅ Concurrent connections: ${successful}/5 successful`);
  console.log(`📊 Average response time: ${avgDuration.toFixed(2)}ms`);

  // 8. 建议和修复
  console.log('\n8. RECOMMENDATIONS & FIXES');
  console.log('-'.repeat(30));

  console.log('\n🔧 Suggested Improvements:');
  console.log('1. Add connection pooling configuration');
  console.log('2. Implement retry logic for failed connections');
  console.log('3. Add comprehensive error logging');
  console.log('4. Set up connection health checks');
  console.log('5. Configure proper timeout settings');
  console.log('6. Add database migration validation');
  console.log('7. Implement connection monitoring');

  console.log('\n📝 Implementation Examples:');
  console.log('- Use connection pooling in production');
  console.log('- Add exponential backoff for retries');
  console.log('- Log all database errors with context');
  console.log('- Set up health check endpoints');
  console.log('- Monitor connection pool metrics');

  console.log('\n🎉 Diagnostic completed!');
}

diagnoseDatabaseConnections().catch(console.error); 