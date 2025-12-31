#!/usr/bin/env node

/**
 * PersonaLink 数据库连接测试脚本
 * 用于验证 Supabase 和 Redis 连接是否正常
 */

const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');

// 配置信息
const SUPABASE_URL = 'https://bamratexknmqvdbalzen.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTM4NzEsImV4cCI6MjA2ODA4OTg3MX0.yYa98ioJLLouUgHWITGb7U_VjNCTUuM-5NcraM7f3zA';

const REDIS_URL = 'https://firm-minnow-40919.upstash.io';
const REDIS_TOKEN = 'AZ_XAAIjcDEwOWFkMDEwOTFjMTE0YTdjYWY5MTE3OWNlNGQ0MWQxNHAxMA';

// 创建客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN,
});

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// 测试函数
async function testSupabaseConnection() {
  logInfo('测试 Supabase 连接...');
  
  try {
    // 测试基本连接
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    logSuccess('Supabase 连接成功');
    logInfo(`系统设置表记录数: ${data?.length || 0}`);
    
    // 测试认证
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      logWarning('认证服务可能未配置: ' + authError.message);
    } else {
      logSuccess('认证服务连接正常');
    }
    
    return true;
  } catch (error) {
    logError('Supabase 连接失败: ' + error.message);
    return false;
  }
}

async function testRedisConnection() {
  logInfo('测试 Redis 连接...');
  
  try {
    // 测试基本操作
    await redis.set('test_key', 'Hello Redis!');
    const value = await redis.get('test_key');
    
    if (value === 'Hello Redis!') {
      logSuccess('Redis 连接成功');
      
      // 清理测试数据
      await redis.del('test_key');
      logInfo('Redis 读写测试通过');
      
      return true;
    } else {
      throw new Error('Redis 读写测试失败');
    }
  } catch (error) {
    logError('Redis 连接失败: ' + error.message);
    return false;
  }
}

async function testDatabaseTables() {
  logInfo('检查数据库表结构...');
  
  const tables = [
    'profiles',
    'matches', 
    'user_likes',
    'chats',
    'messages',
    'transactions',
    'user_activities',
    'system_settings'
  ];
  
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        logError(`表 ${table} 不存在或无法访问: ${error.message}`);
        allTablesExist = false;
      } else {
        logSuccess(`表 ${table} 存在`);
      }
    } catch (error) {
      logError(`检查表 ${table} 时出错: ${error.message}`);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function testDatabaseFunctions() {
  logInfo('检查数据库函数...');
  
  const functions = [
    'get_user_stats',
    'get_match_recommendations',
    'get_chat_stats'
  ];
  
  let allFunctionsExist = true;
  
  for (const func of functions) {
    try {
      // 尝试调用函数（使用测试参数）
      const { data, error } = await supabase.rpc(func, {
        user_id: '00000000-0000-0000-0000-000000000000'
      });
      
      if (error) {
        logWarning(`函数 ${func} 可能不存在或参数错误: ${error.message}`);
        allFunctionsExist = false;
      } else {
        logSuccess(`函数 ${func} 存在`);
      }
    } catch (error) {
      logWarning(`检查函数 ${func} 时出错: ${error.message}`);
      allFunctionsExist = false;
    }
  }
  
  return allFunctionsExist;
}

async function testSystemSettings() {
  logInfo('检查系统设置...');
  
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*');
    
    if (error) {
      logError('无法获取系统设置: ' + error.message);
      return false;
    }
    
    if (data && data.length > 0) {
      logSuccess(`系统设置已配置 (${data.length} 项)`);
      
      // 显示关键设置
      const appName = data.find(item => item.key === 'app_name');
      const appVersion = data.find(item => item.key === 'app_version');
      
      if (appName) {
        logInfo(`应用名称: ${appName.value}`);
      }
      if (appVersion) {
        logInfo(`应用版本: ${appVersion.value}`);
      }
      
      return true;
    } else {
      logWarning('系统设置表为空，可能需要初始化');
      return false;
    }
  } catch (error) {
    logError('检查系统设置时出错: ' + error.message);
    return false;
  }
}

async function runAllTests() {
  log('🚀 开始 PersonaLink 数据库连接测试', 'bold');
  log('=' * 50, 'blue');
  
  const results = {
    supabase: false,
    redis: false,
    tables: false,
    functions: false,
    settings: false
  };
  
  // 运行测试
  results.supabase = await testSupabaseConnection();
  results.redis = await testRedisConnection();
  results.tables = await testDatabaseTables();
  results.functions = await testDatabaseFunctions();
  results.settings = await testSystemSettings();
  
  // 输出测试结果
  log('\n📊 测试结果汇总:', 'bold');
  log('=' * 30, 'blue');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ 通过' : '❌ 失败';
    const color = passed ? 'green' : 'red';
    log(`${test.padEnd(15)} ${status}`, color);
  });
  
  // 总体评估
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  log('\n' + '=' * 30, 'blue');
  
  if (passedTests === totalTests) {
    log('🎉 所有测试通过！数据库配置正确。', 'green');
    log('您现在可以开始使用 PersonaLink 应用了。', 'green');
  } else {
    log(`⚠️  ${passedTests}/${totalTests} 个测试通过`, 'yellow');
    log('请检查失败的测试项并修复配置问题。', 'yellow');
    
    if (!results.supabase) {
      log('\n💡 Supabase 连接问题建议:', 'blue');
      log('1. 检查环境变量配置');
      log('2. 确认网络连接');
      log('3. 验证 API 密钥');
    }
    
    if (!results.redis) {
      log('\n💡 Redis 连接问题建议:', 'blue');
      log('1. 检查 Upstash 配置');
      log('2. 确认 Redis URL 和 Token');
      log('3. 检查网络连接');
    }
    
    if (!results.tables) {
      log('\n💡 数据库表问题建议:', 'blue');
      log('1. 运行数据库初始化脚本');
      log('2. 检查 SQL 执行权限');
      log('3. 查看 Supabase Dashboard');
    }
  }
  
  log('\n🔗 相关链接:', 'bold');
  log('• Supabase Dashboard: https://supabase.com/dashboard');
  log('• Upstash Dashboard: https://console.upstash.com/');
  log('• 项目文档: README.md');
  
  return results;
}

// 主函数
async function main() {
  try {
    await runAllTests();
  } catch (error) {
    logError('测试过程中发生错误: ' + error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  testSupabaseConnection,
  testRedisConnection,
  testDatabaseTables,
  testDatabaseFunctions,
  testSystemSettings,
  runAllTests
}; 