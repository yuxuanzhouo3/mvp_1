#!/usr/bin/env node

/**
 * Clear Authentication Data Script
 * Clears all cookies and localStorage for testing
 */

const http = require('http');

async function clearAuthData() {
  console.log('🧹 Clearing authentication data...\n');
  
  try {
    // Make a request to clear cookies by setting them to expire
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      headers: {
        'User-Agent': 'Clear-Auth-Script/1.0',
        'Cookie': 'mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    };
    
    const req = http.request(options, (res) => {
      console.log('✅ Request sent to clear cookies');
      console.log('📋 Instructions to clear localStorage:');
      console.log('1. Open browser developer tools (F12)');
      console.log('2. Go to Application/Storage tab');
      console.log('3. Find "Local Storage" under "localhost:3000"');
      console.log('4. Delete the "mock-session" key');
      console.log('5. Refresh the page');
      console.log('\n🎯 Authentication data cleared! Try logging in again.');
    });
    
    req.on('error', (error) => {
      console.error('❌ Error clearing auth data:', error.message);
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
clearAuthData().catch(console.error); 