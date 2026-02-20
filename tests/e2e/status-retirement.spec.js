// @ts-check
const { test, expect } = require('@playwright/test');
const { setupTestData, cleanupTestData, waitForEmployeesLoad } = require('../helpers/test-utils');
const { API_URL } = require('./test-config');

// Utility to get today's date in YYYY-MM-DD format
function getDate(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

// Utility to get date N years ago (using local date, not UTC)
function getDateYearsAgo(years) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  // Use local date instead of UTC to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

test.describe('Status Changes and Retirement', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data before each test
    await setupTestData();

    // Navigate to home and wait for employees to load
    await page.goto('/');
    await page.waitForSelector('.stat-card', { timeout: 10000 });
  });

  test.afterEach(async () => {
    // Cleanup test data after each test
    await cleanupTestData();
  });

  test('Изменить статус сотрудника (отпуск)', async ({ page }) => {
    // Create a new employee first
    await page.goto('/cards');
    await waitForEmployeesLoad(page);

    // Click "Новий працівник" button
    await page.click('button[title="Новий працівник"]');
    await page.waitForTimeout(500);

    // Fill basic employee data using ID selectors
    await page.fill('#last_name', 'Статусов');
    await page.fill('#first_name', 'Петро');

    // Save employee
    await page.click('button:has-text("Зберегти")');
    await page.waitForTimeout(1500);

    // Get created employee ID from API
    const response = await page.request.get(`${API_URL}/api/employees`);
    const data = await response.json();
    const employees = data.employees;
    const newEmployee = employees.find(emp => emp.last_name === 'Статусов' && emp.first_name === 'Петро');
    const employeeId = newEmployee.employee_id;

    // Click on employee in sidebar to load it (required for "Змінити статус" button to appear)
    await page.click(`.employee-card:has-text("Статусов")`);
    await page.waitForTimeout(1500);

    // Now change status to vacation
    await page.click('button:has-text("Змінити статус")');

    // Wait for popup modal
    await page.waitForSelector('.vacation-notification-overlay', { timeout: 5000 });

    // Select vacation status (options[2] = Відпустка)
    const statusPopupSelect = page.locator('.vacation-notification-modal select');
    // Dropdown has empty option first, then slice(1) of employment options
    // Index 0: "", Index 1: "Звільнений", Index 2: "Відпустка", Index 3: "Лікарняний"
    await statusPopupSelect.selectOption({ index: 2 }); // Відпустка

    // Set dates
    const today = getDate(0);
    const endDate = getDate(7);

    await page.locator('.vacation-notification-modal input[type="date"]').first().fill(today);
    await page.locator('.vacation-notification-modal input[type="date"]').nth(1).fill(endDate);

    // Apply status change
    await page.click('.vacation-notification-modal button:has-text("Зберегти подію")');
    await page.waitForTimeout(1500);

    // Verify status updated via API
    const checkResponse = await page.request.get(`${API_URL}/api/employees/${employeeId}`);
    const checkData = await checkResponse.json();
    const updatedEmployee = checkData.employee;

    expect(updatedEmployee.status_start_date).toBe(today);
    expect(updatedEmployee.status_end_date).toBe(endDate);
    expect(updatedEmployee.employment_status).toContain('Відпустка');
  });

  test('Автовосстановление статуса после end_date', async ({ page }) => {
    // Create employee without a status (status will be set via status event)
    const yesterday = getDate(-1);
    const weekAgo = getDate(-7);

    const createResponse = await page.request.post(`${API_URL}/api/employees`, {
      headers: { 'Content-Type': 'application/json' },
      data: { last_name: 'Автостатус', first_name: 'Тест' }
    });
    const createData = await createResponse.json();
    const employeeId = createData.employee_id;

    // Create a status event with an expired end_date (weekAgo to yesterday)
    // This simulates a vacation that already ended
    await page.request.post(`${API_URL}/api/employees/${employeeId}/status-events`, {
      headers: { 'Content-Type': 'application/json' },
      data: { status: 'Відпустка', start_date: weekAgo, end_date: yesterday }
    });

    // Reload page to trigger syncAllStatusEvents (via GET /api/dashboard/events)
    await page.goto('/');
    await page.waitForSelector('.stat-card', { timeout: 10000 });

    // Wait for all network requests to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check employee status via API - should be restored to "Працює" by sync
    const response = await page.request.get(`${API_URL}/api/employees/${employeeId}`);
    const responseData = await response.json();
    const employee = responseData.employee;

    if (employee.employment_status !== 'Працює') {
      console.log('Expected status: Працює, Got:', employee.employment_status);
    }

    expect(employee.employment_status).toBe('Працює');
    expect(employee.status_start_date).toBe('');
    expect(employee.status_end_date).toBe('');
  });

  test('Уведомление о выходе на пенсию', async ({ browser }) => {
    // Create a NEW isolated browser context to ensure fresh Vue state
    const context = await browser.newContext();
    const page = await context.newPage();

    // Setup test data in this fresh context
    await setupTestData();

    // Get retirement age from config
    const configResponse = await page.request.get(`${API_URL}/api/config`);
    const config = await configResponse.json();
    const retirementAge = parseInt(config.retirement_age_years || '60', 10);

    // Create employee reaching retirement age today
    const birthDate = getDateYearsAgo(retirementAge);

    const employeeData = {
      last_name: 'Пенсіонер',
      first_name: 'Тест',
      birth_date: birthDate,
      employment_status: 'Працює'
    };

    const createResponse = await page.request.post(`${API_URL}/api/employees`, {
      data: employeeData
    });
    const createData = await createResponse.json();
    const employeeId = createData.employee_id;

    // Now load the page for the FIRST time in this context
    // This ensures checkRetirementEvents runs with the new employee
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.stat-card', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for all async checks to complete

    // Check if retirement notification appears
    const retirementModal = page.locator('.vacation-notification-overlay:has-text("пенсію")');
    const modalVisible = await retirementModal.isVisible().catch(() => false);

    if (modalVisible) {
      // Verify modal contains employee name
      await expect(retirementModal).toContainText('Пенсіонер');

      // Close modal (× button with force to handle overlay)
      await page.click('.vacation-notification-modal .close-btn', { force: true });
      await page.waitForTimeout(500);
    }

    // Check employee status via API - should be auto-changed to "Звільнений" (options[1])
    const response = await page.request.get(`${API_URL}/api/employees/${employeeId}`);
    const responseData = await response.json();
    const employee = responseData.employee;

    // Debug: log actual status if test fails
    if (employee.employment_status !== 'Звільнений') {
      console.log('Expected status: Звільнений, Got:', employee.employment_status);
      console.log('Birth date:', birthDate, 'Age:', retirementAge);
    }

    expect(employee.employment_status).toBe('Звільнений');

    // Verify audit log entry for auto-dismiss (status change to Звільнений)
    const logsResponse = await page.request.get(`${API_URL}/api/logs`);
    const logsData = await logsResponse.json();
    const logs = logsData.logs;

    const statusChangeLog = logs.find(log =>
      log.employee_id === employeeId &&
      log.action === 'UPDATE' &&
      log.field_name && log.field_name.includes('employment_status') &&
      log.new_value === 'Звільнений'
    );

    expect(statusChangeLog).toBeTruthy();
    expect(statusChangeLog.old_value).toBe('Працює');

    // Cleanup
    await context.close();
    await cleanupTestData();
  });
});
