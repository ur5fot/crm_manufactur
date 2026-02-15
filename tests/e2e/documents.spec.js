const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { API_URL } = require('./test-config');

test.describe('Document Upload Operations', () => {
  let employeeId;
    test.beforeAll(async ({ request }) => {
    // Create a test employee for document operations
    const response = await request.post(`${API_URL}/api/employees`, {
      data: {
        last_name: 'Документов',
        first_name: 'Тест',
        middle_name: 'Документович',
        employment_status: 'Працює',
        position: 'Тестер документів'
      }
    });
    expect(response.ok()).toBeTruthy();
    const employee = await response.json();
    employeeId = employee.employee_id;
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: delete test employee and files
    if (employeeId) {
      await request.delete(`${API_URL}/api/employees/${employeeId}`);
    }
  });

  test('Загрузить документ с датами', async ({ page }) => {
    // Navigate to employee card
    await page.goto(`/cards/${employeeId}`);
    await page.waitForLoadState('networkidle');

    // Dismiss any notification popups - aggressively close all overlays
    await page.waitForTimeout(1000); // Wait for notifications to render

    // Try to close multiple popups (birthday, document expiry, etc)
    for (let i = 0; i < 10; i++) {
      try {
        const overlay = page.locator('.vacation-notification-overlay').first();
        const isVisible = await overlay.isVisible().catch(() => false);

        if (!isVisible) {
          break; // No more overlays
        }

        // Try to click "Зрозуміло" or "×" button with force
        const closeButton = overlay.locator('button:has-text("Зрозуміло"), button.close-btn, button:has-text("×")').first();
        await closeButton.click({ force: true, timeout: 2000 });
        await page.waitForTimeout(500);
      } catch (e) {
        // If button not found or not clickable, try next iteration
        break;
      }
    }

    // Scroll to Documents section
    const documentsSection = page.locator('text=Документи').first();
    await documentsSection.scrollIntoViewIfNeeded();

    // Find upload button for "Посвідчення особи" (id_certificate_file) - row 5 in the table
    const idCertificateRow = page.locator('tr').filter({ hasText: 'Посвідчення особи' });
    const uploadButton = idCertificateRow.locator('button:has-text("Завантажити")');

    // Click the upload button
    await uploadButton.click();

    // Wait for popup to appear
    const popup = page.locator('.vacation-notification-modal');
    await popup.waitFor({ state: 'visible', timeout: 5000 });

    // Upload file
    const fileInput = popup.locator('input[type="file"]');
    const testFilePath = path.join(__dirname, '../fixtures/test-passport.pdf');
    await fileInput.setInputFiles(testFilePath);

    // Fill issue date
    const issueDateInput = popup.locator('input[type="date"]').first();
    await issueDateInput.fill('2023-01-15');

    // Fill expiry date
    const expiryDateInput = popup.locator('input[type="date"]').last();
    await expiryDateInput.fill('2033-01-15');

    // Listen for the file upload API call
    const uploadPromise = page.waitForResponse(
      response => response.url().includes(`/api/employees/${employeeId}/files`) && response.status() === 200,
      { timeout: 10000 }
    );

    // Click upload button in popup
    const uploadButtonInPopup = popup.locator('button.primary:has-text("Завантажити")');
    await uploadButtonInPopup.click();

    // Wait for upload to complete
    await uploadPromise;

    // Wait for popup to close
    await popup.waitFor({ state: 'hidden', timeout: 5000 });

    // Reload page to ensure data is persisted
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Dismiss notifications again after reload
    const dismissButtons2 = page.locator('button:has-text("Зрозуміло"), button:has-text("×")');
    const dismissCount2 = await dismissButtons2.count();
    for (let i = 0; i < dismissCount2; i++) {
      try {
        await dismissButtons2.first().click({ timeout: 2000 });
        await page.waitForTimeout(300);
      } catch (e) {
        // Ignore if button is not clickable
      }
    }

    // Assert file appears in documents table
    const documentRow = page.locator('tr').filter({ hasText: 'Посвідчення особи' });
    await expect(documentRow).toBeVisible();

    // Assert dates displayed correctly (format is DD.MM.YYYY in UI)
    await expect(documentRow).toContainText('15.01.2023');
    await expect(documentRow).toContainText('15.01.2033');

    // Verify file exists via API
    const response = await page.request.get(`${API_URL}/api/employees/${employeeId}`);
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    // API returns { employee: {...} }
    const employee = responseData.employee;
    expect(employee).toBeTruthy();

    // Check that file field is populated
    expect(employee.id_certificate_file).toBeTruthy();
    expect(employee.id_certificate_file).toContain('files/employee_');
    expect(employee.id_certificate_file_issue_date).toBe('2023-01-15');
    expect(employee.id_certificate_file_expiry_date).toBe('2033-01-15');

    // Verify file exists in filesystem via checking response
    const filePath = employee.id_certificate_file;
    expect(filePath).toMatch(/\.pdf$/);
  });

  test('Удалить документ', async ({ page }) => {
    // First, upload a document to delete
    const testFilePath = path.join(__dirname, '../fixtures/test-passport.pdf');
    const fileBuffer = fs.readFileSync(testFilePath);

    const response = await page.request.post(`${API_URL}/api/employees/${employeeId}/files`, {
      multipart: {
        file: {
          name: 'test-doc.pdf',
          mimeType: 'application/pdf',
          buffer: fileBuffer
        },
        file_field: 'driver_license_file',
        issue_date: '2022-06-01',
        expiry_date: '2032-06-01'
      }
    });
    expect(response.ok()).toBeTruthy();

    // Navigate to employee card
    await page.goto(`/cards/${employeeId}`);
    await page.waitForLoadState('networkidle');

    // Dismiss any notification popups - aggressively close all overlays
    await page.waitForTimeout(1000); // Wait for notifications to render

    // Try to close multiple popups (birthday, document expiry, etc)
    for (let i = 0; i < 10; i++) {
      try {
        const overlay = page.locator('.vacation-notification-overlay').first();
        const isVisible = await overlay.isVisible().catch(() => false);

        if (!isVisible) {
          break; // No more overlays
        }

        // Try to click "Зрозуміло" or "×" button with force
        const closeButton = overlay.locator('button:has-text("Зрозуміло"), button.close-btn, button:has-text("×")').first();
        await closeButton.click({ force: true, timeout: 2000 });
        await page.waitForTimeout(500);
      } catch (e) {
        // If button not found or not clickable, try next iteration
        break;
      }
    }

    // Find document row with "Водійське посвідчення" (driver_license)
    const documentRow = page.locator('tr').filter({ hasText: 'Водійське посвідчення' });
    await documentRow.scrollIntoViewIfNeeded();
    await expect(documentRow).toBeVisible();

    // The row should show dates and have action buttons (format is DD.MM.YYYY in UI)
    await expect(documentRow).toContainText('01.06.2022');

    // Click delete button - look for "Видалити" text button
    const deleteButton = documentRow.locator('button.danger:has-text("Видалити")');

    // Listen for confirm dialog and accept it
    page.once('dialog', dialog => {
      expect(dialog.type()).toBe('confirm');
      dialog.accept();
    });

    // Listen for the delete API call - it should be a DELETE request
    const deletePromise = page.waitForRequest(
      request =>
        request.url().includes(`/api/employees/${employeeId}/files/driver_license_file`) &&
        request.method() === 'DELETE',
      { timeout: 10000 }
    );

    await deleteButton.click();

    // Wait for deletion API call to be sent
    const deleteRequest = await deletePromise;
    // Wait for the response (DELETE returns 204 No Content)
    const deleteResponse = await deleteRequest.response();
    expect(deleteResponse.status()).toBe(204);

    // Wait for UI to update
    await page.waitForTimeout(500);

    // Reload page to ensure deletion persisted
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify document removed from API
    const checkResponse = await page.request.get(`${API_URL}/api/employees/${employeeId}`);
    expect(checkResponse.ok()).toBeTruthy();
    const checkData = await checkResponse.json();
    const employee = checkData.employee;
    expect(employee).toBeTruthy();

    // File field should be empty
    expect(employee.driver_license_file).toBeFalsy();
    expect(employee.driver_license_file_issue_date).toBeFalsy();
    expect(employee.driver_license_file_expiry_date).toBeFalsy();
  });

  test('Открыть папку сотрудника', async ({ page }) => {
    // Navigate to employee card
    await page.goto(`/cards/${employeeId}`);
    await page.waitForLoadState('networkidle');

    // Dismiss any notification popups - aggressively close all overlays
    await page.waitForTimeout(1000); // Wait for notifications to render

    // Try to close multiple popups (birthday, document expiry, etc)
    for (let i = 0; i < 10; i++) {
      try {
        const overlay = page.locator('.vacation-notification-overlay').first();
        const isVisible = await overlay.isVisible().catch(() => false);

        if (!isVisible) {
          break; // No more overlays
        }

        // Try to click "Зрозуміло" or "×" button with force
        const closeButton = overlay.locator('button:has-text("Зрозуміло"), button.close-btn, button:has-text("×")').first();
        await closeButton.click({ force: true, timeout: 2000 });
        await page.waitForTimeout(500);
      } catch (e) {
        // If button not found or not clickable, try next iteration
        break;
      }
    }

    // Scroll to Documents section
    const documentsSection = page.locator('text=Документи').first();
    await documentsSection.scrollIntoViewIfNeeded();

    // Listen for API call
    const openFolderPromise = page.waitForRequest(
      request => request.url().includes(`/api/employees/${employeeId}/open-folder`) && request.method() === 'POST'
    );

    // Click "Відкрити папку" button - there should be one in the Documents section
    // Use a more specific selector to avoid the "Відкрити папку data" button
    const documentsHeader = page.locator('text=Документи').first().locator('..');
    const openFolderButton = documentsHeader.locator('button:has-text("Відкрити папку")').first();
    await openFolderButton.click();

    // Wait for API call to complete
    const request = await openFolderPromise;
    const response = await request.response();

    // Assert API endpoint was called successfully
    expect(response.status()).toBe(200);

    // Note: We cannot verify that OS file explorer actually opened in E2E test
    // This is OS-level behavior that Playwright cannot detect
  });

  test('Открыть документ (кнопка Відкрити)', async ({ page }) => {
    // First, upload a document to view
    const testFilePath = path.join(__dirname, '../fixtures/test-passport.pdf');
    const fileBuffer = fs.readFileSync(testFilePath);

    const response = await page.request.post(`${API_URL}/api/employees/${employeeId}/files`, {
      multipart: {
        file: {
          name: 'test-passport.pdf',
          mimeType: 'application/pdf',
          buffer: fileBuffer
        },
        file_field: 'id_certificate_file',
        issue_date: '2023-01-15',
        expiry_date: '2033-01-15'
      }
    });
    expect(response.ok()).toBeTruthy();

    // Get the uploaded file path
    const employeeResponse = await page.request.get(`${API_URL}/api/employees/${employeeId}`);
    const employeeData = await employeeResponse.json();
    const filePath = employeeData.employee.id_certificate_file;
    expect(filePath).toBeTruthy();
    expect(filePath).toContain('files/employee_');

    // Navigate to employee card
    await page.goto(`/cards/${employeeId}`);
    await page.waitForLoadState('networkidle');

    // Dismiss any notification popups
    await page.waitForTimeout(1000);
    for (let i = 0; i < 10; i++) {
      try {
        const overlay = page.locator('.vacation-notification-overlay').first();
        const isVisible = await overlay.isVisible().catch(() => false);
        if (!isVisible) break;
        const closeButton = overlay.locator('button:has-text("Зрозуміло"), button.close-btn, button:has-text("×")').first();
        await closeButton.click({ force: true, timeout: 2000 });
        await page.waitForTimeout(500);
      } catch (e) {
        break;
      }
    }

    // Find document row with uploaded file
    const documentRow = page.locator('tr').filter({ hasText: 'Посвідчення особи' });
    await documentRow.scrollIntoViewIfNeeded();
    await expect(documentRow).toBeVisible();

    // Find "Відкрити" button
    const openButton = documentRow.locator('button:has-text("Відкрити")');
    await expect(openButton).toBeVisible();

    // Verify the button is clickable
    await expect(openButton).toBeEnabled();

    // Instead of checking window.open (which is hard in E2E), we verify:
    // 1. The button exists and is clickable
    // 2. The file path is correct in the backend
    // 3. The file is accessible directly via HTTP
    const fileUrl = `${API_URL}/${filePath}`;
    const fileResponse = await page.request.get(fileUrl);
    expect(fileResponse.ok()).toBeTruthy();
    expect(fileResponse.headers()['content-type']).toContain('pdf');
  });
});
