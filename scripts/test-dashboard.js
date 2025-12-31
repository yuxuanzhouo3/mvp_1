#!/usr/bin/env node

/**
 * Dashboard Test Script
 * Tests dashboard access with authentication
 */

const http = require('http');

async function testDashboard() {
  console.log('🧪 Testing Dashboard Access\n');
  
  // Helper function to make HTTP requests
  function makeRequest(path, method = 'GET', cookies = []) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: {
          'User-Agent': 'Test-Script/1.0',
          'Cookie': cookies.join('; ')
        }
      };
      
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      });
      
      req.on('error', (err) => {
        reject(err);
      });
      
      req.end();
    });
  }

  try {
    // Test 1: Dashboard without authentication
    console.log('1️⃣ Testing dashboard without auth...');
    const dashboardNoAuth = await makeRequest('/dashboard');
    console.log(`   Status: ${dashboardNoAuth.statusCode}`);
    if (dashboardNoAuth.statusCode === 302) {
      console.log('   ✅ Correctly redirects unauthenticated users');
    } else {
      console.log('   ⚠️  Unexpected response');
    }

    // Test 2: Dashboard with mock session cookie
    console.log('\n2️⃣ Testing dashboard with mock session...');
    const dashboardWithAuth = await makeRequest('/dashboard', 'GET', ['mock-session=true']);
    console.log(`   Status: ${dashboardWithAuth.statusCode}`);
    
    if (dashboardWithAuth.statusCode === 200) {
      console.log('   ✅ Dashboard loads successfully with authentication');
      
      // Check if the response contains dashboard content
      if (dashboardWithAuth.body.includes('dashboard') || 
          dashboardWithAuth.body.includes('Dashboard') ||
          dashboardWithAuth.body.includes('react')) {
        console.log('   ✅ Dashboard content is present');
      } else {
        console.log('   ⚠️  Dashboard content might be missing');
        console.log('   📄 Response preview:', dashboardWithAuth.body.substring(0, 200) + '...');
      }
    } else if (dashboardWithAuth.statusCode === 307) {
      console.log('   ⚠️  Still redirecting - might be a timing issue');
    } else {
      console.log('   ❌ Unexpected response with authentication');
    }

    // Test 3: Check if there are any JavaScript errors
    console.log('\n3️⃣ Checking for JavaScript errors...');
    if (dashboardWithAuth.body.includes('error') || 
        dashboardWithAuth.body.includes('Error') ||
        dashboardWithAuth.body.includes('TypeError')) {
      console.log('   ⚠️  Potential JavaScript errors detected');
    } else {
      console.log('   ✅ No obvious JavaScript errors');
    }

    console.log('\n🎉 Dashboard test completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Open http://localhost:3000/auth/login in your browser');
    console.log('   2. Login with any email/password (mock mode)');
    console.log('   3. You should be redirected to the dashboard');
    console.log('   4. Check browser console for any JavaScript errors');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testDashboard(); 