const { test, expect } = require('@playwright/test');

const API_URL = 'http://localhost:3000/api';

test.describe('General Templates - is_general flag', () => {
  // Clean up test templates after tests
  let createdTemplateIds = [];

  test.afterAll(async ({ request }) => {
    for (const id of createdTemplateIds) {
      await request.delete(`${API_URL}/templates/${id}`).catch(() => {});
    }
  });

  test('Create template with is_general checkbox checked -> API returns is_general: yes', async ({ page, request }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Close notification popups
    const closeButtons = page.locator('.close-btn');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
    }

    // Navigate to documents -> templates tab
    await page.click('text=Документи');
    await page.click('button:has-text("Шаблони")');
    await expect(page.locator('text=Шаблони документів')).toBeVisible();

    // Click "Новий шаблон"
    await page.click('button:has-text("Новий шаблон")');
    await expect(page.locator('.vacation-notification-modal h3:has-text("Новий шаблон")')).toBeVisible();

    const timestamp = Date.now();
    const templateName = `E2E General ${timestamp}`;

    // Fill form
    await page.fill('#template-name', templateName);
    await page.selectOption('#template-type', 'Інше');

    // Check the is_general checkbox
    const checkbox = page.locator('input[type="checkbox"]').filter({ has: page.locator('..', { hasText: 'Загальний шаблон' }) });
    // The checkbox is inside a label, click the label text
    await page.locator('label.checkbox-label:has-text("Загальний шаблон")').click();

    // Handle alert
    const dialogPromise = page.waitForEvent('dialog');
    await page.click('button:has-text("Створити")');
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('успішно');
    await dialog.accept();

    // Verify via API that the template has is_general: 'yes'
    const response = await request.get(`${API_URL}/templates`);
    const data = await response.json();
    const created = data.templates.find(t => t.template_name === templateName);
    expect(created).toBeTruthy();
    expect(created.is_general).toBe('yes');
    createdTemplateIds.push(created.template_id);
  });

  test('Create regular template without checkbox -> is_general: no', async ({ page, request }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Close notification popups
    const closeButtons = page.locator('.close-btn');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
    }

    // Navigate to documents -> templates tab
    await page.click('text=Документи');
    await page.click('button:has-text("Шаблони")');
    await expect(page.locator('text=Шаблони документів')).toBeVisible();

    // Click "Новий шаблон"
    await page.click('button:has-text("Новий шаблон")');
    await expect(page.locator('.vacation-notification-modal h3:has-text("Новий шаблон")')).toBeVisible();

    const timestamp = Date.now();
    const templateName = `E2E Regular ${timestamp}`;

    // Fill form WITHOUT checking is_general
    await page.fill('#template-name', templateName);
    await page.selectOption('#template-type', 'Заявка');

    // Handle alert
    const dialogPromise = page.waitForEvent('dialog');
    await page.click('button:has-text("Створити")');
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('успішно');
    await dialog.accept();

    // Verify via API that the template has is_general: 'no'
    const response = await request.get(`${API_URL}/templates`);
    const data = await response.json();
    const created = data.templates.find(t => t.template_name === templateName);
    expect(created).toBeTruthy();
    expect(created.is_general).toBe('no');
    createdTemplateIds.push(created.template_id);
  });

  test('General template shows badge in templates table', async ({ page, request }) => {
    // First create a general template via API
    const timestamp = Date.now();
    const templateName = `E2E Badge ${timestamp}`;
    const createResp = await request.post(`${API_URL}/templates`, {
      data: { template_name: templateName, template_type: 'Інше', is_general: 'yes' }
    });
    const createData = await createResp.json();
    createdTemplateIds.push(createData.template.template_id);

    // Navigate to templates
    await page.goto('/');
    await page.waitForTimeout(1000);
    const closeButtons = page.locator('.close-btn');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
    }

    await page.click('text=Документи');
    await page.click('button:has-text("Шаблони")');
    await expect(page.locator('text=Шаблони документів')).toBeVisible();

    // Check that badge is visible next to the general template name
    const row = page.locator(`tr:has-text("${templateName}")`);
    await expect(row).toBeVisible();
    await expect(row.locator('.general-badge')).toBeVisible();
    await expect(row.locator('.general-badge')).toHaveText('Загальний');
  });
});
