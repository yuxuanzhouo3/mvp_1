import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should login and redirect to dashboard without loops', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Wait for page to load
    await page.waitForSelector('input[type="email"]');
    
    // Fill in mock credentials
    await page.fill('input[type="email"]', 'test@personalink.ai');
    await page.fill('input[type="password"]', 'test123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Verify we're on dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify dashboard content is loaded
    await expect(page.locator('h1')).toContainText('欢迎回来');
    
    // Check that we don't get redirected back to login
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL('/dashboard');
    
    // Verify no console errors about redirects
    const consoleLogs = await page.evaluate(() => {
      return (window as any).consoleLogs || [];
    });
    
    const redirectLogs = consoleLogs.filter((log: string) => 
      log.includes('redirecting') || log.includes('Router.push') || log.includes('Router.replace')
    );
    
    // Should have only one redirect log (the initial one)
    expect(redirectLogs.length).toBeLessThanOrEqual(2);
  });

  test('should handle unauthenticated access to dashboard', async ({ page }) => {
    // Try to access dashboard directly without authentication
    await page.goto('/dashboard');
    
    // Should redirect to login
    await page.waitForURL('/auth/login', { timeout: 10000 });
    await expect(page).toHaveURL('/auth/login');
  });

  test('should maintain session after page refresh', async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@personalink.ai');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('/dashboard');
    
    // Refresh the page
    await page.reload();
    
    // Should still be on dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL('/dashboard');
  });

  test('should logout and redirect to home', async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@personalink.ai');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('/dashboard');
    
    // Click logout
    await page.click('text=退出登录');
    
    // Should redirect to home page
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page).toHaveURL('/');
  });

  test('should show loading skeleton during auth state transition', async ({ page }) => {
    // Navigate to dashboard directly
    await page.goto('/dashboard');
    
    // Should see loading skeleton briefly
    await expect(page.locator('.animate-pulse')).toBeVisible();
    
    // Then redirect to login
    await page.waitForURL('/auth/login', { timeout: 10000 });
  });
});

test.describe('Mock Authentication', () => {
  test('should work with mock credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Test various mock credentials
    const testCredentials = [
      { email: 'test@personalink.ai', password: 'test123' },
      { email: 'user@example.com', password: 'password123' },
      { email: 'mock@test.com', password: 'mockpass' }
    ];
    
    for (const creds of testCredentials) {
      await page.fill('input[type="email"]', creds.email);
      await page.fill('input[type="password"]', creds.password);
      await page.click('button[type="submit"]');
      
      // Should redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 });
      await expect(page).toHaveURL('/dashboard');
      
      // Logout for next test
      await page.click('text=退出登录');
      await page.waitForURL('/');
      await page.goto('/auth/login');
    }
  });
}); 