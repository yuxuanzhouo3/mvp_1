const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const ACCOUNTS = [
  { email: 'zyx18870661556@163.com', password: 'Zyx!213416', name: 'Account 1' },
  { email: 'yzcmf94@gmail.com', password: '11111111', name: 'Account 2' },
  { email: 'chengyou_science@163.com', password: '11111111', name: 'Account 3' },
];

async function loginAndShow(account) {
  // Launch a new browser instance for each account
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  console.log(`\n[${account.name}] Navigated to ${BASE_URL}`);

  // Click "Sign In" button (top right)
  await page.waitForSelector('a[href="/auth/login"]', { timeout: 10000 });
  await page.click('a[href="/auth/login"]');
  console.log(`[${account.name}] Clicked Sign In`);

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', account.email, { delay: 50 });
  await page.type('input[type="password"]', account.password, { delay: 50 });

  // Click submit/login button
  const loginBtn = await page.$('button[type="submit"]');
  if (loginBtn) {
    await loginBtn.click();
    console.log(`[${account.name}] Submitted login form`);
  } else {
    console.log(`[${account.name}] Login button not found!`);
    await browser.close();
    return;
  }

  // Wait for dashboard or landing page (look for email in header)
  try {
    await page.waitForFunction(
      (email) => {
        return Array.from(document.querySelectorAll('span')).some(el => el.textContent && el.textContent.includes(email));
      },
      { timeout: 15000 },
      account.email
    );
    console.log(`[${account.name}] Login successful, email found in header!`);
  } catch (e) {
    console.log(`[${account.name}] Login may have failed or email not found in header.`);
  }

  // Keep the page open for 20 seconds
  console.log(`[${account.name}] Keeping page open for 20 seconds...`);
  await new Promise(res => setTimeout(res, 20000));
  await browser.close();
  console.log(`[${account.name}] Closed browser.`);
}

(async () => {
  for (const account of ACCOUNTS) {
    await loginAndShow(account);
  }
  console.log('✅ All accounts processed.');
})(); 