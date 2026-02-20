const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

function getTodayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function createTestEmployee(request) {
  const resp = await request.post(`${API_URL}/api/employees`, {
    data: { first_name: 'StatusEvent', last_name: 'TestEmployee', gender: 'Чоловіча' }
  });
  const data = await resp.json();
  return data.employee_id;
}

async function deleteEmployee(request, employeeId) {
  await request.delete(`${API_URL}/api/employees/${employeeId}`);
}

async function openStatusChangeModal(page) {
  await page.click('button:has-text("Змінити статус")');
  await page.waitForSelector('.vacation-notification-modal .vacation-notification-header h3:has-text("Зміна статусу")');
}

test.describe('Status Events', () => {
  test('start date defaults to today when opening status change modal', async ({ page, request }) => {
    const employeeId = await createTestEmployee(request);
    try {
      await page.goto(`${BASE_URL}/cards/${employeeId}`);
      await page.waitForSelector('.status-field-row');

      await openStatusChangeModal(page);

      const startDateInput = page.locator('.vacation-notification-modal input[type="date"]').first();
      await expect(startDateInput).toHaveValue(getTodayString());
    } finally {
      await deleteEmployee(request, employeeId);
    }
  });

  test('modal shows empty events list for new employee', async ({ page, request }) => {
    const employeeId = await createTestEmployee(request);
    try {
      await page.goto(`${BASE_URL}/cards/${employeeId}`);
      await page.waitForSelector('.status-field-row');

      await openStatusChangeModal(page);

      // Wait for loading to complete
      await page.waitForFunction(() => !document.querySelector('.status-history-loading'));

      const emptyMsg = page.locator('.status-history-empty');
      await expect(emptyMsg).toBeVisible();
      await expect(emptyMsg).toHaveText('Немає запланованих подій');
    } finally {
      await deleteEmployee(request, employeeId);
    }
  });

  test('adding immediate event updates employee status in card', async ({ page, request }) => {
    const employeeId = await createTestEmployee(request);
    try {
      await page.goto(`${BASE_URL}/cards/${employeeId}`);
      await page.waitForSelector('.status-field-row');

      await openStatusChangeModal(page);
      await page.waitForFunction(() => !document.querySelector('.status-history-loading'));

      // Select a status
      await page.selectOption('.vacation-notification-modal select', { index: 1 });

      // Start date should already be today (immediate event)
      const startDateInput = page.locator('.vacation-notification-modal input[type="date"]').first();
      await expect(startDateInput).toHaveValue(getTodayString());

      // Save the event
      await page.click('.vacation-notification-footer button.primary');

      // Wait for events list to refresh and show the new event
      await page.waitForFunction(() => {
        const table = document.querySelector('.status-events-list .status-history-table');
        return table && table.querySelectorAll('tbody tr').length > 0;
      });

      // The event should appear in the list
      const eventsTable = page.locator('.status-events-list .status-history-table');
      await expect(eventsTable).toBeVisible();

      // Close the modal and check the employee status field was updated
      await page.click('.vacation-notification-footer button.secondary');
      await expect(page.locator('.vacation-notification-modal')).not.toBeVisible();

      // Verify employee status was updated in the form (index 1 = first statusChangeOption = 'Звільнений')
      const statusSelect = page.locator('#employment_status');
      const selectedStatus = await statusSelect.inputValue();
      expect(selectedStatus).toBe('Звільнений');
    } finally {
      await deleteEmployee(request, employeeId);
    }
  });

  test('adding future event: event appears in list but only working status shown', async ({ page, request }) => {
    const employeeId = await createTestEmployee(request);
    try {
      // Set employee to a known "Працює" status first so comparison is deterministic
      const empResp = await request.get(`${API_URL}/api/employees/${employeeId}`);
      const { employee } = await empResp.json();
      await request.put(`${API_URL}/api/employees/${employeeId}`, {
        data: { ...employee, employment_status: 'Працює' }
      });

      await page.goto(`${BASE_URL}/cards/${employeeId}`);
      await page.waitForSelector('.status-field-row');

      await openStatusChangeModal(page);
      await page.waitForFunction(() => !document.querySelector('.status-history-loading'));

      // Select a status
      await page.selectOption('.vacation-notification-modal select', { index: 1 });

      // Set a future start date
      const futureDate = getFutureDate(10);
      const startDateInput = page.locator('.vacation-notification-modal input[type="date"]').first();
      await startDateInput.fill(futureDate);

      // Save the event
      await page.click('.vacation-notification-footer button.primary');

      // Wait for events list to refresh
      await page.waitForFunction(() => {
        const table = document.querySelector('.status-events-list .status-history-table');
        return table && table.querySelectorAll('tbody tr').length > 0;
      });

      // Event should appear in the list
      const eventsTable = page.locator('.status-events-list .status-history-table');
      await expect(eventsTable).toBeVisible();

      // No active dot should appear (future event, not currently active)
      const activeDot = page.locator('.status-events-list .active-event-dot');
      await expect(activeDot).not.toBeVisible();

      // Close modal and verify employee status is still "Працює" (future event doesn't activate)
      await page.click('.vacation-notification-footer button.secondary');
      await expect(page.locator('.vacation-notification-modal')).not.toBeVisible();

      const currentStatus = await page.locator('#employment_status').inputValue();
      expect(currentStatus).toBe('Працює');
    } finally {
      await deleteEmployee(request, employeeId);
    }
  });

  test('adding overlapping event shows error message', async ({ page, request }) => {
    const employeeId = await createTestEmployee(request);
    try {
      // Create an event via API first
      await request.post(`${API_URL}/api/employees/${employeeId}/status-events`, {
        data: {
          status: 'Відпустка',
          start_date: getTodayString(),
          end_date: getFutureDate(30)
        }
      });

      await page.goto(`${BASE_URL}/cards/${employeeId}`);
      await page.waitForSelector('.status-field-row');

      await openStatusChangeModal(page);
      await page.waitForFunction(() => !document.querySelector('.status-history-loading'));

      // Wait for the existing event to appear in the table
      await page.waitForFunction(() => {
        const table = document.querySelector('.status-events-list .status-history-table');
        return table && table.querySelectorAll('tbody tr').length > 0;
      });

      // Try to add an overlapping event
      await page.selectOption('.vacation-notification-modal select', { index: 2 });

      const startDateInput = page.locator('.vacation-notification-modal input[type="date"]').first();
      await startDateInput.fill(getFutureDate(5));

      // Click save
      await page.click('.vacation-notification-footer button.primary');

      // Should show overlap error
      const errorMsg = page.locator('.status-event-error');
      await expect(errorMsg).toBeVisible();
      await expect(errorMsg).toContainText('перетинається');
    } finally {
      await deleteEmployee(request, employeeId);
    }
  });

  test('deleting event from list removes it', async ({ page, request }) => {
    const employeeId = await createTestEmployee(request);
    try {
      // Create a future event via API so it doesn't change status
      const futureDate = getFutureDate(20);
      await request.post(`${API_URL}/api/employees/${employeeId}/status-events`, {
        data: {
          status: 'Відпустка',
          start_date: futureDate,
          end_date: getFutureDate(30)
        }
      });

      await page.goto(`${BASE_URL}/cards/${employeeId}`);
      await page.waitForSelector('.status-field-row');

      await openStatusChangeModal(page);
      await page.waitForFunction(() => !document.querySelector('.status-history-loading'));

      // Wait for event to appear
      await page.waitForFunction(() => {
        const table = document.querySelector('.status-events-list .status-history-table');
        return table && table.querySelectorAll('tbody tr').length > 0;
      });

      const eventsTable = page.locator('.status-events-list .status-history-table');
      await expect(eventsTable).toBeVisible();

      // Click delete button for the first (only) event
      await page.click('.status-event-delete-btn');

      // Wait for the list to refresh - event should be gone
      await page.waitForFunction(() => !document.querySelector('.status-events-list .status-history-table'));

      // Empty message should appear
      const emptyMsg = page.locator('.status-history-empty');
      await expect(emptyMsg).toBeVisible();
    } finally {
      await deleteEmployee(request, employeeId);
    }
  });

  test('status reverts to Працює after deleting active event', async ({ page, request }) => {
    const employeeId = await createTestEmployee(request);
    try {
      // Create an immediate event via API
      await request.post(`${API_URL}/api/employees/${employeeId}/status-events`, {
        data: {
          status: 'Відпустка',
          start_date: getTodayString(),
          end_date: getFutureDate(15)
        }
      });

      // Verify status changed via API
      const empResp = await request.get(`${API_URL}/api/employees/${employeeId}`);
      const empData = await empResp.json();
      expect(empData.employee.employment_status).toBe('Відпустка');

      await page.goto(`${BASE_URL}/cards/${employeeId}`);
      await page.waitForSelector('.status-field-row');

      await openStatusChangeModal(page);
      await page.waitForFunction(() => !document.querySelector('.status-history-loading'));

      // Wait for the active event to appear
      await page.waitForFunction(() => {
        const table = document.querySelector('.status-events-list .status-history-table');
        return table && table.querySelectorAll('tbody tr').length > 0;
      });

      // Delete the active event
      await page.click('.status-event-delete-btn');

      // Wait for the list to refresh (table disappears when events list is empty)
      await page.waitForFunction(() => !document.querySelector('.status-events-list .status-history-table'));

      // Wait for events list loading to finish and the empty message to appear
      const emptyMsg = page.locator('.status-history-empty');
      await expect(emptyMsg).toBeVisible({ timeout: 10000 });

      // Close modal
      await page.click('.vacation-notification-footer button.secondary');
      await expect(page.locator('.vacation-notification-modal')).not.toBeVisible();

      // Wait for the employee form to reflect the sync'd status
      await page.waitForFunction(() => {
        const el = document.querySelector('#employment_status');
        return el && el.value === 'Працює';
      }, { timeout: 10000 });

      // Status should have reverted to Працює
      const statusSelect = page.locator('#employment_status');
      const currentStatus = await statusSelect.inputValue();
      expect(currentStatus).toBe('Працює');
    } finally {
      await deleteEmployee(request, employeeId);
    }
  });

  test('active event is visually indicated with dot', async ({ page, request }) => {
    const employeeId = await createTestEmployee(request);
    try {
      // Create an immediate (active) event via API
      await request.post(`${API_URL}/api/employees/${employeeId}/status-events`, {
        data: {
          status: 'Лікарняний',
          start_date: getTodayString(),
          end_date: getFutureDate(7)
        }
      });

      await page.goto(`${BASE_URL}/cards/${employeeId}`);
      await page.waitForSelector('.status-field-row');

      await openStatusChangeModal(page);
      await page.waitForFunction(() => !document.querySelector('.status-history-loading'));

      // Wait for events to load
      await page.waitForFunction(() => {
        const table = document.querySelector('.status-events-list .status-history-table');
        return table && table.querySelectorAll('tbody tr').length > 0;
      });

      // Active event dot should be visible
      const activeDot = page.locator('.active-event-dot');
      await expect(activeDot).toBeVisible();
    } finally {
      await deleteEmployee(request, employeeId);
    }
  });
});
