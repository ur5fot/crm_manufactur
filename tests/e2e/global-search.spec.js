const { test, expect } = require('@playwright/test');
const { setupTestData, cleanupTestData } = require('../helpers/test-utils');

test.describe('Global Search', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestData();
    await page.goto('/');
    // Wait for the page to load
    await page.waitForTimeout(1500);
    // Close any notification popups
    for (let i = 0; i < 5; i++) {
      const closeButton = page.locator('.popup-overlay button:has-text("Зрозуміло"), .vacation-notification-overlay button:has-text("Зрозуміло")').first();
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should display global search input in topbar', async ({ page }) => {
    const searchInput = page.locator('.global-search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Глобальний пошук...');
  });

  test('should show search results dropdown when typing', async ({ page }) => {
    const searchInput = page.locator('.global-search-input');
    const dropdown = page.locator('.global-search-dropdown');

    // Dropdown should not be visible initially
    await expect(dropdown).not.toBeVisible();

    // Type a search term that matches test data
    await searchInput.fill('Іванов');

    // Wait for debounced search to execute
    await page.waitForTimeout(500);

    // Dropdown should appear with results
    await expect(dropdown).toBeVisible();

    // Should show employees group
    const employeeGroup = page.locator('.global-search-group-header:has-text("Співробітники")');
    await expect(employeeGroup).toBeVisible();

    // Should show matching employee
    const resultItem = page.locator('.global-search-item-name:has-text("Іванов")').first();
    await expect(resultItem).toBeVisible();
  });

  test('should navigate to employee card when clicking employee result', async ({ page }) => {
    const searchInput = page.locator('.global-search-input');

    await searchInput.fill('Петренко');
    await page.waitForTimeout(500);

    // Click on the employee result
    const resultItem = page.locator('.global-search-item:has-text("Петренко")').first();
    await expect(resultItem).toBeVisible();
    await resultItem.click();

    // Should navigate to cards view with that employee
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/cards\/\d+/);

    // Search input should be cleared
    await expect(searchInput).toHaveValue('');
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    const searchInput = page.locator('.global-search-input');
    const dropdown = page.locator('.global-search-dropdown');

    await searchInput.fill('Іванов');
    await page.waitForTimeout(500);
    await expect(dropdown).toBeVisible();

    // Click outside the search (on the page body)
    await page.locator('.brand-title').click();
    await page.waitForTimeout(300);

    // Dropdown should close
    await expect(dropdown).not.toBeVisible();
  });

  test('should not show dropdown for short queries', async ({ page }) => {
    const searchInput = page.locator('.global-search-input');
    const dropdown = page.locator('.global-search-dropdown');

    // Type only 1 character (minimum is 2)
    await searchInput.fill('І');
    await page.waitForTimeout(500);

    // Dropdown should not appear
    await expect(dropdown).not.toBeVisible();
  });

  test('should search across employees, showing grouped results', async ({ page }) => {
    const searchInput = page.locator('.global-search-input');

    // Search by department that matches multiple employees
    await searchInput.fill('IT відділ');
    await page.waitForTimeout(500);

    const dropdown = page.locator('.global-search-dropdown');
    await expect(dropdown).toBeVisible();

    // Should find employees in IT department
    const items = page.locator('.global-search-item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
