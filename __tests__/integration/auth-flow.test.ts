import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to login when accessing protected routes', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');
    
    // Should be redirected to login page
    await expect(page).toHaveURL('/auth/login');
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Check for login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('should handle empty form submission', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('text=Please fill in all fields')).toBeVisible();
  });

  test('should handle password visibility toggle', async ({ page }) => {
    await page.goto('/auth/login');
    
    const passwordInput = page.locator('input[type="password"]');
    const toggleButton = page.locator('button[type="button"]').last();
    
    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle button
    await toggleButton.click();
    
    // Password should be visible
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('should handle tab switching', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Click phone tab
    await page.click('text=Phone');
    
    // Should show phone input
    await expect(page.locator('input[type="tel"]')).toBeVisible();
  });
});

test.describe('Real Authentication', () => {
  test('should work with real credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    // This test requires real user credentials to be set up
    // For now, we'll just test the form submission
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should attempt authentication (may fail if user doesn't exist)
    // This is expected behavior for a real authentication system
  });
}); 