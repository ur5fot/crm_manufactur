#!/usr/bin/env node
/**
 * Простой тест валидации birth_date без Playwright
 * Использует fetch API для тестирования endpoints
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let employeeId;

// Helper функция для HTTP запросов
function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: body } });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Тестовые функции
async function testValidBirthDate() {
  console.log('\n✓ Тест 1: Валидная дата рождения');
  const response = await request('PUT', `/api/employees/${employeeId}`, {
    birth_date: '1990-05-15'
  });

  if (response.status === 200 && response.data.employee.birth_date === '1990-05-15') {
    console.log('  ✅ PASSED: Валидная дата сохранена успешно');
    return true;
  } else {
    console.log('  ❌ FAILED:', response.data);
    return false;
  }
}

async function testInvalidFormat() {
  console.log('\n✓ Тест 2: Неправильный формат даты (DD-MM-YYYY)');
  const response = await request('PUT', `/api/employees/${employeeId}`, {
    birth_date: '15-05-1990'
  });

  if (response.status === 400 && response.data.error.includes('Невірний формат')) {
    console.log('  ✅ PASSED: Неправильный формат отклонен');
    return true;
  } else {
    console.log('  ❌ FAILED:', response.data);
    return false;
  }
}

async function testInvalidDate() {
  console.log('\n✓ Тест 3: Невалидная дата (30 февраля)');
  const response = await request('PUT', `/api/employees/${employeeId}`, {
    birth_date: '2000-02-30'
  });

  if (response.status === 400 && response.data.error.includes('Невірна')) {
    console.log('  ✅ PASSED: Невалидная дата отклонена');
    return true;
  } else {
    console.log('  ❌ FAILED:', response.data);
    return false;
  }
}

async function testApril31() {
  console.log('\n✓ Тест 4: Невалидная дата (31 апреля)');
  const response = await request('PUT', `/api/employees/${employeeId}`, {
    birth_date: '2000-04-31'
  });

  if (response.status === 400 && response.data.error.includes('Невірна')) {
    console.log('  ✅ PASSED: 31 апреля отклонено');
    return true;
  } else {
    console.log('  ❌ FAILED:', response.data);
    return false;
  }
}

async function testLeapYear() {
  console.log('\n✓ Тест 5: Валидная дата (29 февраля в високосном году)');
  const response = await request('PUT', `/api/employees/${employeeId}`, {
    birth_date: '2000-02-29'
  });

  if (response.status === 200 && response.data.employee.birth_date === '2000-02-29') {
    console.log('  ✅ PASSED: 29 февраля в високосном году принято');
    return true;
  } else {
    console.log('  ❌ FAILED:', response.data);
    return false;
  }
}

async function testNonLeapYear() {
  console.log('\n✓ Тест 6: Невалидная дата (29 февраля в НЕвисокосном году)');
  const response = await request('PUT', `/api/employees/${employeeId}`, {
    birth_date: '2001-02-29'
  });

  if (response.status === 400 && response.data.error.includes('Невірна')) {
    console.log('  ✅ PASSED: 29 февраля в невисокосном году отклонено');
    return true;
  } else {
    console.log('  ❌ FAILED:', response.data);
    return false;
  }
}

async function testEmptyDate() {
  console.log('\n✓ Тест 7: Очистка даты (пустая строка)');
  const response = await request('PUT', `/api/employees/${employeeId}`, {
    birth_date: ''
  });

  if (response.status === 200 && response.data.employee.birth_date === '') {
    console.log('  ✅ PASSED: Дата успешно очищена');
    return true;
  } else {
    console.log('  ❌ FAILED:', response.data);
    return false;
  }
}

async function testUpdateOnlyBirthDate() {
  console.log('\n✓ Тест 8: Обновление только birth_date (другие даты не изменяются)');

  // Сначала установим обе даты
  let response = await request('PUT', `/api/employees/${employeeId}`, {
    birth_date: '1985-03-20',
    status_start_date: '2024-01-15'
  });

  if (response.status !== 200) {
    console.log('  ❌ FAILED: Не удалось установить начальные даты');
    return false;
  }

  // Теперь обновим только birth_date
  response = await request('PUT', `/api/employees/${employeeId}`, {
    birth_date: '1986-04-25'
  });

  if (response.status === 200 &&
      response.data.employee.birth_date === '1986-04-25' &&
      response.data.employee.status_start_date === '2024-01-15') {
    console.log('  ✅ PASSED: birth_date обновлено, status_start_date не изменено');
    return true;
  } else {
    console.log('  ❌ FAILED:', response.data);
    return false;
  }
}

// Главная функция
async function runTests() {
  console.log('🧪 Запуск тестов валидации birth_date\n');
  console.log('='.repeat(60));

  try {
    // Создаем тестового сотрудника
    console.log('\n📝 Создание тестового сотрудника...');
    const createResponse = await request('POST', '/api/employees', {
      first_name: 'Тест',
      last_name: 'Дата народження',
      middle_name: 'Тестович'
    });

    if (createResponse.status !== 201) {
      throw new Error('Не удалось создать тестового сотрудника');
    }

    employeeId = createResponse.data.employee_id;
    console.log(`  ✅ Создан сотрудник ID=${employeeId}`);

    // Запускаем все тесты
    const results = [];
    results.push(await testValidBirthDate());
    results.push(await testInvalidFormat());
    results.push(await testInvalidDate());
    results.push(await testApril31());
    results.push(await testLeapYear());
    results.push(await testNonLeapYear());
    results.push(await testEmptyDate());
    results.push(await testUpdateOnlyBirthDate());

    // Удаляем тестового сотрудника
    console.log('\n🗑️  Удаление тестового сотрудника...');
    const deleteResponse = await request('DELETE', `/api/employees/${employeeId}`);
    if (deleteResponse.status === 204) {
      console.log('  ✅ Сотрудник удален');
    }

    // Подводим итоги
    console.log('\n' + '='.repeat(60));
    const passed = results.filter(r => r).length;
    const failed = results.filter(r => !r).length;
    console.log(`\n📊 Результаты: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!\n');
      process.exit(0);
    } else {
      console.log(`\n❌ ${failed} тестов провалились\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
  }
}

// Запуск
runTests();
