const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * Dismiss any notification popups on the page
 */
async function dismissNotifications(page) {
  // Wait a bit for notifications to appear
  await page.waitForTimeout(2000);

  // Try to close multiple popups (birthday, vacation, documents, retirement, etc)
  for (let i = 0; i < 10; i++) {
    try {
      const overlay = page.locator('.vacation-notification-overlay').first();
      const isVisible = await overlay.isVisible().catch(() => false);

      if (!isVisible) {
        break;
      }

      const closeButton = overlay.locator('.close-btn').first();
      if (await closeButton.isVisible({ timeout: 500 })) {
        await closeButton.click({ force: true });
        await page.waitForTimeout(500);
      } else {
        // Try clicking overlay to close
        await overlay.click({ force: true });
        await page.waitForTimeout(500);
      }
    } catch (e) {
      console.log('Error dismissing notification:', e.message);
      break;
    }
  }

  // Final wait to ensure all animations complete
  await page.waitForTimeout(500);
}

test.describe('CSV Import', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to import page
    await page.goto('/import');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Close any notification popups
    await dismissNotifications(page);

    await expect(page.locator('.panel-title')).toContainText('Імпорт співробітників з CSV');
  });

  test('Импортировать валидный CSV', async ({ page }) => {
    // Get initial employee count from API
    const initialResponse = await page.request.get('http://localhost:3000/api/employees');
    const initialData = await initialResponse.json();
    const initialCount = initialData.employees.length;

    // Upload valid CSV file with 3 new employees
    const validCsvPath = path.join(__dirname, '../fixtures/import-valid.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(validCsvPath);

    // Verify file selected
    await expect(page.locator('.inline-note', { hasText: 'Файл:' })).toContainText('import-valid.csv');

    // Click Import button
    await page.click('button.primary:has-text("Імпортувати")');

    // Wait for import to complete
    await expect(page.locator('.status-bar')).toBeVisible({ timeout: 10000 });

    // Verify success message shows 3 added employees
    const statusBar = page.locator('.status-bar');
    await expect(statusBar).toContainText('Додано: 3');
    await expect(statusBar).toContainText('Пропущено: 0');

    // Verify no errors
    const errorSection = page.locator('.inline-note', { hasText: 'Помилки' });
    await expect(errorSection).not.toBeVisible();

    // Navigate to table view
    await page.click('.tab-bar button:has-text("Таблиця")');
    await expect(page.locator('.summary-table')).toBeVisible();

    // Verify imported employees appear in table (check for one of them)
    const table = page.locator('.summary-table');
    await expect(table).toContainText('Шевченко');
    await expect(table).toContainText('Тарас');
    await expect(table).toContainText('Франко');
    await expect(table).toContainText('Іван');
    await expect(table).toContainText('Лесі');
    await expect(table).toContainText('Українка');

    // Verify via API that employees were created
    const finalResponse = await page.request.get('http://localhost:3000/api/employees');
    const finalData = await finalResponse.json();
    expect(finalData.employees.length).toBe(initialCount + 3);

    // Verify specific employee data - find all matching employees and check the most recent one
    const shevchenkoList = finalData.employees.filter(e => e.last_name === 'Шевченко' && e.first_name === 'Тарас');
    expect(shevchenkoList.length).toBeGreaterThan(0);

    // Get the most recently added one (highest employee_id)
    const shevchenko = shevchenkoList.sort((a, b) => parseInt(b.employee_id) - parseInt(a.employee_id))[0];
    expect(shevchenko.position).toBe('Інженер');
    expect(shevchenko.employment_status).toBe('Працює');
    expect(shevchenko.notes).toBe('Імпортований співробітник 1');
  });

  test('Импорт с ошибками (invalid data)', async ({ page }) => {
    // Upload invalid CSV file (missing required fields)
    const invalidCsvPath = path.join(__dirname, '../fixtures/import-invalid.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidCsvPath);

    // Verify file selected
    await expect(page.locator('.inline-note', { hasText: 'Файл:' })).toContainText('import-invalid.csv');

    // Click Import button
    await page.click('button.primary:has-text("Імпортувати")');

    // Wait for import to complete
    await expect(page.locator('.status-bar')).toBeVisible({ timeout: 10000 });

    // Verify that no valid employees were added
    const statusBar = page.locator('.status-bar');
    await expect(statusBar).toContainText('Додано: 0');
    await expect(statusBar).toContainText('Пропущено: 2');

    // Verify errors are displayed
    await expect(page.locator('.inline-note', { hasText: 'Помилки' })).toBeVisible();

    // Check specific error messages
    // Note: Only 1 error is logged because the completely empty row is silently skipped (hasAnyValue=false)
    const errorRows = page.locator('.error-row');
    await expect(errorRows).toHaveCount(1);

    // Verify error details (row number and reason)
    const firstError = errorRows.first();
    await expect(firstError).toContainText('Рядок 3');  // Row 3 has last_name but no first_name
    await expect(firstError).toContainText('Не указаны имя и фамилия');
  });

  test('Скачать шаблон CSV', async ({ page }) => {
    // Click template download link
    const downloadPromise = page.waitForEvent('download');
    await page.click('a.file-link:has-text("Завантажити шаблон")');
    const download = await downloadPromise;

    // Verify download occurred
    expect(download.suggestedFilename()).toBe('employees_import_sample.csv');

    // Save file temporarily to verify structure
    const tempPath = path.join(__dirname, '../fixtures/downloaded-template.csv');
    await download.saveAs(tempPath);

    // Read file and verify structure
    const content = fs.readFileSync(tempPath, 'utf8');

    // Verify UTF-8 BOM
    expect(content.charCodeAt(0)).toBe(0xFEFF);

    // Verify header row contains expected columns
    const lines = content.split('\n');
    const header = lines[0].replace(/^\uFEFF/, ''); // Remove BOM for comparison
    expect(header).toContain('employee_id');
    expect(header).toContain('last_name');
    expect(header).toContain('first_name');
    expect(header).toContain('employment_status');

    // Verify semicolon delimiter
    expect(header.split(';').length).toBeGreaterThan(10);

    // Cleanup temp file
    fs.unlinkSync(tempPath);
  });

  test('Очистка формы импорта после ошибки', async ({ page }) => {
    // Upload a file
    const validCsvPath = path.join(__dirname, '../fixtures/import-valid.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(validCsvPath);

    // Verify file selected
    await expect(page.locator('.inline-note', { hasText: 'Файл:' })).toContainText('import-valid.csv');

    // Click Import button
    await page.click('button.primary:has-text("Імпортувати")');

    // Wait for import to complete
    await expect(page.locator('.status-bar')).toBeVisible({ timeout: 10000 });

    // Click Clear button
    await page.click('button.secondary:has-text("Очистити")');

    // Verify form is cleared
    await expect(page.locator('.inline-note', { hasText: 'Файл:' })).not.toBeVisible();
    await expect(page.locator('.status-bar')).not.toBeVisible();

    // Verify Import button is disabled (no file selected)
    const importButton = page.locator('button.primary:has-text("Імпортувати")');
    await expect(importButton).toBeDisabled();
  });
});
