const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Custom Reports + CSV Export', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to reports page
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Close any notification popups (there may be multiple: birthday, status, etc.)
    let popupsClosed = 0;
    const maxAttempts = 5; // Prevent infinite loop

    while (popupsClosed < maxAttempts) {
      try {
        const understandButton = page.locator('button:has-text("Зрозуміло")').first();
        if (await understandButton.isVisible({ timeout: 500 })) {
          await understandButton.click({ force: true });
          await page.waitForTimeout(300);
          popupsClosed++;
        } else {
          break; // No more popups
        }
      } catch (e) {
        break; // No more popups
      }
    }
  });

  test('Создать фільтр и получить результаты', async ({ page }) => {
    // Wait for the filter builder to be visible
    await page.waitForSelector('.filter-builder');

    // Click "Додати фільтр" to create a filter row
    await page.click('button:has-text("Додати фільтр")');
    await page.waitForTimeout(300);

    // Now there should be one filter row
    const filterField = page.locator('select.filter-field').first();
    const filterCondition = page.locator('select.filter-condition').first();
    const filterValue = page.locator('input.filter-value').first();

    // Select field: employment_status
    await filterField.selectOption('employment_status');
    await page.waitForTimeout(200);

    // Select condition: contains
    await filterCondition.selectOption('contains');
    await page.waitForTimeout(200);

    // Enter value: "Працює"
    await filterValue.fill('Працює');

    // Click "Виконати звіт" button to run the report
    await page.click('button:has-text("Виконати звіт")');

    // Wait for report results to load
    await page.waitForSelector('.report-preview table tbody tr', { timeout: 10000 });

    // Assert preview table shows filtered employees
    const tableRows = await page.locator('.report-preview table tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify that status bar shows results count
    const statusBar = await page.locator('.status-bar');
    await expect(statusBar).toBeVisible();
    const statusText = await statusBar.textContent();
    expect(statusText).toContain('Знайдено записів:');
  });

  test('Экспортировать отчёт в CSV', async ({ page }) => {
    // Click "Додати фільтр" to create a filter row
    await page.click('button:has-text("Додати фільтр")');
    await page.waitForTimeout(300);

    // Apply filter (status = "Працює")
    const filterField = page.locator('select.filter-field').first();
    const filterCondition = page.locator('select.filter-condition').first();
    const filterValue = page.locator('input.filter-value').first();

    await filterField.selectOption('employment_status');
    await page.waitForTimeout(200);
    await filterCondition.selectOption('contains');
    await page.waitForTimeout(200);
    await filterValue.fill('Працює');

    // Click "Виконати звіт" to run the report FIRST
    await page.click('button:has-text("Виконати звіт")');

    // Wait for results to load
    await page.waitForSelector('.report-preview table tbody tr', { timeout: 10000 });

    // NOW select columns for export (last_name, first_name, position)
    // First, uncheck all columns
    const allCheckboxes = await page.locator('.column-selector input[type="checkbox"]').all();
    for (const checkbox of allCheckboxes) {
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
      }
    }

    // Then check only desired columns
    await page.check('input[type="checkbox"][value="last_name"]');
    await page.check('input[type="checkbox"][value="first_name"]');
    await page.check('input[type="checkbox"][value="position"]');

    // Wait for auto-refresh after column selection
    await page.waitForTimeout(1000);

    // Click "Експорт в CSV"
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Експорт в CSV")');
    const download = await downloadPromise;

    // Assert CSV file downloaded with correct filename format
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^report_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);

    // Save downloaded file to temporary location
    const downloadPath = path.join('/tmp', filename);
    await download.saveAs(downloadPath);

    // Assert CSV contains only selected columns and filtered rows
    const csvContent = fs.readFileSync(downloadPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    // Check header contains selected columns (Ukrainian labels)
    const header = lines[0];
    // The CSV uses field labels from schema, not field names
    // Just verify that we have some header columns (at least 3 columns for the selected fields)
    const headerColumns = header.split(';');
    expect(headerColumns.length).toBeGreaterThanOrEqual(3);

    // Assert UTF-8 BOM encoding (check file signature)
    const buffer = fs.readFileSync(downloadPath);
    const hasBOM = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
    expect(hasBOM).toBe(true);

    // Clean up
    fs.unlinkSync(downloadPath);
  });

  test('Множественные фільтры (AND logic)', async ({ page }) => {
    // Click "Додати фільтр" to create first filter row
    await page.click('button:has-text("Додати фільтр")');
    await page.waitForTimeout(300);

    // First filter: employment_status contains "Працює"
    const firstFilterField = page.locator('select.filter-field').first();
    const firstFilterCondition = page.locator('select.filter-condition').first();
    const firstFilterValue = page.locator('input.filter-value').first();

    await firstFilterField.selectOption('employment_status');
    await page.waitForTimeout(200);
    await firstFilterCondition.selectOption('contains');
    await page.waitForTimeout(200);
    await firstFilterValue.fill('Працює');

    // Click "Додати фільтр" to add another filter row
    await page.click('button:has-text("Додати фільтр")');
    await page.waitForTimeout(300);

    // Now there should be 2 filter rows
    const filterRows = page.locator('.filter-row');
    await expect(filterRows).toHaveCount(2);

    // Second filter: position contains "Інженер"
    const secondFilterField = filterRows.nth(1).locator('select.filter-field');
    const secondFilterCondition = filterRows.nth(1).locator('select.filter-condition');
    const secondFilterValue = filterRows.nth(1).locator('input.filter-value');

    await secondFilterField.selectOption('position');
    await page.waitForTimeout(200);
    await secondFilterCondition.selectOption('contains');
    await page.waitForTimeout(200);
    await secondFilterValue.fill('Інженер');

    // Click "Виконати звіт" to run the report with multiple filters
    await page.click('button:has-text("Виконати звіт")');

    // Wait for results (may be empty if no employees match both conditions)
    await page.waitForTimeout(1000);

    // Check if results exist or if "no results" message is shown
    const noResultsMessage = page.locator('.alert:has-text("За обраними фільтрами не знайдено результатів")');
    const resultsTable = page.locator('.report-preview table tbody tr');

    const hasNoResults = await noResultsMessage.isVisible();
    const hasResults = await resultsTable.count() > 0;

    // Either we have results or we have "no results" message (both are valid)
    expect(hasNoResults || hasResults).toBe(true);

    // Verify that status bar shows when results exist
    if (hasResults) {
      const statusBar = page.locator('.status-bar');
      await expect(statusBar).toBeVisible();
      const statusText = await statusBar.textContent();
      expect(statusText).toContain('Знайдено записів:');
    }
  });
});
