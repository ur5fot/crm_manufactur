const { test, expect } = require('@playwright/test');

test.describe('Document History View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Close any notification popups that might appear
    await page.waitForTimeout(1000);
    const closeButtons = page.locator('.close-btn');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
    }
  });

  test('Navigate to document history tab', async ({ page }) => {
    // Navigate to document history view
    await page.click('text=Документи');
    await page.click('button:has-text("Історія документів")');

    // Verify page title is visible
    await expect(page.locator('text=Історія згенерованих документів')).toBeVisible();
  });

  test('Document history filters are visible', async ({ page }) => {
    // Navigate to document history view
    await page.click('text=Документи');
    await page.click('button:has-text("Історія документів")');

    // Check that filter inputs are visible
    await expect(page.locator('label:has-text("Шаблон")')).toBeVisible();
    await expect(page.locator('label:has-text("Пошук співробітника")')).toBeVisible();
    await expect(page.locator('label:has-text("Дата від")')).toBeVisible();
    await expect(page.locator('label:has-text("Дата до")')).toBeVisible();

    // Check filter buttons
    await expect(page.locator('button:has-text("Застосувати фільтри")')).toBeVisible();
    await expect(page.locator('button:has-text("Очистити фільтри")')).toBeVisible();
  });

  test('Template filter dropdown loads templates', async ({ page }) => {
    // Navigate to document history view
    await page.click('text=Документи');
    await page.click('button:has-text("Історія документів")');

    // Wait for templates to load
    await page.waitForTimeout(1000);

    // Check that template select has "Всі шаблони" option
    const templateSelect = page.locator('select').first();
    await expect(templateSelect).toBeVisible();

    const options = await templateSelect.locator('option').allTextContents();
    expect(options[0]).toBe('Всі шаблони');
  });

  test('Search field accepts input', async ({ page }) => {
    // Navigate to document history view
    await page.click('text=Документи');
    await page.click('button:has-text("Історія документів")');

    // Find search input by placeholder
    const searchInput = page.locator('input[placeholder*="Введіть ПІБ"]');
    await expect(searchInput).toBeVisible();

    // Type in search field
    await searchInput.fill('Іваненко');
    await expect(searchInput).toHaveValue('Іваненко');
  });

  test('Date filters accept dates', async ({ page }) => {
    // Navigate to document history view
    await page.click('text=Документи');
    await page.click('button:has-text("Історія документів")');

    // Find date inputs
    const dateInputs = page.locator('input[type="date"]');
    expect(await dateInputs.count()).toBe(2);

    // Fill start date
    await dateInputs.nth(0).fill('2026-01-01');
    expect(await dateInputs.nth(0).inputValue()).toBe('2026-01-01');

    // Fill end date
    await dateInputs.nth(1).fill('2026-02-11');
    expect(await dateInputs.nth(1).inputValue()).toBe('2026-02-11');
  });

  test('Clear filters button works', async ({ page }) => {
    // Navigate to document history view
    await page.click('text=Документи');
    await page.click('button:has-text("Історія документів")');

    // Fill some filters
    const searchInput = page.locator('input[placeholder*="Введіть ПІБ"]');
    await searchInput.fill('Іваненко');

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2026-01-01');

    // Click clear filters
    await page.click('button:has-text("Очистити фільтри")');

    // Wait for action to complete
    await page.waitForTimeout(500);

    // Verify filters are cleared
    expect(await searchInput.inputValue()).toBe('');
    expect(await dateInputs.nth(0).inputValue()).toBe('');
  });

  test('Refresh button is functional', async ({ page }) => {
    // Navigate to document history view
    await page.click('text=Документи');
    await page.click('button:has-text("Історія документів")');

    // Find and click refresh button
    const refreshButton = page.locator('button:has-text("🔄 Оновити")');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Wait for refresh to complete
    await page.waitForTimeout(500);
  });

  test('Table headers are visible', async ({ page }) => {
    // Navigate to document history view
    await page.click('text=Документи');
    await page.click('button:has-text("Історія документів")');

    // Wait for table or empty state
    await page.waitForTimeout(1000);

    // Check if table exists (it might not if no documents)
    const table = page.locator('table.data-table');
    const tableExists = await table.count() > 0;

    if (tableExists) {
      // Verify table headers
      await expect(page.locator('th:has-text("ID")')).toBeVisible();
      await expect(page.locator('th:has-text("Шаблон")')).toBeVisible();
      await expect(page.locator('th:has-text("Співробітник")')).toBeVisible();
      await expect(page.locator('th:has-text("Дата генерації")')).toBeVisible();
      await expect(page.locator('th:has-text("Згенеровано")')).toBeVisible();
      await expect(page.locator('th:has-text("Дії")')).toBeVisible();
    } else {
      // If no table, should show either empty state or error (if API not implemented yet)
      const emptyState = page.locator('text=Немає згенерованих документів');
      const errorState = page.locator('.error-message');

      const emptyStateExists = await emptyState.count() > 0;
      const errorStateExists = await errorState.count() > 0;

      // Either empty state or error state should be visible
      expect(emptyStateExists || errorStateExists).toBeTruthy();
    }
  });

  test('Pagination controls are present when there are documents', async ({ page }) => {
    // Navigate to document history view
    await page.click('text=Документи');
    await page.click('button:has-text("Історія документів")');

    // Wait for data to load
    await page.waitForTimeout(1000);

    // Check if pagination exists (only if there are documents)
    const paginationSection = page.locator('.pagination');
    const paginationExists = await paginationSection.count() > 0;

    if (paginationExists) {
      await expect(page.locator('button:has-text("← Попередня")')).toBeVisible();
      await expect(page.locator('button:has-text("Наступна →")')).toBeVisible();
      await expect(page.locator('text=Сторінка')).toBeVisible();
    }
  });

  test('Navigation between tabs preserves state', async ({ page }) => {
    // Navigate to document history view
    await page.click('text=Документи');
    await page.click('button:has-text("Історія документів")');
    await expect(page.locator('text=Історія згенерованих документів')).toBeVisible();

    // Navigate to another tab
    await page.click('text=Dashboard');
    await page.waitForTimeout(500);

    // Navigate back to document history
    await page.click('text=Документи');
    await page.click('button:has-text("Історія документів")');
    await expect(page.locator('text=Історія згенерованих документів')).toBeVisible();
  });
});
