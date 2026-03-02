const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

let testEmployeeId = null;

async function ensureTestEmployee(request) {
  const response = await request.get(`${API_URL}/api/employees`);
  const data = await response.json();

  if (data.employees && data.employees.length > 0) {
    return data.employees[0].employee_id;
  }

  const createResp = await request.post(`${API_URL}/api/employees`, {
    data: { first_name: 'HistoryTest', last_name: 'Employee', gender: 'Чоловіча' }
  });
  const createData = await createResp.json();
  return createData.employee_id;
}

test.describe('Status History Popup', () => {
  test.beforeAll(async ({ request }) => {
    testEmployeeId = await ensureTestEmployee(request);
  });

  test('clock icon button is visible next to employment status', async ({ page }) => {
    await page.goto(`${BASE_URL}/cards/${testEmployeeId}`);
    await page.waitForSelector('.status-field-row');

    const historyBtn = page.locator('.status-history-btn');
    await expect(historyBtn).toBeVisible();
    await expect(historyBtn).toHaveAttribute('title', 'Історія змін статусу');
  });

  test('clicking clock button opens status history popup', async ({ page }) => {
    await page.goto(`${BASE_URL}/cards/${testEmployeeId}`);
    await page.waitForSelector('.status-field-row');

    const historyBtn = page.locator('.status-history-btn');
    await historyBtn.waitFor();
    await historyBtn.click();

    const modal = page.locator('.status-history-modal');
    await expect(modal).toBeVisible();

    // Check popup header
    const header = modal.locator('.vacation-notification-header h3');
    await expect(header).toHaveText('Історія змін статусу');
  });

  test('popup shows empty message or table when no changes made', async ({ page, request }) => {
    // Create a fresh employee — verify status history API returns empty
    const resp = await request.post(`${API_URL}/api/employees`, {
      data: { first_name: 'NoHistory', last_name: 'TestEmpty', gender: 'Жіноча' }
    });
    const { employee_id } = await resp.json();

    try {
      // Verify via API that this employee has no history
      const histResp = await request.get(`${API_URL}/api/employees/${employee_id}/status-history`);
      const histData = await histResp.json();

      await page.goto(`${BASE_URL}/cards/${employee_id}`);
      await page.waitForFunction(
        (id) => document.querySelector('#employee_id')?.value === id,
        employee_id
      );
      await page.waitForSelector('.status-field-row');

      const historyBtn = page.locator('.status-history-btn');
      await historyBtn.waitFor();
      await historyBtn.click();

      if (histData.history.length === 0) {
        // Fresh employee with no history — should show empty message
        const emptyMsg = page.locator('.status-history-empty');
        await expect(emptyMsg).toBeVisible();
        await expect(emptyMsg).toHaveText('Історія змін статусу відсутня.');
      } else {
        // Employee ID was reused from previous test run — history table should be shown
        const table = page.locator('.status-history-table');
        await expect(table).toBeVisible();
      }
    } finally {
      await request.delete(`${API_URL}/api/employees/${employee_id}`);
    }
  });

  test('popup displays history after status change', async ({ page, request }) => {
    // Create a fresh employee
    const createResp = await request.post(`${API_URL}/api/employees`, {
      data: { first_name: 'WithHistory', last_name: 'Employee', gender: 'Чоловіча' }
    });
    const { employee_id } = await createResp.json();

    try {
      // Get the employee to get full data
      const empResp = await request.get(`${API_URL}/api/employees/${employee_id}`);
      const { employee } = await empResp.json();

      // Use future dates to avoid auto-sync resetting the status
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const startDateStr = tomorrow.toISOString().split('T')[0];
      const endDateStr = nextMonth.toISOString().split('T')[0];

      // Make a status change via API
      await request.put(`${API_URL}/api/employees/${employee_id}`, {
        data: {
          ...employee,
          employment_status: 'Відпустка',
          status_start_date: startDateStr,
          status_end_date: endDateStr
        }
      });

      await page.goto(`${BASE_URL}/cards/${employee_id}`);
      // Wait for the correct employee card to load
      await page.waitForFunction(
        (id) => document.querySelector('#employee_id')?.value === id,
        employee_id
      );
      await page.waitForSelector('.status-field-row');

      const historyBtn = page.locator('.status-history-btn');
      await historyBtn.waitFor();
      await historyBtn.click();

      const table = page.locator('.status-history-table');
      await expect(table).toBeVisible();

      // Check that at least one row exists
      const rowCount = await table.locator('tbody tr').count();
      if (rowCount < 1) {
        throw new Error(`Expected at least 1 history row, got ${rowCount}`);
      }

      // Check the first row contains the new status
      const firstRow = table.locator('tbody tr').first();
      await expect(firstRow).toContainText('Відпустка');
    } finally {
      await request.delete(`${API_URL}/api/employees/${employee_id}`);
    }
  });

  test('popup can be closed with close button', async ({ page }) => {
    await page.goto(`${BASE_URL}/cards/${testEmployeeId}`);
    await page.waitForSelector('.status-field-row');

    const historyBtn = page.locator('.status-history-btn');
    await historyBtn.waitFor();
    await historyBtn.click();
    const modal = page.locator('.status-history-modal');
    await expect(modal).toBeVisible();

    await modal.locator('.close-btn').click();
    await expect(modal).not.toBeVisible();
  });

  test('popup can be closed with Закрити button', async ({ page }) => {
    await page.goto(`${BASE_URL}/cards/${testEmployeeId}`);
    await page.waitForSelector('.status-field-row');

    const historyBtn = page.locator('.status-history-btn');
    await historyBtn.waitFor();
    await historyBtn.click();
    const modal = page.locator('.status-history-modal');
    await expect(modal).toBeVisible();

    await modal.locator('.vacation-notification-footer .secondary').click();
    await expect(modal).not.toBeVisible();
  });

  test('popup can be closed with Escape key', async ({ page }) => {
    await page.goto(`${BASE_URL}/cards/${testEmployeeId}`);
    await page.waitForSelector('.status-field-row');

    const historyBtn = page.locator('.status-history-btn');
    await historyBtn.waitFor();
    await historyBtn.click();
    const modal = page.locator('.status-history-modal');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('history table shows formatted dates', async ({ page, request }) => {
    // Create employee and make a status change
    const createResp = await request.post(`${API_URL}/api/employees`, {
      data: { first_name: 'DateFormat', last_name: 'Test', gender: 'Чоловіча' }
    });
    const { employee_id } = await createResp.json();

    try {
      const empResp = await request.get(`${API_URL}/api/employees/${employee_id}`);
      const { employee } = await empResp.json();

      // Use future dates to avoid auto-sync resetting the status
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const startDateStr = tomorrow.toISOString().split('T')[0];
      const endDateStr = nextMonth.toISOString().split('T')[0];
      const startDateFormatted = startDateStr.split('-').reverse().join('.');
      const endDateFormatted = endDateStr.split('-').reverse().join('.');

      await request.put(`${API_URL}/api/employees/${employee_id}`, {
        data: {
          ...employee,
          employment_status: 'Лікарняний',
          status_start_date: startDateStr,
          status_end_date: endDateStr
        }
      });

      await page.goto(`${BASE_URL}/cards/${employee_id}`);
      // Wait for the correct employee card to load
      await page.waitForFunction(
        (id) => document.querySelector('#employee_id')?.value === id,
        employee_id
      );
      await page.waitForSelector('.status-field-row');

      const historyBtn = page.locator('.status-history-btn');
      await historyBtn.waitFor();
      await historyBtn.click();

      const table = page.locator('.status-history-table');
      await expect(table).toBeVisible();

      const firstRow = table.locator('tbody tr').first();
      // Check that period column contains formatted dates (DD.MM.YYYY format)
      await expect(firstRow).toContainText(startDateFormatted);
      await expect(firstRow).toContainText(endDateFormatted);
    } finally {
      await request.delete(`${API_URL}/api/employees/${employee_id}`);
    }
  });
});
