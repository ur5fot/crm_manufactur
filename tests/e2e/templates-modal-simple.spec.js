const { test, expect } = require('@playwright/test');

test.describe('Templates Modal - Simple Tests', () => {
  test('Modal відкривається і закривається', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Close any notification popups
    await page.waitForTimeout(500);
    const closeButtons = page.locator('.close-btn');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
    }

    // Navigate to templates
    await page.click('text=Шаблони');
    await page.waitForTimeout(1000);

    // Open create modal
    await page.click('button:has-text("Новий шаблон")');

    // Verify modal elements exist
    await expect(page.locator('#template-name')).toBeVisible();
    await expect(page.locator('#template-type')).toBeVisible();
    await expect(page.locator('#template-description')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Скасувати")');

    // Modal should be closed
    await expect(page.locator('#template-name')).not.toBeVisible();
  });

  test('Валідація обовязкових полів працює', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Close popups
    await page.waitForTimeout(500);
    const closeButtons = page.locator('.close-btn');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
    }

    await page.click('text=Шаблони');
    await page.waitForTimeout(1000);

    // Open modal
    await page.click('button:has-text("Новий шаблон")');

    // Button should be disabled without required fields
    const createBtn = page.locator('button:has-text("Створити")');
    await expect(createBtn).toBeDisabled();

    // Fill name only
    await page.fill('#template-name', 'Test');
    await expect(createBtn).toBeDisabled();

    // Fill type - button should enable
    await page.selectOption('#template-type', 'Заявка');
    await expect(createBtn).not.toBeDisabled();
  });

  test('Форма правильно заповнюється даними', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Close popups
    await page.waitForTimeout(500);
    const closeButtons = page.locator('.close-btn');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
    }

    await page.click('text=Шаблони');
    await page.waitForTimeout(1000);

    await page.click('button:has-text("Новий шаблон")');

    // Fill all fields
    await page.fill('#template-name', 'Тестова назва');
    await page.selectOption('#template-type', 'Службова записка');
    await page.fill('#template-description', 'Тестовий опис документа');

    // Verify values
    await expect(page.locator('#template-name')).toHaveValue('Тестова назва');
    await expect(page.locator('#template-type')).toHaveValue('Службова записка');
    await expect(page.locator('#template-description')).toHaveValue('Тестовий опис документа');
  });
});
