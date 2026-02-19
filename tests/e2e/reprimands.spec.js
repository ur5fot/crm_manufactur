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
    data: { first_name: 'ReprimandTest', last_name: 'Employee', gender: 'Чоловіча' }
  });
  const createData = await createResp.json();
  return createData.employee_id;
}

test.describe('Reprimands (Dogany ta Vidznaky)', () => {
  test.beforeAll(async ({ request }) => {
    testEmployeeId = await ensureTestEmployee(request);
  });

  test('Dogany ta vidznaky button is visible next to employment status', async ({ page }) => {
    await page.goto(`${BASE_URL}/cards/${testEmployeeId}`);
    await page.waitForSelector('.status-field-row');

    const btn = page.locator('.status-field-row button[title="Догани та відзнаки"]');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText(/Догани та відзнаки/);
  });

  test('clicking the button opens reprimands popup', async ({ page }) => {
    await page.goto(`${BASE_URL}/cards/${testEmployeeId}`);
    await page.waitForSelector('.status-field-row');

    await page.click('.status-field-row button[title="Догани та відзнаки"]');

    const modal = page.locator('.reprimands-modal');
    await expect(modal).toBeVisible();

    const header = modal.locator('.card-header h3');
    await expect(header).toHaveText('📋 Догани та відзнаки');
  });

  test('popup shows empty state when no records', async ({ page, request }) => {
    const createResp = await request.post(`${API_URL}/api/employees`, {
      data: { first_name: 'NoRecords', last_name: 'TestEmpty', gender: 'Жіноча' }
    });
    const { employee_id } = await createResp.json();

    try {
      await page.goto(`${BASE_URL}/cards/${employee_id}`);
      await page.waitForFunction(
        (id) => document.querySelector('#employee_id')?.value === id,
        employee_id
      );
      await page.waitForSelector('.status-field-row');

      await page.click('.status-field-row button[title="Догани та відзнаки"]');

      const modal = page.locator('.reprimands-modal');
      await expect(modal).toBeVisible();

      const emptyMsg = modal.locator('.status-history-empty');
      await expect(emptyMsg).toBeVisible();
      await expect(emptyMsg).toHaveText('Записи відсутні.');
    } finally {
      await request.delete(`${API_URL}/api/employees/${employee_id}`);
    }
  });

  test('can add a reprimand record', async ({ page, request }) => {
    const createResp = await request.post(`${API_URL}/api/employees`, {
      data: { first_name: 'AddRecord', last_name: 'TestAdd', gender: 'Чоловіча' }
    });
    const { employee_id } = await createResp.json();

    try {
      await page.goto(`${BASE_URL}/cards/${employee_id}`);
      await page.waitForFunction(
        (id) => document.querySelector('#employee_id')?.value === id,
        employee_id
      );
      await page.waitForSelector('.status-field-row');

      await page.click('.status-field-row button[title="Догани та відзнаки"]');

      const modal = page.locator('.reprimands-modal');
      await expect(modal).toBeVisible();

      // Click "Додати запис"
      await modal.locator('.button-group .primary').click();

      // Fill in the form
      const form = modal.locator('.reprimand-form');
      await expect(form).toBeVisible();

      await form.locator('input[type="date"]').fill('2026-01-15');
      await form.locator('select').selectOption('Догана');
      await form.locator('input[type="text"]').fill('№123');
      await form.locator('textarea').fill('Порушення трудової дисципліни');

      // Submit
      await modal.locator('.button-group .primary').click();

      // After submit, the table should now appear with the record
      const table = modal.locator('.status-history-table');
      await expect(table).toBeVisible();

      const rows = table.locator('tbody tr');
      await expect(rows).toHaveCount(1);

      const firstRow = rows.first();
      await expect(firstRow).toContainText('15.01.2026');
      await expect(firstRow).toContainText('Догана');
      await expect(firstRow).toContainText('№123');
      await expect(firstRow).toContainText('Порушення трудової дисципліни');
    } finally {
      await request.delete(`${API_URL}/api/employees/${employee_id}`);
    }
  });

  test('can add a commendation record', async ({ page, request }) => {
    const createResp = await request.post(`${API_URL}/api/employees`, {
      data: { first_name: 'AddComm', last_name: 'TestComm', gender: 'Жіноча' }
    });
    const { employee_id } = await createResp.json();

    try {
      await page.goto(`${BASE_URL}/cards/${employee_id}`);
      await page.waitForFunction(
        (id) => document.querySelector('#employee_id')?.value === id,
        employee_id
      );
      await page.waitForSelector('.status-field-row');

      await page.click('.status-field-row button[title="Догани та відзнаки"]');

      const modal = page.locator('.reprimands-modal');
      await expect(modal).toBeVisible();

      await modal.locator('.button-group .primary').click();

      const form = modal.locator('.reprimand-form');
      await form.locator('input[type="date"]').fill('2026-02-10');
      await form.locator('select').selectOption('Подяка');
      await form.locator('input[type="text"]').fill('№45');
      await form.locator('textarea').fill('За успішне виконання проєкту');

      await modal.locator('.button-group .primary').click();

      const table = modal.locator('.status-history-table');
      await expect(table).toBeVisible();

      const firstRow = table.locator('tbody tr').first();
      await expect(firstRow).toContainText('Подяка');
      await expect(firstRow).toContainText('№45');
    } finally {
      await request.delete(`${API_URL}/api/employees/${employee_id}`);
    }
  });

  test('can edit an existing record', async ({ page, request }) => {
    const createResp = await request.post(`${API_URL}/api/employees`, {
      data: { first_name: 'EditRecord', last_name: 'TestEdit', gender: 'Чоловіча' }
    });
    const { employee_id } = await createResp.json();

    try {
      // Create a reprimand via API
      await request.post(`${API_URL}/api/employees/${employee_id}/reprimands`, {
        data: {
          record_date: '2026-01-10',
          record_type: 'Зауваження',
          order_number: '№99',
          note: 'Початкова нотатка'
        }
      });

      await page.goto(`${BASE_URL}/cards/${employee_id}`);
      await page.waitForFunction(
        (id) => document.querySelector('#employee_id')?.value === id,
        employee_id
      );
      await page.waitForSelector('.status-field-row');

      await page.click('.status-field-row button[title="Догани та відзнаки"]');

      const modal = page.locator('.reprimands-modal');
      await expect(modal).toBeVisible();

      const table = modal.locator('.status-history-table');
      await expect(table).toBeVisible();

      // Click edit on the first row
      const editBtn = table.locator('tbody tr').first().locator('.secondary.small');
      await editBtn.click();

      // Edit form should appear
      const form = modal.locator('.reprimand-form');
      await expect(form).toBeVisible();
      const heading = form.locator('h4');
      await expect(heading).toHaveText('Редагування запису');

      // Change the type to Подяка
      await form.locator('select').selectOption('Подяка');
      await form.locator('textarea').fill('Оновлена нотатка');

      // Submit the edit
      await modal.locator('.button-group .primary').click();

      // Record should now show updated type
      const updatedTable = modal.locator('.status-history-table');
      await expect(updatedTable).toBeVisible();
      await expect(updatedTable.locator('tbody tr').first()).toContainText('Подяка');
      await expect(updatedTable.locator('tbody tr').first()).toContainText('Оновлена нотатка');
    } finally {
      await request.delete(`${API_URL}/api/employees/${employee_id}`);
    }
  });

  test('can delete a record', async ({ page, request }) => {
    const createResp = await request.post(`${API_URL}/api/employees`, {
      data: { first_name: 'DeleteRecord', last_name: 'TestDel', gender: 'Чоловіча' }
    });
    const { employee_id } = await createResp.json();

    try {
      // Create a reprimand via API
      await request.post(`${API_URL}/api/employees/${employee_id}/reprimands`, {
        data: {
          record_date: '2026-01-10',
          record_type: 'Зауваження',
          order_number: '№99',
          note: 'Запис для видалення'
        }
      });

      await page.goto(`${BASE_URL}/cards/${employee_id}`);
      await page.waitForFunction(
        (id) => document.querySelector('#employee_id')?.value === id,
        employee_id
      );
      await page.waitForSelector('.status-field-row');

      await page.click('.status-field-row button[title="Догани та відзнаки"]');

      const modal = page.locator('.reprimands-modal');
      await expect(modal).toBeVisible();

      const table = modal.locator('.status-history-table');
      await expect(table).toBeVisible();
      await expect(table.locator('tbody tr')).toHaveCount(1);

      // Accept the confirm dialog and click delete
      page.once('dialog', dialog => dialog.accept());
      await table.locator('tbody tr').first().locator('.danger.small').click();

      // After deletion, empty state should be shown
      const emptyMsg = modal.locator('.status-history-empty');
      await expect(emptyMsg).toBeVisible();
      await expect(emptyMsg).toHaveText('Записи відсутні.');
    } finally {
      await request.delete(`${API_URL}/api/employees/${employee_id}`);
    }
  });

  test('popup can be closed with close button', async ({ page }) => {
    await page.goto(`${BASE_URL}/cards/${testEmployeeId}`);
    await page.waitForSelector('.status-field-row');

    await page.click('.status-field-row button[title="Догани та відзнаки"]');

    const modal = page.locator('.reprimands-modal');
    await expect(modal).toBeVisible();

    await modal.locator('.close-btn').click();
    await expect(modal).not.toBeVisible();
  });

  test('popup can be closed with Escape key', async ({ page }) => {
    await page.goto(`${BASE_URL}/cards/${testEmployeeId}`);
    await page.waitForSelector('.status-field-row');

    await page.click('.status-field-row button[title="Догани та відзнаки"]');

    const modal = page.locator('.reprimands-modal');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('table shows records sorted by date descending', async ({ page, request }) => {
    const createResp = await request.post(`${API_URL}/api/employees`, {
      data: { first_name: 'SortTest', last_name: 'TestSort', gender: 'Чоловіча' }
    });
    const { employee_id } = await createResp.json();

    try {
      // Add two records with different dates
      await request.post(`${API_URL}/api/employees/${employee_id}/reprimands`, {
        data: { record_date: '2025-06-01', record_type: 'Зауваження', order_number: '№1', note: 'Перший запис' }
      });
      await request.post(`${API_URL}/api/employees/${employee_id}/reprimands`, {
        data: { record_date: '2026-01-15', record_type: 'Подяка', order_number: '№2', note: 'Другий запис' }
      });

      await page.goto(`${BASE_URL}/cards/${employee_id}`);
      await page.waitForFunction(
        (id) => document.querySelector('#employee_id')?.value === id,
        employee_id
      );
      await page.waitForSelector('.status-field-row');

      await page.click('.status-field-row button[title="Догани та відзнаки"]');

      const modal = page.locator('.reprimands-modal');
      await expect(modal).toBeVisible();

      const table = modal.locator('.status-history-table');
      await expect(table).toBeVisible();

      const rows = table.locator('tbody tr');
      await expect(rows).toHaveCount(2);

      // First row should be the most recent (2026-01-15 = Подяка)
      await expect(rows.first()).toContainText('Подяка');
      // Second row should be older (2025-06-01 = Зауваження)
      await expect(rows.nth(1)).toContainText('Зауваження');
    } finally {
      await request.delete(`${API_URL}/api/employees/${employee_id}`);
    }
  });
});
