const fs = require('fs');
const path = require('path');

// 正确的 API keys
const correctKeys = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://bamratexknmqvdbalzen.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTM4NzEsImV4cCI6MjA2ODA4OTg3MX0.yYa98ioJLLouUgHWITGb7U_VjNCTUuM-5NcraM7f3zA',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUxMzg3MSwiZXhwIjoyMDY4MDg5ODcxfQ.T569BUOGjoHHNCtURdpQRPZQ3BIR-TBtbUs19P086p4'
};

function updateApiKeys() {
  console.log('🔑 Updating API keys...\n');

  const envPath = path.join(process.cwd(), '.env.local');
  
  try {
    // 读取现有文件
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }

    // 更新 API keys
    Object.entries(correctKeys).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;
      
      if (content.includes(key)) {
        content = content.replace(regex, newLine);
      } else {
        content += `\n${newLine}`;
      }
    });

    // 写入文件
    fs.writeFileSync(envPath, content);
    console.log('✅ API keys updated successfully');
    
    // 验证更新
    const updatedContent = fs.readFileSync(envPath, 'utf8');
    Object.entries(correctKeys).forEach(([key, value]) => {
      if (updatedContent.includes(key) && updatedContent.includes(value.substring(0, 20))) {
        console.log(`✅ ${key}: Updated`);
      } else {
        console.log(`❌ ${key}: Update failed`);
      }
    });
    
    console.log('\n🎉 API keys update completed!');
    console.log('💡 Please restart your development server: npm run dev');
    
  } catch (error) {
    console.error('❌ Failed to update API keys:', error.message);
  }
}

// 测试连接
async function testConnection() {
  console.log('\n🔍 Testing connection with new API keys...');
  
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(
    correctKeys.NEXT_PUBLIC_SUPABASE_URL,
    correctKeys.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Connection failed:', error.message);
    } else {
      console.log('✅ Connection successful!');
      console.log('📊 Data:', data);
    }
  } catch (err) {
    console.log('❌ Connection test failed:', err.message);
  }
}

async function main() {
  updateApiKeys();
  await testConnection();
}

main().catch(console.error); 