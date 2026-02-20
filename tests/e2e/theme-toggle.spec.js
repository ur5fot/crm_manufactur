const { test, expect } = require('@playwright/test');

test.describe('Theme Toggle', () => {
  test.afterEach(async ({ page }) => {
    // Reset theme to light to prevent leaking into subsequent tests
    await page.evaluate(() => localStorage.removeItem('theme'));
  });

  test('should toggle theme and persist on reload', async ({ page }) => {
    // Auto-dismiss dashboard notification overlays whenever they appear
    await page.addLocatorHandler(
      page.locator('.vacation-notification-overlay'),
      async (overlay) => { await overlay.evaluate(el => el.click()); }
    );

    // Navigate to the application
    await page.goto('/');

    // Wait for page to load
    await page.waitForSelector('.topbar');

    // Verify theme toggle button exists
    const themeButton = page.locator('.theme-toggle-btn');
    await expect(themeButton).toBeVisible();

    // Get initial theme (should be light by default)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Initial button should show moon emoji (for switching to dark)
    await expect(themeButton).toHaveText('🌙');

    // Click to toggle to dark theme
    await themeButton.click();

    // Verify theme changed to dark
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Button should now show sun emoji (for switching to light)
    await expect(themeButton).toHaveText('☀️');

    // Verify theme is stored in localStorage
    const storedTheme = await page.evaluate(() => {
      return localStorage.getItem('theme');
    });
    expect(storedTheme).toBe('dark');

    // Reload page
    await page.reload();
    await page.waitForSelector('.topbar');

    // Verify theme persisted after reload
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Toggle back to light
    await themeButton.click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Verify button shows moon emoji again
    await expect(themeButton).toHaveText('🌙');
  });

  test('should apply correct CSS styles in dark theme', async ({ page }) => {
    // Auto-dismiss dashboard notification overlays whenever they appear
    await page.addLocatorHandler(
      page.locator('.vacation-notification-overlay'),
      async (overlay) => { await overlay.evaluate(el => el.click()); }
    );

    await page.goto('/');
    await page.waitForSelector('.topbar');

    // Get background color in light theme
    const lightBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    });

    // Toggle to dark theme
    const themeButton = page.locator('.theme-toggle-btn');
    await themeButton.click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Get background color in dark theme
    const darkBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    });

    // Verify colors are different
    expect(lightBg).not.toBe(darkBg);
  });
});
