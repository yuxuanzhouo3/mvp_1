const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(path, expectedStatus = 200) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === expectedStatus) {
          console.log(`✅ ${path} - Status: ${res.statusCode}`);
          resolve(true);
        } else {
          console.log(`❌ ${path} - Expected ${expectedStatus}, got ${res.statusCode}`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log(`❌ ${path} - Error: ${err.message}`);
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('🧪 Testing local application...\n');
  
  const tests = [
    { path: '/', name: 'Homepage' },
    { path: '/auth/login', name: 'Login Page' },
    { path: '/auth/register', name: 'Register Page' },
    { path: '/dashboard', name: 'Dashboard Page' },
    { path: '/chat', name: 'Chat Page' },
    { path: '/matching', name: 'Matching Page' },
    { path: '/api/health', name: 'Health API' },
    { path: '/api/system/health', name: 'System Health API' },
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const success = await testEndpoint(test.path);
    if (success) passed++;
  }
  
  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! The application is working correctly locally.');
    console.log('\n🌐 You can now access the application at:');
    console.log('   - Homepage: http://localhost:3000');
    console.log('   - Login: http://localhost:3000/auth/login');
    console.log('   - Dashboard: http://localhost:3000/dashboard');
    console.log('\n✅ Ready for deployment!');
  } else {
    console.log('⚠️  Some tests failed. Please check the application.');
  }
}

runTests().catch(console.error); 