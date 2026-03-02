const { test, expect } = require('@playwright/test');
const { setupTestData, cleanupTestData } = require('../helpers/test-utils');

test.describe('Table Row Double-Click', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestData();
    await page.goto('/table');
    await page.waitForSelector('.table-container table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Close notification popups
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

  test('Double-click on table row opens employee card in new tab', async ({ page, context }) => {
    // Get the first data row
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Get the employee ID from the first cell
    const idCell = firstRow.locator('td.id-cell');
    const employeeId = await idCell.textContent();

    // Listen for new page (tab) opening
    const pagePromise = context.waitForEvent('page');

    // Double-click the row
    await firstRow.dblclick();

    // Wait for the new tab to open
    const newPage = await pagePromise;
    await newPage.waitForLoadState();

    // Verify the new tab URL contains the cards route with the correct employee ID
    const url = newPage.url();
    expect(url).toContain('/cards/' + employeeId.trim());

    await newPage.close();
  });

  test('Double-click does not navigate in the current tab', async ({ page, context }) => {
    const currentUrl = page.url();

    // Listen for new page (tab) opening
    const pagePromise = context.waitForEvent('page');

    // Double-click the first row
    const firstRow = page.locator('tbody tr').first();
    await firstRow.dblclick();

    const newPage = await pagePromise;
    await newPage.waitForLoadState();

    // Current tab should still be on the table view
    expect(page.url()).toBe(currentUrl);

    await newPage.close();
  });

  test('Table rows have pointer cursor', async ({ page }) => {
    const firstRow = page.locator('tbody tr.table-row').first();
    await expect(firstRow).toBeVisible();

    const cursor = await firstRow.evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('Double-click on different rows opens correct employee cards', async ({ page, context }) => {
    // Double-click second row
    const secondRow = page.locator('tbody tr').nth(1);
    const secondIdCell = secondRow.locator('td.id-cell');
    const secondEmployeeId = (await secondIdCell.textContent()).trim();

    const pagePromise = context.waitForEvent('page');
    await secondRow.dblclick();

    const newPage = await pagePromise;
    await newPage.waitForLoadState();

    expect(newPage.url()).toContain('/cards/' + secondEmployeeId);

    await newPage.close();
  });
});
