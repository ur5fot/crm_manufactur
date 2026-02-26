const { test, expect } = require('@playwright/test');
const path = require('path');

const API_URL = 'http://localhost:3000/api';

// Helper to create minimal DOCX buffer for testing
function createTestDocxBuffer(placeholders = []) {
  const PizZip = require(path.join(__dirname, '../../server/node_modules/pizzip'));
  const zip = new PizZip();
  let docContent = '<?xml version="1.0" encoding="UTF-8"?>';
  docContent += '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">';
  docContent += '<w:body>';
  for (const p of placeholders) {
    docContent += `<w:p><w:r><w:t>{${p}}</w:t></w:r></w:p>`;
  }
  docContent += '</w:body></w:document>';
  zip.folder('word').file('document.xml', docContent);
  zip.file('[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>'
  );
  zip.folder('_rels').file('.rels',
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>'
  );
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

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

  test('General template NOT shown in employee card document generation list', async ({ page, request }) => {
    // Create a general template via API
    const timestamp = Date.now();
    const generalName = `E2E HiddenGeneral ${timestamp}`;
    const createResp = await request.post(`${API_URL}/templates`, {
      data: { template_name: generalName, template_type: 'Інше', is_general: 'yes' }
    });
    const createData = await createResp.json();
    createdTemplateIds.push(createData.template.template_id);

    // Also create a regular template to verify it IS shown
    const regularName = `E2E VisibleRegular ${timestamp}`;
    const createResp2 = await request.post(`${API_URL}/templates`, {
      data: { template_name: regularName, template_type: 'Заявка', is_general: 'no' }
    });
    const createData2 = await createResp2.json();
    createdTemplateIds.push(createData2.template.template_id);

    // Get first employee
    const empResp = await request.get(`${API_URL}/employees`);
    const empData = await empResp.json();
    const firstEmployee = empData.employees[0];
    expect(firstEmployee).toBeTruthy();

    // Navigate to employee card
    await page.goto(`/cards/${firstEmployee.employee_id}`);
    await page.waitForTimeout(1000);

    // Close notification popups
    const closeButtons = page.locator('.close-btn');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
    }

    // Wait for the document generation section to load
    await expect(page.locator('text=Генерування документів')).toBeVisible();

    // The general template should NOT appear in the list
    const generalTemplate = page.locator(`.template-card-title:has-text("${generalName}")`);
    await expect(generalTemplate).toHaveCount(0);

    // The regular template SHOULD appear in the list
    const regularTemplate = page.locator(`.template-card-title:has-text("${regularName}")`);
    await expect(regularTemplate).toBeVisible();
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

  test('General Templates tab is visible in Documents view', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Close notification popups
    const closeButtons = page.locator('.close-btn');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
    }

    // Navigate to Documents
    await page.click('text=Документи');

    // Verify all three tabs are visible (use exact matching to avoid "Загальні шаблони" matching "Шаблони")
    await expect(page.getByRole('button', { name: 'Шаблони', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Загальні шаблони' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Історія документів' })).toBeVisible();
  });

  test('General template appears in General Templates tab', async ({ page, request }) => {
    // Create a general template via API
    const timestamp = Date.now();
    const generalName = `E2E TabGeneral ${timestamp}`;
    const createResp = await request.post(`${API_URL}/templates`, {
      data: { template_name: generalName, template_type: 'Інше', is_general: 'yes' }
    });
    const createData = await createResp.json();
    createdTemplateIds.push(createData.template.template_id);

    // Also create a regular template to verify it does NOT appear
    const regularName = `E2E TabRegular ${timestamp}`;
    const createResp2 = await request.post(`${API_URL}/templates`, {
      data: { template_name: regularName, template_type: 'Заявка', is_general: 'no' }
    });
    const createData2 = await createResp2.json();
    createdTemplateIds.push(createData2.template.template_id);

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Close notification popups
    const closeButtons = page.locator('.close-btn');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
    }

    // Navigate to Documents -> General Templates tab
    await page.click('text=Документи');
    await page.click('.documents-tab-btn:has-text("Загальні шаблони")');
    await expect(page.locator('text=Загальні шаблони').first()).toBeVisible();

    // General template should be visible
    await expect(page.locator(`text=${generalName}`)).toBeVisible();

    // Regular template should NOT be in general templates tab
    await expect(page.locator(`text=${regularName}`)).toHaveCount(0);
  });

  test('Generate document from General Templates tab', async ({ page, request }) => {
    // Create a general template with DOCX via API
    const timestamp = Date.now();
    const templateName = `E2E GenDoc ${timestamp}`;
    const createResp = await request.post(`${API_URL}/templates`, {
      data: { template_name: templateName, template_type: 'Інше', is_general: 'yes' }
    });
    const createData = await createResp.json();
    const templateId = createData.template.template_id;
    createdTemplateIds.push(templateId);

    // Upload a simple DOCX file for this template
    const docxBuffer = createTestDocxBuffer(['current_date']);

    // Upload via API
    const uploadResp = await request.post(`${API_URL}/templates/${templateId}/upload`, {
      multipart: {
        file: {
          name: 'test.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          buffer: docxBuffer
        }
      }
    });
    expect(uploadResp.ok()).toBeTruthy();

    // Navigate to General Templates tab
    await page.goto('/');
    await page.waitForTimeout(1000);

    const closeButtons = page.locator('.close-btn');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
    }

    await page.click('text=Документи');
    await page.click('.documents-tab-btn:has-text("Загальні шаблони")');
    await page.waitForTimeout(500);

    // Find the template row and click generate
    const row = page.locator(`tr:has-text("${templateName}")`);
    await expect(row).toBeVisible();

    const generateBtn = row.locator('button:has-text("Створити документ")');
    await expect(generateBtn).toBeEnabled();

    // Handle alert for generation success
    const dialogPromise = page.waitForEvent('dialog');
    await generateBtn.click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('успішно');
    await dialog.accept();
  });
});
