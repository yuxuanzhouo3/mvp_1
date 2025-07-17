#!/usr/bin/env node

/**
 * Test Logout/Login Flow
 * This script tests the logout and login flow to ensure no pending state issues
 */

const puppeteer = require('puppeteer');

async function testLogoutLoginFlow() {
  console.log('🧪 Testing Logout/Login Flow...');
  
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
    
    // Login with test credentials
    console.log('🔐 Logging in...');
    await page.fill('input[type="email"]', 'test@personalink.ai');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    console.log('⏳ Waiting for dashboard...');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Successfully logged in and reached dashboard');
    
    // Wait a moment for dashboard to load
    await page.waitForTimeout(2000);
    
    // Check if dashboard is loaded properly
    const dashboardContent = await page.$('h1');
    if (dashboardContent) {
      console.log('✅ Dashboard content is visible');
    } else {
      console.log('❌ Dashboard content not found');
    }
    
    // Find and click logout button
    console.log('🚪 Logging out...');
    const logoutButton = await page.$('button:has-text("退出登录")');
    if (logoutButton) {
      await logoutButton.click();
      console.log('✅ Logout button clicked');
    } else {
      console.log('❌ Logout button not found');
    }
    
    // Wait for redirect to home page
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log('📍 Current URL after logout:', currentUrl);
    
    // Navigate back to login page
    console.log('🔄 Navigating back to login page...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForSelector('input[type="email"]');
    
    // Login again with same credentials
    console.log('🔐 Logging in again...');
    await page.fill('input[type="email"]', 'test@personalink.ai');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard again
    console.log('⏳ Waiting for dashboard after second login...');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Successfully logged in again and reached dashboard');
    
    // Check if dashboard loads properly this time
    await page.waitForTimeout(3000);
    const dashboardContent2 = await page.$('h1');
    if (dashboardContent2) {
      const headingText = await dashboardContent2.textContent();
      console.log('✅ Dashboard loaded successfully after second login:', headingText);
    } else {
      console.log('❌ Dashboard content not found after second login');
    }
    
    // Check for any loading indicators
    const loadingSpinner = await page.$('.animate-spin');
    if (loadingSpinner) {
      console.log('⚠️ Loading spinner still visible - potential issue');
    } else {
      console.log('✅ No loading spinner visible - good');
    }
    
    console.log('🎉 Logout/Login flow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

// Run the test
testLogoutLoginFlow().catch(console.error); 