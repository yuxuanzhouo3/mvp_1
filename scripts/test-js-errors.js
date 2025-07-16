#!/usr/bin/env node

/**
 * JavaScript Error Test Script
 * Tests for client-side JavaScript errors that might cause blank pages
 */

const http = require('http');

async function testJSErrors() {
  console.log('🔍 Testing for JavaScript errors...\n');
  
  // Helper function to make HTTP requests
  function makeRequest(path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: 'GET',
        headers: {
          'User-Agent': 'Test-Script/1.0'
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
    // Test 1: Check homepage
    console.log('1️⃣ Testing homepage...');
    const homeResponse = await makeRequest('/');
    console.log(`   Status: ${homeResponse.statusCode}`);
    
    // Check for common JavaScript error patterns
    const jsErrorPatterns = [
      'TypeError',
      'ReferenceError',
      'SyntaxError',
      'Cannot read property',
      'is not a function',
      'Cannot find module',
      'Hydration error',
      'React error',
      'usePathname only works in Client Components'
    ];
    
    let hasErrors = false;
    jsErrorPatterns.forEach(pattern => {
      if (homeResponse.body.includes(pattern)) {
        console.log(`   ⚠️  Found potential error: ${pattern}`);
        hasErrors = true;
      }
    });
    
    if (!hasErrors) {
      console.log('   ✅ No obvious JavaScript errors found');
    }

    // Test 2: Check login page
    console.log('\n2️⃣ Testing login page...');
    const loginResponse = await makeRequest('/auth/login');
    console.log(`   Status: ${loginResponse.statusCode}`);
    
    hasErrors = false;
    jsErrorPatterns.forEach(pattern => {
      if (loginResponse.body.includes(pattern)) {
        console.log(`   ⚠️  Found potential error: ${pattern}`);
        hasErrors = true;
      }
    });
    
    if (!hasErrors) {
      console.log('   ✅ No obvious JavaScript errors found');
    }

    // Test 3: Check if React is loading properly
    console.log('\n3️⃣ Checking React hydration...');
    const reactPatterns = [
      '__NEXT_DATA__',
      'React',
      'react',
      'hydrate',
      'hydration'
    ];
    
    let reactLoaded = false;
    reactPatterns.forEach(pattern => {
      if (homeResponse.body.includes(pattern)) {
        reactLoaded = true;
      }
    });
    
    if (reactLoaded) {
      console.log('   ✅ React appears to be loading');
    } else {
      console.log('   ⚠️  React might not be loading properly');
    }

    console.log('\n🎉 JavaScript error test completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Open browser DevTools (F12)');
    console.log('   2. Go to Console tab');
    console.log('   3. Look for any red error messages');
    console.log('   4. Refresh the page and check for new errors');
    console.log('   5. Share any error messages you see');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testJSErrors(); 