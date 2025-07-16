import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should login and redirect to dashboard successfully', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/auth/login');
    
    // Verify we're on the login page
    await expect(page).toHaveTitle(/PersonaLink/);
    await expect(page.locator('text=Welcome back')).toBeVisible();
    
    // Fill in mock credentials
    await page.fill('input[type="email"]', 'test@personalink.ai');
    await page.fill('input[type="password"]', 'test123');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Verify the mock session cookie is set
    const cookies = await page.context().cookies();
    const mockSessionCookie = cookies.find(cookie => cookie.name === 'mock-session');
    expect(mockSessionCookie).toBeDefined();
    expect(mockSessionCookie?.value).toBe('true');
    
    // Verify localStorage has mock session
    const mockSession = await page.evaluate(() => localStorage.getItem('mock-session'));
    expect(mockSession).toBe('true');
  });

  test('should use test authentication button', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/auth/login');
    
    // Click the test authentication button
    await page.click('text=🧪 Test Authentication');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Verify the mock session cookie is set
    const cookies = await page.context().cookies();
    const mockSessionCookie = cookies.find(cookie => cookie.name === 'mock-session');
    expect(mockSessionCookie).toBeDefined();
    expect(mockSessionCookie?.value).toBe('true');
  });

  test('should redirect authenticated users away from login page', async ({ page }) => {
    // First, login to get authenticated
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'test@personalink.ai');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Now try to access login page again
    await page.goto('http://localhost:3000/auth/login');
    
    // Should be redirected back to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should protect dashboard without authentication', async ({ page }) => {
    // Try to access dashboard without being logged in
    await page.goto('http://localhost:3000/dashboard');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
    
    // Should have redirect parameter
    await expect(page).toHaveURL(/.*redirect=%2Fdashboard/);
  });

  test('should handle logout correctly', async ({ page }) => {
    // First, login
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'test@personalink.ai');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Verify we're authenticated
    const cookies = await page.context().cookies();
    const mockSessionCookie = cookies.find(cookie => cookie.name === 'mock-session');
    expect(mockSessionCookie?.value).toBe('true');
    
    // Find and click logout (assuming there's a logout button/link)
    // This might need to be adjusted based on your dashboard layout
    const logoutButton = page.locator('text=Logout, text=Sign out, [data-testid="logout"]').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Should be redirected to home page
      await expect(page).toHaveURL(/.*\/$/);
      
      // Verify cookies are cleared
      const cookiesAfterLogout = await page.context().cookies();
      const mockSessionCookieAfter = cookiesAfterLogout.find(cookie => cookie.name === 'mock-session');
      expect(mockSessionCookieAfter).toBeUndefined();
    }
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
    
    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });
}); 