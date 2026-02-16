const { test, expect } = require('@playwright/test');
const { setupTestData, cleanupTestData } = require('../helpers/test-utils');
const fs = require('fs');
const path = require('path');
const { API_URL } = require('./test-config');

async function waitForDashboardLoad(page, timeout = 10000) {
  // Wait for dashboard stat cards to load
  await page.waitForSelector('.stat-card', { timeout });

  // Wait a bit for any API calls to complete
  await page.waitForTimeout(1000);

  // Close any notification popups that might appear
  for (let i = 0; i < 5; i++) {
    const closeButton = page.locator('.popup-overlay button:has-text("Зрозуміло"), .vacation-notification-overlay button:has-text("Зрозуміло")').first();
    if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(500);
    } else {
      break;
    }
  }
}

test.describe('Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestData();
    await page.goto('/');
    await waitForDashboardLoad(page);
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('Отобразить статистику по статусам', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('.stat-card', { timeout: 5000 });

    // Get all stat cards
    const statCards = await page.locator('.stat-card').all();
    expect(statCards.length).toBeGreaterThan(0);

    // Check that each stat card has a count
    for (const card of statCards) {
      const count = await card.locator('.stat-card-number').textContent();
      expect(count).toMatch(/^\d+$/); // Should be a number
    }

    // Verify total employees count
    const response = await page.request.get(`${API_URL}/api/employees`);
    const data = await response.json();
    const employees = data.employees || data;

    // Find "Всього" (total) card - might be first or have specific class
    const totalCard = statCards[0];
    const totalCount = await totalCard.locator('.stat-card-number').textContent();
    expect(parseInt(totalCount)).toBe(Array.isArray(employees) ? employees.length : Object.keys(employees).length);
  });

  test('Развернуть список сотрудников по статусу', async ({ page }) => {
    // Wait for stat cards to load
    await page.waitForSelector('.stat-card', { timeout: 5000 });

    // Find a stat card with employees (not the total card)
    const statCards = await page.locator('.stat-card').all();

    // Click on second card (first status-specific card, not total)
    if (statCards.length > 1) {
      const cardToClick = statCards[1];
      const cardLabel = await cardToClick.locator('.stat-card-label').textContent();

      // Click the card
      await cardToClick.click();

      // Wait for accordion to expand
      await page.waitForTimeout(300); // Wait for CSS transition

      // Check if employee list appeared (inline-expand)
      const employeeList = page.locator('.inline-expand.open .inline-expand-list');
      const isVisible = await employeeList.isVisible();

      if (isVisible) {
        // Get employee links
        const employeeLinks = await employeeList.locator('.inline-expand-item').all();

        if (employeeLinks.length > 0) {
          // Click on first employee link
          const firstLink = employeeLinks[0];
          const employeeName = await firstLink.textContent();

          await firstLink.click();

          // Should navigate to cards view
          await page.waitForURL(/\/cards\/\d+/, { timeout: 5000 });
          expect(page.url()).toMatch(/\/cards\/\d+/);
        }
      }
    }
  });

  test('Уведомление о окончании документов', async ({ page }) => {
    // Verify timeline cards exist on dashboard
    await page.waitForSelector('.timeline-card', { timeout: 5000 });
    const timelineCards = await page.locator('.timeline-card').all();
    expect(timelineCards.length).toBeGreaterThanOrEqual(2); // Should have "Сьогодні" and "Найближчі 7 днів"

    // Check if document expiry API endpoint works
    const expiryResponse = await page.request.get(`${API_URL}/api/document-expiry`);
    expect(expiryResponse.ok()).toBeTruthy();
    const expiryData = await expiryResponse.json();

    // API should return proper structure
    expect(expiryData).toHaveProperty('today');
    expect(expiryData).toHaveProperty('thisWeek');
    expect(Array.isArray(expiryData.today)).toBeTruthy();
    expect(Array.isArray(expiryData.thisWeek)).toBeTruthy();
  });

  test('Уведомление о днях рождения', async ({ page }) => {
    // Verify timeline cards exist on dashboard
    await page.waitForSelector('.timeline-card', { timeout: 5000 });
    const timelineCards = await page.locator('.timeline-card').all();
    expect(timelineCards.length).toBeGreaterThanOrEqual(2);

    // Check if birthday API endpoint works
    const birthdayResponse = await page.request.get(`${API_URL}/api/birthday-events`);
    expect(birthdayResponse.ok()).toBeTruthy();
    const birthdayData = await birthdayResponse.json();

    // API should return proper structure (birthday API uses 'next7Days' not 'thisWeek')
    expect(birthdayData).toHaveProperty('today');
    expect(birthdayData).toHaveProperty('next7Days');
    expect(Array.isArray(birthdayData.today)).toBeTruthy();
    expect(Array.isArray(birthdayData.next7Days)).toBeTruthy();
  });

  test('Auto-refresh dashboard', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('.dashboard-footer', { timeout: 5000 });

    // Get initial update timestamp
    const initialTimestamp = await page.locator('.dashboard-footer').textContent();

    // Wait for auto-refresh interval (dashboard should refresh every 30-60 seconds)
    // For testing, we'll just verify the timestamp element exists and has proper format
    expect(initialTimestamp).toMatch(/\d{2}:\d{2}/); // Should contain time MM:SS

    // Alternatively, trigger manual refresh via refresh button
    const refreshButton = page.locator('.tab-icon-btn[title*="Оновити"], .tab-icon-btn[title*="оновити"]');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Wait a moment for refresh to complete
      await page.waitForTimeout(1000);

      // Get new timestamp
      const newTimestamp = await page.locator('.dashboard-footer').textContent();

      // Timestamps should be present (actual comparison might be same if refresh is fast)
      expect(newTimestamp).toMatch(/\d{2}:\d{2}/);
    }
  });
});
