const { test, expect } = require('@playwright/test');
const { setupTestData, cleanupTestData } = require('../helpers/test-utils');

/**
 * Helper: get last_name values from all visible table rows in order.
 * Finds the "Прізвище" column index, then reads that cell from each row.
 */
async function getColumnValues(page, headerText) {
  const colIndex = await page.evaluate((text) => {
    const headers = Array.from(document.querySelectorAll('thead th'));
    return headers.findIndex(th => th.textContent.includes(text));
  }, headerText);
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  const values = [];
  for (let i = 0; i < count; i++) {
    const cell = rows.nth(i).locator('td').nth(colIndex);
    const text = await cell.textContent();
    values.push(text.trim());
  }
  return values;
}

test.describe('Table Column Sorting', () => {
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

  test('Click column header sorts rows ascending', async ({ page }) => {
    // Record original order of last names
    const originalOrder = await getColumnValues(page, 'Прізвище');
    expect(originalOrder.length).toBeGreaterThanOrEqual(5);

    // Click "Прізвище" header to sort ascending
    const header = page.locator('th:has(.th-label:has-text("Прізвище"))');
    await header.click();
    await page.waitForTimeout(500);

    const ascOrder = await getColumnValues(page, 'Прізвище');

    // Ukrainian alphabetical: Іванов < Коваленко < Мельник < Петренко < Сидоренко
    expect(ascOrder[0]).toBe('Іванов');
    expect(ascOrder[1]).toBe('Коваленко');
    expect(ascOrder[2]).toBe('Мельник');
    expect(ascOrder[3]).toBe('Петренко');
    expect(ascOrder[4]).toBe('Сидоренко');
  });

  test('Click same header again sorts rows descending', async ({ page }) => {
    const header = page.locator('th:has(.th-label:has-text("Прізвище"))');

    // First click: ascending
    await header.click();
    await page.waitForTimeout(300);

    // Second click: descending
    await header.click();
    await page.waitForTimeout(500);

    const descOrder = await getColumnValues(page, 'Прізвище');

    expect(descOrder[0]).toBe('Сидоренко');
    expect(descOrder[1]).toBe('Петренко');
    expect(descOrder[2]).toBe('Мельник');
    expect(descOrder[3]).toBe('Коваленко');
    expect(descOrder[4]).toBe('Іванов');
  });

  test('Click same header third time returns to unsorted order', async ({ page }) => {
    // Record original order before any sorting
    const originalOrder = await getColumnValues(page, 'Прізвище');

    const header = page.locator('th:has(.th-label:has-text("Прізвище"))');

    // Click three times: asc -> desc -> unsorted
    await header.click();
    await page.waitForTimeout(300);
    await header.click();
    await page.waitForTimeout(300);
    await header.click();
    await page.waitForTimeout(500);

    const resetOrder = await getColumnValues(page, 'Прізвище');

    // Should match original CSV order
    expect(resetOrder).toEqual(originalOrder);
  });

  test('Click different column sorts by new column ascending', async ({ page }) => {
    // Sort by Прізвище first
    const lastNameHeader = page.locator('th:has(.th-label:has-text("Прізвище"))');
    await lastNameHeader.click();
    await page.waitForTimeout(300);

    // Now click ID header to switch sorting to ID column
    const idHeader = page.locator('th:has-text("ID")').first();
    await idHeader.click();
    await page.waitForTimeout(500);

    // ID should be sorted ascending: 1, 2, 3, 4, 5
    const idValues = await getColumnValues(page, 'ID');
    for (let i = 0; i < idValues.length - 1; i++) {
      expect(parseInt(idValues[i])).toBeLessThanOrEqual(parseInt(idValues[i + 1]));
    }

    // Sort indicator should NOT be on Прізвище anymore
    const lastNameIndicator = lastNameHeader.locator('.sort-indicator');
    await expect(lastNameIndicator).not.toBeVisible();

    // Sort indicator should be on ID column
    const idIndicator = idHeader.locator('.sort-indicator');
    await expect(idIndicator).toBeVisible();
    await expect(idIndicator).toHaveText('▲');
  });

  test('Sort indicator appears on active column only', async ({ page }) => {
    const lastNameHeader = page.locator('th:has(.th-label:has-text("Прізвище"))');
    const idHeader = page.locator('th:has-text("ID")').first();

    // Initially no indicators
    await expect(lastNameHeader.locator('.sort-indicator')).not.toBeVisible();
    await expect(idHeader.locator('.sort-indicator')).not.toBeVisible();

    // Click Прізвище - ascending indicator
    await lastNameHeader.click();
    await page.waitForTimeout(300);
    await expect(lastNameHeader.locator('.sort-indicator')).toBeVisible();
    await expect(lastNameHeader.locator('.sort-indicator')).toHaveText('▲');
    await expect(idHeader.locator('.sort-indicator')).not.toBeVisible();

    // Click again - descending indicator
    await lastNameHeader.click();
    await page.waitForTimeout(300);
    await expect(lastNameHeader.locator('.sort-indicator')).toBeVisible();
    await expect(lastNameHeader.locator('.sort-indicator')).toHaveText('▼');

    // Click third time - no indicator (unsorted)
    await lastNameHeader.click();
    await page.waitForTimeout(300);
    await expect(lastNameHeader.locator('.sort-indicator')).not.toBeVisible();
  });
});
