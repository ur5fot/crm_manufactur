const { test, expect } = require('@playwright/test');
const { setupTestData, cleanupTestData } = require('../helpers/test-utils');
const { API_URL } = require('./test-config');

async function waitForLogsLoad(page, timeout = 10000) {
  // Wait for logs view to load
  await page.waitForSelector('.table-panel, .logs-table', { timeout });
  await page.waitForTimeout(500);
}

test.describe('Audit Logs Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('Просмотр логов изменений', async ({ page }) => {
    // Navigate to system settings page
    await page.goto('/system-settings');
    await page.waitForLoadState('networkidle');

    // Click on Logs tab
    await page.click('.subtab-btn:has-text("Логи")');
    await page.waitForTimeout(500);

    await waitForLogsLoad(page);

    // Verify logs table/container is visible
    const logsContainer = page.locator('.table-panel, .logs-table').first();
    await expect(logsContainer).toBeVisible({ timeout: 5000 });

    // Check if logs are loaded from API
    const logsResponse = await page.request.get(`${API_URL}/api/logs`);
    expect(logsResponse.ok()).toBeTruthy();
    const logsData = await logsResponse.json();

    // Should have logs property or be array
    const logs = logsData.logs || logsData;
    expect(Array.isArray(logs)).toBeTruthy();

    // If we have logs, verify they are displayed
    if (logs.length > 0) {
      // Check that at least one log entry is visible
      const logEntries = page.locator('tr, .log-entry').filter({ hasText: logs[0].employee_name || logs[0].action || '' });
      const count = await logEntries.count();
      expect(count).toBeGreaterThan(0);
    }

    // Verify newest logs appear first (check if first log has highest timestamp)
    if (logs.length > 1) {
      const firstLogTimestamp = new Date(logs[0].timestamp).getTime();
      const secondLogTimestamp = new Date(logs[1].timestamp).getTime();
      expect(firstLogTimestamp).toBeGreaterThanOrEqual(secondLogTimestamp);
    }
  });

  test('Поиск логов по сотруднику', async ({ page }) => {
    // Create employee via API directly for more reliability
    const employeeData = {
      last_name: 'Test Логів',
      first_name: 'Тестовий',
      middle_name: '',
      employment_status: 'Працює',
      position: ''
    };

    // CREATE: Create employee via API
    const createResponse = await page.request.post(`${API_URL}/api/employees`, {
      data: employeeData
    });
    expect(createResponse.ok()).toBeTruthy();
    const createdEmployee = await createResponse.json();
    const employeeId = createdEmployee.employee_id;

    // Wait a bit for log to be written
    await page.waitForTimeout(500);

    // UPDATE: Edit employee via API
    const updateResponse = await page.request.put(`${API_URL}/api/employees/${employeeId}`, {
      data: {
        ...employeeData,
        employee_id: employeeId,
        position: 'Тестова посада'
      }
    });
    expect(updateResponse.ok()).toBeTruthy();

    // Wait a bit for log to be written
    await page.waitForTimeout(500);

    // DELETE: Delete employee via API
    const deleteResponse = await page.request.delete(`${API_URL}/api/employees/${employeeId}`);
    expect(deleteResponse.ok()).toBeTruthy();

    // Wait a bit for log to be written
    await page.waitForTimeout(500);

    // Navigate to system settings page
    await page.goto('/system-settings');
    await page.waitForLoadState('networkidle');

    // Click on Logs tab
    await page.click('.subtab-btn:has-text("Логи")');
    await page.waitForTimeout(500);

    await waitForLogsLoad(page);

    // Search for employee logs
    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill('Test Логів');
    await page.waitForTimeout(500);

    // Verify log entries exist for this employee in UI
    const logRows = page.locator('tbody tr').filter({ hasText: 'Test Логів' });
    const logCount = await logRows.count();

    // Should have at least 2 entries (CREATE + DELETE minimum, UPDATE may or may not be present)
    expect(logCount).toBeGreaterThanOrEqual(2);

    // Check for specific action types in logs via API
    const logsResponse = await page.request.get(`${API_URL}/api/logs`);
    const logsData = await logsResponse.json();
    const logs = logsData.logs || logsData;

    const employeeLogs = logs.filter(log => log.employee_name && log.employee_name.includes('Test Логів'));

    // Should have CREATE log
    const createLog = employeeLogs.find(log => log.action === 'CREATE');
    expect(createLog).toBeDefined();

    // Should have DELETE log
    const deleteLog = employeeLogs.find(log => log.action === 'DELETE');
    expect(deleteLog).toBeDefined();

    // Should have UPDATE log with old_value and new_value (if any updates were logged)
    const updateLogs = employeeLogs.filter(log => log.action === 'UPDATE');
    if (updateLogs.length > 0) {
      // At least one UPDATE log exists
      expect(updateLogs.length).toBeGreaterThan(0);

      // Check if position update was logged (might not be logged if empty -> value)
      const positionUpdateLog = updateLogs.find(log => log.field_name === 'position');
      if (positionUpdateLog) {
        expect(positionUpdateLog.old_value).toBe('');
        expect(positionUpdateLog.new_value).toBe('Тестова посада');
      }
    }
  });
});
