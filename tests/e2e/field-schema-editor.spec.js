const { test, expect } = require('@playwright/test');

test.describe('Field Schema Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Close any notification popups
    await page.waitForTimeout(1000);
    const closeButtons = page.locator('.close-btn');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
    }
  });

  test('Завантажити схему полів та перевірити відображення', async ({ page }) => {
    // Navigate to System Settings > Схема полів tab
    await page.goto('/system-settings');
    await page.click('button:has-text("Схема полів")');

    // Wait for schema table to load
    await expect(page.locator('.schema-table')).toBeVisible({ timeout: 10000 });

    // Verify table has rows
    const rows = page.locator('.schema-table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify field_id column has values (e.g. f_last_name)
    const firstIdCell = page.locator('.schema-table tbody tr:first-child .col-id code');
    await expect(firstIdCell).toBeVisible();
    const idText = await firstIdCell.textContent();
    expect(idText).toMatch(/^f_/);

    // Verify role badges exist for key fields
    const roleBadges = page.locator('.role-badge');
    const badgeCount = await roleBadges.count();
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('Перейменувати field_label, зберегти, перевірити зміну', async ({ page, request }) => {
    // Load current schema to get a field to rename
    const schemaResp = await request.get('http://localhost:3000/api/fields-schema/details');
    expect(schemaResp.ok()).toBeTruthy();
    const schemaData = await schemaResp.json();
    const allFields = schemaData.fields;

    // Find a non-role field to safely rename label
    const targetField = allFields.find(f => !f.role && f.field_type === 'text' && f.field_name !== 'employee_id');
    if (!targetField) {
      test.skip();
      return;
    }

    const originalLabel = targetField.field_label;
    const testLabel = `Тест_${Date.now()}`;

    // Navigate to schema editor
    await page.goto('/system-settings');
    await page.click('button:has-text("Схема полів")');
    await expect(page.locator('.schema-table')).toBeVisible({ timeout: 10000 });

    // Find the row with our target field_id and edit label
    const targetRow = page.locator(`.schema-table tbody tr`).filter({ has: page.locator(`code:has-text("${targetField.field_id}")`) });
    await expect(targetRow).toBeVisible();

    const labelInput = targetRow.locator('.col-label input');
    await labelInput.fill(testLabel);

    // Save (no rename, just label change - no preview needed)
    await page.click('button:has-text("Зберегти")');

    // Wait for success message
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });

    // Verify via API that the label changed
    const verifyResp = await request.get('http://localhost:3000/api/fields-schema/details');
    const verifyData = await verifyResp.json();
    const updated = verifyData.fields.find(f => f.field_id === targetField.field_id);
    expect(updated.field_label).toBe(testLabel);

    // Restore original label
    await page.goto('/system-settings');
    await page.click('button:has-text("Схема полів")');
    await expect(page.locator('.schema-table')).toBeVisible({ timeout: 10000 });

    const restoreRow = page.locator(`.schema-table tbody tr`).filter({ has: page.locator(`code:has-text("${targetField.field_id}")`) });
    const restoreLabelInput = restoreRow.locator('.col-label input');
    await restoreLabelInput.fill(originalLabel);
    await page.click('button:has-text("Зберегти")');
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
  });

  test('Скасування змін повертає початковий стан', async ({ page }) => {
    await page.goto('/system-settings');
    await page.click('button:has-text("Схема полів")');
    await expect(page.locator('.schema-table')).toBeVisible({ timeout: 10000 });

    // Get the first label value
    const firstLabelInput = page.locator('.schema-table tbody tr:first-child .col-label input');
    const originalLabel = await firstLabelInput.inputValue();

    // Change it
    await firstLabelInput.fill('TEMP_CHANGE_VALUE');

    // Cancel button should now be enabled
    const cancelBtn = page.locator('button:has-text("Скасувати")');
    await expect(cancelBtn).toBeEnabled();
    await cancelBtn.click();

    // Verify value reverted
    const revertedLabel = await firstLabelInput.inputValue();
    expect(revertedLabel).toBe(originalLabel);
  });

  test('Не можна видалити поле з роллю', async ({ page }) => {
    await page.goto('/system-settings');
    await page.click('button:has-text("Схема полів")');
    await expect(page.locator('.schema-table')).toBeVisible({ timeout: 10000 });

    // Role fields should NOT have a delete button
    const roleRow = page.locator('.schema-table tbody tr').filter({ has: page.locator('.role-badge') }).first();
    await expect(roleRow).toBeVisible();

    // Verify no delete button in this row
    const deleteBtn = roleRow.locator('.col-actions .btn-danger');
    await expect(deleteBtn).not.toBeVisible();
  });

  test('Не можна встановити дублікат field_name', async ({ page, request }) => {
    // Load current schema
    const schemaResp = await request.get('http://localhost:3000/api/fields-schema/details');
    const schemaData = await schemaResp.json();
    const allFields = schemaData.fields;

    // We need at least 2 fields
    if (allFields.length < 2) {
      test.skip();
      return;
    }

    const duplicateName = allFields[0].field_name;

    await page.goto('/system-settings');
    await page.click('button:has-text("Схема полів")');
    await expect(page.locator('.schema-table')).toBeVisible({ timeout: 10000 });

    // Change second field's name to match first field
    const secondRow = page.locator('.schema-table tbody tr').nth(1);
    const nameInput = secondRow.locator('.col-name input');
    const originalName = await nameInput.inputValue();
    await nameInput.fill(duplicateName);

    // Try to save — should rename, so it shows preview modal; but PUT validates duplicates
    // If no rename detected (field_name same as existing), the PUT will catch it
    await page.click('button:has-text("Переглянути зміни")');

    // Wait for either preview modal or error
    // The preview endpoint may return an error for duplicate
    await page.waitForTimeout(1500);

    const hasError = await page.locator('.alert-danger').isVisible();
    const hasPreview = await page.locator('.preview-modal').isVisible();

    // Either an error message or preview modal appeared
    expect(hasError || hasPreview).toBeTruthy();

    // If preview appeared, try to apply — the PUT endpoint will reject duplicates
    if (hasPreview) {
      await page.click('.preview-modal button:has-text("Застосувати")');
      await page.waitForTimeout(1500);
      await expect(page.locator('.alert-danger')).toBeVisible();
    }

    // Restore: cancel edits
    await page.goto('/system-settings');
    await page.click('button:has-text("Схема полів")');
    await expect(page.locator('.schema-table')).toBeVisible({ timeout: 10000 });
  });

  test('Доступ через прямий маршрут /field-schema', async ({ page }) => {
    await page.goto('/field-schema');

    // Should show the schema editor directly
    await expect(page.locator('.schema-table')).toBeVisible({ timeout: 10000 });

    // Verify rows are loaded
    const rows = page.locator('.schema-table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });
});
