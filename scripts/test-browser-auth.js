#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testBrowserAuth() {
  console.log('🌐 Testing browser authentication flow...\n');

  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    // Go to login page
    console.log('📱 Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle0' });
    
    // Wait for page to load
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill in credentials
    console.log('🔐 Filling in credentials...');
    await page.type('input[type="email"]', 'mornscience@163.com');
    await page.type('input[type="password"]', 'Zyx!213416');
    
    // Click sign in button
    console.log('🚀 Clicking sign in...');
    await page.click('button[type="submit"]');
    
    // Wait for success message
    console.log('⏳ Waiting for success message...');
    await page.waitForSelector('[data-testid="toast-success"]', { timeout: 10000 });
    
    console.log('✅ Success message appeared!');
    
    // Wait for redirect
    console.log('⏳ Waiting for redirect...');
    await page.waitForTimeout(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('🎉 Successfully redirected to dashboard!');
    } else {
      console.log('❌ Still on login page, checking for errors...');
      
      // Check for any error messages
      const errors = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('[data-testid="toast-error"]');
        return Array.from(errorElements).map(el => el.textContent);
      });
      
      if (errors.length > 0) {
        console.log('❌ Errors found:', errors);
      }
      
      // Check localStorage
      const localStorage = await page.evaluate(() => {
        return {
          mockSession: localStorage.getItem('mock-session'),
          mockModeOverride: localStorage.getItem('mock-mode-override'),
          user: localStorage.getItem('user')
        };
      });
      
      console.log('💾 localStorage:', localStorage);
      
      // Check cookies
      const cookies = await page.cookies();
      console.log('🍪 Cookies:', cookies.map(c => ({ name: c.name, value: c.value })));
    }
    
    // Wait a bit more to see if redirect happens
    await page.waitForTimeout(5000);
    
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Check if puppeteer is installed
try {
  require('puppeteer');
  testBrowserAuth();
} catch (error) {
  console.log('📦 Installing puppeteer for browser testing...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install puppeteer', { stdio: 'inherit' });
    console.log('✅ Puppeteer installed, running test...');
    testBrowserAuth();
  } catch (installError) {
    console.error('❌ Failed to install puppeteer:', installError.message);
    console.log('💡 Manual testing required - please check browser console for errors');
  }
} 