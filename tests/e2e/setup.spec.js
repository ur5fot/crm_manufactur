const { test, expect } = require('@playwright/test');

test.describe('Setup and Connectivity Tests', () => {
  test('Server responds to GET /api/employees', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/employees');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('employees');
    expect(Array.isArray(data.employees)).toBeTruthy();
  });

  test('Server responds to GET /api/fields-schema', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/fields-schema');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const schema = await response.json();
    expect(schema).toHaveProperty('groups');
    expect(schema).toHaveProperty('tableFields');
    expect(schema).toHaveProperty('allFields');
  });

  test('Client is accessible at localhost:5173', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for Vue app to mount
    await page.waitForSelector('.app', { timeout: 5000 });

    // Check that page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('Client loads dashboard view', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for dashboard to load
    await page.waitForSelector('.dashboard', { timeout: 5000 });

    // Check for stat cards
    const statCards = await page.locator('.stat-card').count();
    expect(statCards).toBeGreaterThan(0);
  });

  test('API and UI integration - employees load in cards view', async ({ page }) => {
    // Start waiting for API response before navigation
    const apiResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/employees') && response.status() === 200,
      { timeout: 10000 }
    );

    await page.goto('http://localhost:5173/cards');

    // Wait for API call to complete
    await apiResponsePromise;

    // Close any notification popups that might appear
    const closeButton = page.locator('.popup-overlay button:has-text("Зрозуміло")').first();
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
    }

    // Wait for employee list to render
    await page.waitForSelector('.employee-list', { timeout: 5000 });

    // Check that employees are displayed
    const employeeCards = await page.locator('.employee-card').count();
    expect(employeeCards).toBeGreaterThan(0);
  });
});
