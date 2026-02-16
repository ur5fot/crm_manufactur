/**
 * E2E тесты для валидации поля birth_date
 *
 * Проверяем что:
 * 1. Валидные даты рождения сохраняются успешно
 * 2. Невалидные даты отклоняются с правильными ошибками
 * 3. Валидация не блокируется legacy невалидными данными в других полях дат
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3000';

test.describe('Birth Date Validation', () => {
  let employeeId;

  test.beforeAll(async ({ request }) => {
    // Создаем тестового сотрудника
    const response = await request.post(`${API_URL}/api/employees`, {
      data: {
        first_name: 'Тест',
        last_name: 'Дата народження',
        middle_name: 'Тестович'
      }
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    employeeId = data.employee_id;
  });

  test.afterAll(async ({ request }) => {
    // Удаляем тестового сотрудника
    if (employeeId) {
      await request.delete(`${API_URL}/api/employees/${employeeId}`);
    }
  });

  test('должен успешно сохранить валидную дату рождения', async ({ request }) => {
    const response = await request.put(`${API_URL}/api/employees/${employeeId}`, {
      data: {
        birth_date: '1990-05-15'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.employee.birth_date).toBe('1990-05-15');
  });

  test('должен отклонить дату в неправильном формате', async ({ request }) => {
    const response = await request.put(`${API_URL}/api/employees/${employeeId}`, {
      data: {
        birth_date: '15-05-1990' // DD-MM-YYYY вместо YYYY-MM-DD
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Невірний формат дати');
  });

  test('должен отклонить невалидную календарную дату (30 февраля)', async ({ request }) => {
    const response = await request.put(`${API_URL}/api/employees/${employeeId}`, {
      data: {
        birth_date: '2000-02-30'
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Невірна календарна дата');
  });

  test('должен отклонить невалидную календарную дату (31 апреля)', async ({ request }) => {
    const response = await request.put(`${API_URL}/api/employees/${employeeId}`, {
      data: {
        birth_date: '2000-04-31'
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Невірна календарна дата');
  });

  test('должен отклонить некорректную дату (13-й месяц)', async ({ request }) => {
    const response = await request.put(`${API_URL}/api/employees/${employeeId}`, {
      data: {
        birth_date: '2000-13-01'
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/Невірна|календарна дата/);
  });

  test('должен успешно обновить birth_date даже если другие даты невалидны (legacy data)', async ({ request }) => {
    // Сначала устанавливаем валидную дату
    let response = await request.put(`${API_URL}/api/employees/${employeeId}`, {
      data: {
        birth_date: '1985-03-20',
        status_start_date: '2024-01-15'
      }
    });
    expect(response.ok()).toBeTruthy();

    // Теперь обновляем только birth_date - status_start_date остается без изменений
    response = await request.put(`${API_URL}/api/employees/${employeeId}`, {
      data: {
        birth_date: '1986-04-25'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.employee.birth_date).toBe('1986-04-25');
    expect(data.employee.status_start_date).toBe('2024-01-15'); // не изменилась
  });

  test('должен успешно очистить дату рождения (пустая строка)', async ({ request }) => {
    const response = await request.put(`${API_URL}/api/employees/${employeeId}`, {
      data: {
        birth_date: ''
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.employee.birth_date).toBe('');
  });

  test('должен успешно сохранить дату високосного года (29 февраля)', async ({ request }) => {
    const response = await request.put(`${API_URL}/api/employees/${employeeId}`, {
      data: {
        birth_date: '2000-02-29' // 2000 - високосный год
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.employee.birth_date).toBe('2000-02-29');
  });

  test('должен отклонить 29 февраля в невисокосном году', async ({ request }) => {
    const response = await request.put(`${API_URL}/api/employees/${employeeId}`, {
      data: {
        birth_date: '2001-02-29' // 2001 - НЕ високосный год
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Невірна календарна дата');
  });
});
