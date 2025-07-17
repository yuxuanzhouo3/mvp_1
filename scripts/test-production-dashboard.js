const puppeteer = require('puppeteer');

const accounts = [
  { email: 'yzcmf94@gmail.com', password: '11111111' },
  { email: 'chengyou_science@163.com', password: '11111111' },
  { email: 'hu0112174@student.humphreys.edu', password: '11111111' },
];

async function testAccountLogin(email, password) {
  console.log(`\n🔐 Testing login for: ${email}`);
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  try {
    await page.goto('https://mornhub.lat/auth/login', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Check for login form
    const emailInput = await page.$('input[type="email"]');
    if (!emailInput) {
      console.log('❌ Login form not found, skipping this account');
      await browser.close();
      return;
    }
    // Fill in email and password
    await page.type('input[type="email"]', email, { delay: 50 });
    await page.type('input[type="password"]', password, { delay: 50 });
    // Click login button
    const loginBtn = await page.$('button[type="submit"]');
    if (loginBtn) {
      await loginBtn.click();
      console.log('➡️ Submitted login form');
    } else {
      console.log('❌ Login button not found');
      await browser.close();
      return;
    }
    // Wait for navigation or dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 3000));
    const url = page.url();
    if (url.includes('/dashboard')) {
      console.log('✅ Login successful, on dashboard');
      // Wait for dashboard to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      const loadingSpinner = await page.$('.animate-spin');
      if (loadingSpinner) {
        console.log('⚠️ Loading spinner visible - dashboard still loading');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      const spinnerStillVisible = await page.$('.animate-spin');
      if (spinnerStillVisible) {
        console.log('❌ Loading spinner still visible after 6 seconds');
      } else {
        console.log('✅ Dashboard loaded, no spinner');
      }
      await page.screenshot({ path: `dashboard-${email.replace(/[@.]/g, '_')}.png` });
      console.log(`📸 Screenshot saved: dashboard-${email.replace(/[@.]/g, '_')}.png`);
      // Try to logout
      const buttons = await page.$$('button');
      let foundLogout = false;
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('退出登录')) {
          await btn.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log('🚪 Logged out');
          foundLogout = true;
          break;
        }
      }
      if (!foundLogout) {
        console.log('⚠️ Logout button not found');
      }
    } else if (url.includes('/auth/login')) {
      // Check for error message
      const errorMsg = await page.$eval('form', form => form.textContent || '').catch(() => '');
      if (errorMsg && errorMsg.toLowerCase().includes('error')) {
        console.log('❌ Login failed, error message shown');
      } else {
        console.log('❌ Login failed, still on login page');
      }
    } else {
      console.log('❌ Unexpected URL after login:', url);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

async function testProductionDashboard() {
  console.log('🧪 Testing Production Dashboard with multiple accounts (new browser per account)...');
  console.log('─'.repeat(60));
  for (const { email, password } of accounts) {
    await testAccountLogin(email, password);
  }
}

testProductionDashboard().then(() => {
  console.log('🏁 Test completed');
}).catch(error => {
  console.error('💥 Test error:', error);
}); 