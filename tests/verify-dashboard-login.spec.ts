import { test, expect } from '@playwright/test';

test('Real account login redirects to dashboard', async ({ page }) => {
  // Go to the login page
  await page.goto('http://localhost:3003/auth/login');

  // Fill in email and password
  await page.fill('input[type="email"]', 'mornscience@163.com');
  await page.fill('input[type="password"]', 'Zyx!213416');

  // Click the sign in button
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // Check that dashboard loaded (look for welcome text or profile info)
  await expect(page).toHaveURL(/.*\/dashboard/);
  await expect(page.locator('text=欢迎回来')).toBeVisible();

  // Optionally, check for user email on dashboard
  await expect(page.locator('text=mornscience@163.com')).toBeVisible();
}); 