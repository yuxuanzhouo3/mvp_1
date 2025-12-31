#!/usr/bin/env node

/**
 * Test Sign-up with New Email
 * This script tests the sign-up process with a new email address
 */

const puppeteer = require('puppeteer');

async function testSignupNewEmail() {
  console.log('🧪 Testing Sign-up with New Email...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 1000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Generate a unique email
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testPassword = 'testpassword123';
    const testName = 'Test User';
    
    console.log('📧 Using test email:', testEmail);
    
    // Navigate to register page
    console.log('📱 Navigating to register page...');
    await page.goto('http://localhost:3000/auth/register');
    await page.waitForSelector('input[type="text"]'); // Full name input
    
    // Fill in registration form
    console.log('📝 Filling registration form...');
    await page.fill('input[type="text"]', testName); // Full name
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.fill('input[type="password"]:nth-of-type(2)', testPassword); // Confirm password
    
    // Submit the form
    console.log('🚀 Submitting registration form...');
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Check for success message
    const successMessage = await page.$('text=Registration successful');
    if (successMessage) {
      console.log('✅ Registration successful message found');
      
      // Check if we need email confirmation
      const confirmationMessage = await page.$('text=Please check your email');
      if (confirmationMessage) {
        console.log('📧 Email confirmation required');
        
        // Check if we're on the email confirmation screen
        const emailSentScreen = await page.$('text=Check your email');
        if (emailSentScreen) {
          console.log('✅ Email confirmation screen displayed correctly');
        } else {
          console.log('❌ Email confirmation screen not found');
        }
      } else {
        console.log('✅ No email confirmation required - user should be redirected');
        
        // Check if we're redirected to dashboard
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        if (currentUrl.includes('/dashboard')) {
          console.log('✅ Successfully redirected to dashboard');
        } else {
          console.log('❌ Not redirected to dashboard, current URL:', currentUrl);
        }
      }
    } else {
      console.log('❌ Registration success message not found');
      
      // Check for error messages
      const errorMessage = await page.$('.text-red-400, .text-red-500');
      if (errorMessage) {
        const errorText = await errorMessage.textContent();
        console.log('❌ Error message found:', errorText);
      }
    }
    
    // Check console for any errors
    const logs = await page.evaluate(() => {
      return window.console.logs || [];
    });
    
    if (logs.length > 0) {
      console.log('📋 Console logs:');
      logs.forEach(log => console.log('  ', log));
    }
    
    console.log('🎉 Sign-up test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

// Run the test
testSignupNewEmail().catch(console.error); 