const { test, expect } = require('@playwright/test');
const { setupTestData, cleanupTestData, waitForEmployeesLoad } = require('../helpers/test-utils');

test.describe('Table View and Filters', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data before each test
    await setupTestData();

    // Navigate to table view
    await page.goto('/table');

    // Wait for table to load (different from employee-list in cards view)
    await page.waitForSelector('.table-container table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Close any notification popups that might appear
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
    // Cleanup test data after each test
    await cleanupTestData();
  });

  test('Отобразить таблицу с сотрудниками', async ({ page }) => {
    // Assert table renders with data
    const table = page.locator('.table-container table');
    await expect(table).toBeVisible();

    // Assert table has header row
    const headerRow = page.locator('thead tr');
    await expect(headerRow).toBeVisible();

    // Assert table has data rows (5 test employees)
    const dataRows = page.locator('tbody tr');
    const rowCount = await dataRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(5);

    // Assert ID column is visible (first column after row number)
    const idHeader = page.locator('th:has-text("ID")');
    await expect(idHeader).toBeVisible();

    // Assert key columns from schema are visible (show_in_table=yes)
    // Прізвище, Ім'я, Статус роботи, Місцезнаходження, Посада
    await expect(page.locator('th:has-text("Прізвище")')).toBeVisible();
    await expect(page.locator('th:has-text("Ім\'я")')).toBeVisible();
    await expect(page.locator('th:has-text("Статус роботи")')).toBeVisible();

    // Assert data cells contain test employee names
    const tableContent = await page.textContent('.table-container');
    expect(tableContent).toContain('Іванов');
    expect(tableContent).toContain('Петренко');
    expect(tableContent).toContain('Сидоренко');
  });

  test('Фильтровать по статусу (multi-select)', async ({ page }) => {
    // Wait for table to be fully loaded
    await page.waitForTimeout(1000);

    // Find employment_status filter column header
    const statusHeaderCell = page.locator('th:has(.th-label:has-text("Статус роботи"))');
    await expect(statusHeaderCell).toBeVisible();

    // Hover over the header to show the filter dropdown
    await statusHeaderCell.hover();
    await page.waitForTimeout(500);

    // Find checkboxes within the filter dropdown
    const vacationLabel = statusHeaderCell.locator('label:has(.filter-checkbox-text:has-text("Відпустка"))');
    await expect(vacationLabel).toBeVisible();

    // Click on the label to check the checkbox
    await vacationLabel.click();
    await page.waitForTimeout(500);

    // Assert table shows only vacation employees (employee 2: Петренко)
    const dataRows = page.locator('tbody tr');
    const rowCount = await dataRows.count();
    expect(rowCount).toBe(1);

    const tableContent = await page.textContent('.table-container');
    expect(tableContent).toContain('Петренко');
    expect(tableContent).not.toContain('Іванов'); // Not in vacation

    // Hover again to show dropdown
    await statusHeaderCell.hover();
    await page.waitForTimeout(300);

    // Now click "(Порожньо)" label as well
    const emptyLabel = statusHeaderCell.locator('label:has(.filter-checkbox-text:has-text("(Порожньо)"))');
    await emptyLabel.click();
    await page.waitForTimeout(500);

    // Assert table now includes employees with empty status + vacation status
    const rowCountWithEmpty = await dataRows.count();
    expect(rowCountWithEmpty).toBeGreaterThanOrEqual(1);

    // Hover again to show dropdown for unchecking
    await statusHeaderCell.hover();
    await page.waitForTimeout(300);

    // Uncheck all to reset - click labels again to toggle off
    await vacationLabel.click();
    await page.waitForTimeout(200);
    await emptyLabel.click();
    await page.waitForTimeout(500);

    // All rows should be visible again
    const finalRowCount = await dataRows.count();
    expect(finalRowCount).toBeGreaterThanOrEqual(5);
  });

  test('Поиск по тексту', async ({ page }) => {
    // Wait for table to be fully loaded
    await page.waitForTimeout(1000);

    // Find search input field - it's type="search", not type="text"
    const searchInput = page.locator('input[type="search"][placeholder*="Пошук"]');
    await expect(searchInput).toBeVisible();

    // Type search term "Іванов"
    await searchInput.fill('Іванов');
    await page.waitForTimeout(500);

    // Assert table filters to matching rows (only employee 1: Іванов)
    const dataRows = page.locator('tbody tr');
    const rowCount = await dataRows.count();
    expect(rowCount).toBe(1);

    const tableContent = await page.textContent('.table-container');
    expect(tableContent).toContain('Іванов');
    expect(tableContent).not.toContain('Петренко');
    expect(tableContent).not.toContain('Сидоренко');

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);

    // All rows should be visible again
    const finalRowCount = await dataRows.count();
    expect(finalRowCount).toBeGreaterThanOrEqual(5);
  });

});
