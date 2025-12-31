const https = require('https');

async function testProductionDeployment() {
  console.log('🚀 Testing Production Deployment...\n');

  const baseUrl = 'https://www.mornhub.lat';
  
  const endpoints = [
    '/',
    '/auth/login',
    '/auth/register',
    '/api/health',
    '/api/system/health'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${baseUrl}${endpoint}`);
      
      const response = await new Promise((resolve, reject) => {
        https.get(`${baseUrl}${endpoint}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ statusCode: res.statusCode, data }));
        }).on('error', reject);
      });

      if (response.statusCode === 200) {
        console.log(`✅ ${endpoint} - Status: ${response.statusCode}`);
      } else {
        console.log(`⚠️  ${endpoint} - Status: ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }

  console.log('\n🎉 Production deployment test completed!');
  console.log('📱 Your app is live at: https://www.mornhub.lat');
  console.log('🔐 Login page: https://www.mornhub.lat/auth/login');
  console.log('📊 Dashboard: https://www.mornhub.lat/dashboard');
}

testProductionDeployment().catch(console.error); 