#!/usr/bin/env node

/**
 * Authentication Flow Test Script
 * Tests the login, Google sign-in, and dashboard access
 */

const puppeteer = require('puppeteer');

async function testAuthFlow() {
  console.log('🧪 Starting authentication flow test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 1000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to login page
    console.log('📱 Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForSelector('input[type="email"]');
    
    // Test email login
    console.log('🔐 Testing email login...');
    await page.type('input[type="email"]', 'test@personalink.ai');
    await page.type('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForNavigation({ timeout: 10000 });
    
    // Check if we're on dashboard
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Email login successful - redirected to dashboard');
    } else {
      console.log('❌ Email login failed - not on dashboard');
    }
    
    // Go back to login and test Google sign-in
    console.log('🔄 Testing Google sign-in...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForSelector('button:has-text("Continue with Google")');
    await page.click('button:has-text("Continue with Google")');
    
    // Wait for redirect to dashboard
    await page.waitForNavigation({ timeout: 10000 });
    
    // Check if we're on dashboard
    const googleUrl = page.url();
    if (googleUrl.includes('/dashboard')) {
      console.log('✅ Google sign-in successful - redirected to dashboard');
    } else {
      console.log('❌ Google sign-in failed - not on dashboard');
    }
    
    // Test phone login
    console.log('📱 Testing phone login...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForSelector('[data-value="phone"]');
    await page.click('[data-value="phone"]');
    
    await page.waitForSelector('input[placeholder*="phone"]');
    await page.type('input[placeholder*="phone"]', '1234567890');
    await page.click('button:has-text("Send verification code")');
    
    await page.waitForSelector('input[placeholder*="code"]');
    await page.type('input[placeholder*="code"]', '123456');
    await page.click('button:has-text("Verify code")');
    
    // Wait for redirect to dashboard
    await page.waitForNavigation({ timeout: 10000 });
    
    // Check if we're on dashboard
    const phoneUrl = page.url();
    if (phoneUrl.includes('/dashboard')) {
      console.log('✅ Phone login successful - redirected to dashboard');
    } else {
      console.log('❌ Phone login failed - not on dashboard');
    }
    
    console.log('🎉 All authentication tests completed!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testAuthFlow().catch(console.error); 