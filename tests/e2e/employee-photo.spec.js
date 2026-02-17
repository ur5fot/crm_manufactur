const { test, expect } = require('@playwright/test');
const { setupTestData, cleanupTestData, waitForEmployeesLoad } = require('../helpers/test-utils');
const { API_URL } = require('./test-config');
const path = require('path');
const fs = require('fs');

test.describe('Employee Photo', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestData();
    await page.goto('/cards');
    await waitForEmployeesLoad(page);
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should show photo placeholder when no photo', async ({ page }) => {
    // Click first employee
    const firstEmployee = page.locator('.employee-list > div').first();
    await firstEmployee.click();
    await page.waitForTimeout(500);

    // Verify photo area exists with placeholder (SVG icon)
    const photoArea = page.locator('.employee-photo-area');
    await expect(photoArea).toBeVisible();

    const placeholder = page.locator('.employee-photo-placeholder');
    await expect(placeholder).toBeVisible();
  });

  test('should upload photo via API and display it', async ({ page, request }) => {
    // Click first employee
    const firstEmployee = page.locator('.employee-list > div').first();
    await firstEmployee.click();
    await page.waitForTimeout(500);

    // Get employee ID from URL
    const url = page.url();
    const employeeId = url.split('/cards/')[1];

    // Create a minimal PNG and upload via API
    const pngBuffer = createTestPng();
    const response = await request.post(`${API_URL}/api/employees/${employeeId}/photo`, {
      multipart: {
        photo: {
          name: 'test-photo.png',
          mimeType: 'image/png',
          buffer: pngBuffer
        }
      }
    });
    expect(response.ok()).toBeTruthy();

    // Reload page to see the photo
    await page.goto(`/cards/${employeeId}`);
    await waitForEmployeesLoad(page);

    // Verify photo image is displayed
    const photoImg = page.locator('.employee-photo-img');
    await expect(photoImg).toBeVisible({ timeout: 5000 });
  });

  test('should upload photo via file input and show it', async ({ page }) => {
    // Click first employee
    const firstEmployee = page.locator('.employee-list > div').first();
    await firstEmployee.click();
    await page.waitForTimeout(500);

    // Create a temp PNG file for upload
    const tempDir = path.join(__dirname, '../fixtures');
    const tempFile = path.join(tempDir, 'test-photo.png');
    fs.writeFileSync(tempFile, createTestPng());

    try {
      // Set the file on the hidden input
      const fileInput = page.locator('.employee-photo-area input[type="file"]');
      await fileInput.setInputFiles(tempFile);

      // Wait for upload to complete
      await page.waitForTimeout(2000);

      // Verify photo image is now displayed
      const photoImg = page.locator('.employee-photo-img');
      await expect(photoImg).toBeVisible({ timeout: 5000 });

      // Verify placeholder is gone
      const placeholder = page.locator('.employee-photo-placeholder');
      await expect(placeholder).not.toBeVisible();
    } finally {
      // Cleanup temp file
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  });

  test('should delete photo', async ({ page, request }) => {
    // Click first employee
    const firstEmployee = page.locator('.employee-list > div').first();
    await firstEmployee.click();
    await page.waitForTimeout(500);

    // Get employee ID
    const url = page.url();
    const employeeId = url.split('/cards/')[1];

    // Upload a photo via API first
    const pngBuffer = createTestPng();
    await request.post(`${API_URL}/api/employees/${employeeId}/photo`, {
      multipart: {
        photo: {
          name: 'test-photo.png',
          mimeType: 'image/png',
          buffer: pngBuffer
        }
      }
    });

    // Reload page
    await page.goto(`/cards/${employeeId}`);
    await waitForEmployeesLoad(page);

    // Verify photo is displayed
    const photoImg = page.locator('.employee-photo-img');
    await expect(photoImg).toBeVisible({ timeout: 5000 });

    // Handle confirm dialog
    page.on('dialog', dialog => dialog.accept());

    // Hover over photo area to reveal delete button, then click it
    const photoArea = page.locator('.employee-photo-area');
    await photoArea.hover();
    const deleteBtn = page.locator('.photo-delete-btn');
    await deleteBtn.click({ force: true });

    // Wait for delete to complete
    await page.waitForTimeout(2000);

    // Verify photo is gone and placeholder is back
    const placeholder = page.locator('.employee-photo-placeholder');
    await expect(placeholder).toBeVisible({ timeout: 5000 });
  });

  test('should show sidebar photo after upload', async ({ page, request }) => {
    // Click first employee
    const firstEmployee = page.locator('.employee-list > div').first();
    await firstEmployee.click();
    await page.waitForTimeout(500);

    // Verify sidebar placeholder is shown initially
    const sidebarPlaceholder = firstEmployee.locator('.employee-card-photo-placeholder');
    await expect(sidebarPlaceholder).toBeVisible();

    // Get employee ID from URL
    const url = page.url();
    const employeeId = url.split('/cards/')[1];

    // Upload photo via API
    const pngBuffer = createTestPng();
    const response = await request.post(`${API_URL}/api/employees/${employeeId}/photo`, {
      multipart: {
        photo: {
          name: 'test-photo.png',
          mimeType: 'image/png',
          buffer: pngBuffer
        }
      }
    });
    expect(response.ok()).toBeTruthy();

    // Reload page to see photo in sidebar
    await page.goto(`/cards/${employeeId}`);
    await waitForEmployeesLoad(page);

    // Find the active sidebar card and verify it has a photo img
    const activeCard = page.locator('.employee-card.active');
    const sidebarImg = activeCard.locator('.employee-card-photo-img');
    await expect(sidebarImg).toBeVisible({ timeout: 5000 });
  });

  test('should show hover overlay on photo area', async ({ page }) => {
    // Click first employee
    const firstEmployee = page.locator('.employee-list > div').first();
    await firstEmployee.click();
    await page.waitForTimeout(500);

    // Hover over photo area
    const photoArea = page.locator('.employee-photo-area');
    await photoArea.hover();

    // Verify overlay is visible with "Додати" text (no photo uploaded)
    const overlay = page.locator('.employee-photo-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Додати');
  });
});

// Helper: create minimal valid PNG buffer
function createTestPng() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82
  ]);
}
