const { test, expect } = require('@playwright/test');

test.describe('Theme Toggle', () => {
  test('should toggle theme and persist on reload', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173/');

    // Wait for page to load
    await page.waitForSelector('.topbar');

    // Verify theme toggle button exists
    const themeButton = page.locator('.theme-toggle-btn');
    await expect(themeButton).toBeVisible();

    // Get initial theme (should be light by default)
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') || 'light';
    });
    expect(initialTheme).toBe('light');

    // Initial button should show moon emoji (for switching to dark)
    await expect(themeButton).toHaveText('🌙');

    // Click to toggle to dark theme
    await themeButton.click();

    // Wait a bit for transition
    await page.waitForTimeout(100);

    // Verify theme changed to dark
    const darkTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(darkTheme).toBe('dark');

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
    const persistedTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(persistedTheme).toBe('dark');

    // Toggle back to light
    await themeButton.click();
    await page.waitForTimeout(100);

    const lightTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(lightTheme).toBe('light');

    // Verify button shows moon emoji again
    await expect(themeButton).toHaveText('🌙');
  });

  test('should apply correct CSS styles in dark theme', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('.topbar');

    // Get background color in light theme
    const lightBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    });

    // Toggle to dark theme
    const themeButton = page.locator('.theme-toggle-btn');
    await themeButton.click();
    await page.waitForTimeout(100);

    // Get background color in dark theme
    const darkBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    });

    // Verify colors are different
    expect(lightBg).not.toBe(darkBg);

    // Verify dark theme has dark background
    expect(darkBg).toBe('#1a1a1a');
  });
});
