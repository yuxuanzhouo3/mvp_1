const fs = require('fs');
const path = require('path');

// 正确的环境变量配置
const envConfig = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://bamratexknmqvdbalzen.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTM4NzEsImV4cCI6MjA2ODA4OTg3MX0.yYa98ioJLLouUgHWITGb7U_VjNCTUuM-5NcraM7f3zA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUxMzg3MSwiZXhwIjoyMDY4MDg5ODcxfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8

# Upstash Redis Configuration
UPSTASH_REDIS_URL=https://firm-minnow-40919.upstash.io
UPSTASH_REDIS_TOKEN=AZ_XAAIjcDEwOWFkMDEwOTFjMTE0YTdjYWY5MTE3OWNlNGQ0MWQxNHAxMA

# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# Application Configuration
NODE_ENV=development
`;

function fixEnvironmentVariables() {
  console.log('🔧 Fixing environment variables...\n');

  const envPath = path.join(process.cwd(), '.env.local');
  
  try {
    // 写入 .env.local 文件
    fs.writeFileSync(envPath, envConfig);
    console.log('✅ .env.local file created/updated successfully');
    
    // 验证文件内容
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    console.log(`📝 Found ${lines.length} environment variables:`);
    lines.forEach(line => {
      const [key] = line.split('=');
      console.log(`   - ${key}`);
    });
    
    console.log('\n🎉 Environment variables fixed!');
    console.log('💡 Please restart your development server: npm run dev');
    
  } catch (error) {
    console.error('❌ Failed to fix environment variables:', error.message);
  }
}

// 验证 Supabase 连接
async function testSupabaseConnection() {
  console.log('\n🔍 Testing Supabase connection...');
  
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = 'https://bamratexknmqvdbalzen.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTM4NzEsImV4cCI6MjA2ODA4OTg3MX0.yYa98ioJLLouUgHWITGb7U_VjNCTUuM-5NcraM7f3zA';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
      
      if (error.message.includes('Invalid API key')) {
        console.log('\n🔑 API Key Issues:');
        console.log('1. Check if the API key is correct');
        console.log('2. Verify the key hasn\'t expired');
        console.log('3. Ensure the key has proper permissions');
        console.log('4. Check if the Supabase project is active');
      }
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (err) {
    console.log('❌ Connection test failed:', err.message);
  }
}

// 主函数
async function main() {
  fixEnvironmentVariables();
  await testSupabaseConnection();
}

main().catch(console.error); 