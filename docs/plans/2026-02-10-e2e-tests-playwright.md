# План: Внедрить E2E-тестирование с Playwright для полного тестирования UI + API системы CRM

## Описание

Внедрить E2E-тестирование с Playwright для полного тестирования UI + API системы CRM

## Файлы

**Files involved:**
- Create: `playwright.config.js` (root)
- Create: `tests/e2e/*.spec.js` (test files)
- Create: `tests/fixtures/test-data.csv` (test data)
- Modify: `package.json` (root - add Playwright dependencies)
- Modify: `server/package.json` (add test script)
- Modify: `client/package.json` (add test script)
- Create: `.github/workflows/tests.yml` (optional CI)

**Related patterns:** Existing manual tests in `server/test/`

**Dependencies:** `@playwright/test` (E2E framework), playwright browsers

## Подход к реализации

- **Testing approach**: Regular (implement features, then write E2E tests)
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

**Playwright выбран потому что:**
- Лучший современный инструмент для E2E (cross-browser, автоматический ожидание)
- Встроенные fixtures и assertions
- Поддержка API testing + UI testing в одном фреймворке
- Отличная документация и developer experience

## Шаги реализации

### TASK 1: Setup Playwright + Configuration

**Files:**
- Create: `playwright.config.js` (root)
- Modify: `package.json` (root)

**Steps:**
- [x] `npm init -y` в root (если нет package.json)
- [x] `npm install -D @playwright/test`
- [x] `npx playwright install chromium`
- [x] Создать `playwright.config.js` с базовой конфигурацией:
  - Base URL: `http://localhost:5173`
  - API URL: `http://localhost:3000`
  - Timeout: 30s
  - Workers: 1 (для последовательного выполнения)
  - Test directory: `tests/e2e`
  - Screenshot on failure: yes
- [x] Добавить npm scripts в root `package.json`:
  - `"test:e2e": "playwright test"`
  - `"test:e2e:ui": "playwright test --ui"`
  - `"test:e2e:headed": "playwright test --headed"`
- [x] `npx playwright test --help` (проверить что Playwright установлен)

---

### TASK 2: Prepare Test Environment + Fixtures

**Files:**
- Create: `tests/fixtures/test-data.csv` (sample employees)
- Create: `tests/fixtures/test-fields-schema.csv` (copy from data/)
- Create: `tests/helpers/test-utils.js` (utilities)

**Steps:**
- [x] Создать `tests/fixtures/test-data.csv` с 3-5 тестовыми сотрудниками (UTF-8 BOM, semicolon delimiter)
- [x] Скопировать `data/fields_schema.csv` → `tests/fixtures/test-fields-schema.csv`
- [x] Создать `tests/helpers/test-utils.js` с функциями:
  - `setupTestData()` - копирует test-data.csv в data/employees.csv перед тестами
  - `cleanupTestData()` - удаляет тестовые файлы после тестов
  - `waitForEmployeesLoad()` - ожидает загрузки списка сотрудников в UI
  - `createTestEmployee()` - helper для создания нового сотрудника через API
- [x] Написать базовый тест `tests/e2e/setup.spec.js`:
  - Проверить что сервер отвечает `GET /api/employees`
  - Проверить что клиент доступен по `localhost:5173`
- [x] `npm run test:e2e` (должен пройти setup test)

---

### TASK 3: E2E Tests - CRUD Operations (Employee Cards)

**Files:**
- Create: `tests/e2e/employee-crud.spec.js`

**Steps:**
- [x] Test: "Создать нового сотрудника"
  - Navigate to `/cards`
  - Click "Новий працівник" button
  - Fill form fields (last_name, first_name, employment_status)
  - Click "Зберегти"
  - Assert employee appears in sidebar list
  - Assert API created employee (`GET /api/employees/:id`)
- [x] Test: "Редактировать существующего сотрудника"
  - Load employee from sidebar
  - Edit field (position = "Инженер")
  - Click "Зберегти"
  - Assert field updated in UI
  - Assert API saved change (`GET /api/employees/:id`)
  - Assert audit log entry created (`GET /api/logs`)
- [x] Test: "Удалить сотрудника с подтверждением"
  - Load employee
  - Click delete button (trash icon)
  - Assert confirmation dialog appears
  - Click "Так, видалити"
  - Assert employee removed from list
  - Assert API deleted employee (`GET /api/employees` returns 404)
- [x] Test: "Отменить удаление сотрудника"
  - Load employee
  - Click delete button
  - Click "Скасувати" in dialog
  - Assert employee still exists
- [x] `npm run test:e2e tests/e2e/employee-crud.spec.js` (все тесты должны пройти)

---

### TASK 4: E2E Tests - Documents Upload

**Files:**
- Create: `tests/e2e/documents.spec.js`
- Create: `tests/fixtures/test-passport.pdf` (dummy PDF)
- Create: `tests/fixtures/test-photo.jpg` (dummy image)

**Steps:**
- [x] Создать dummy файлы для тестирования upload
- [x] Test: "Загрузить документ с датами"
  - Navigate to employee card
  - Scroll to Documents section
  - Click "Завантажити" for id_certificate_file
  - Upload test-passport.pdf
  - Fill issue_date and expiry_date
  - Click "Завантажити" in popup
  - Assert file appears in documents table
  - Assert dates displayed correctly
  - Assert file exists in `files/employee_{id}/` via API
- [x] Test: "Удалить документ"
  - Load employee with document
  - Click delete icon for document
  - Assert document removed from UI
  - Assert file deleted from filesystem (API check)
- [x] Test: "Открыть папку сотрудника"
  - Click "Відкрити папку"
  - Assert API endpoint called `POST /api/employees/:id/open-folder`
  - (Note: cannot verify OS file explorer opened in E2E)
- [x] `npm run test:e2e tests/e2e/documents.spec.js` (все тесты должны пройти)

---

### TASK 5: E2E Tests - Table View + Filters

**Files:**
- Create: `tests/e2e/table-filters.spec.js`

**Steps:**
- [x] Test: "Отобразить таблицу с сотрудниками"
  - Navigate to `/table`
  - Assert table renders with data
  - Assert columns match fields_schema show_in_table=yes
- [x] Test: "Фильтровать по статусу (multi-select)"
  - Open employment_status filter
  - Check "Відпустка" checkbox
  - Assert table shows only vacation employees
  - Check "(Пусто)" checkbox
  - Assert table includes employees with empty status
- [x] Test: "Поиск по тексту"
  - Type "Іванов" in search field
  - Assert table filters to matching rows
- [x] Test: "Inline редактирование ячейки"
  - Double-click on editable cell (position)
  - Edit value
  - Press Enter
  - Assert value saved (check API)
  - Assert audit log created
- [x] `npm run test:e2e tests/e2e/table-filters.spec.js` (все тесты должны пройти)

---

### TASK 6: E2E Tests - Custom Reports + CSV Export

**Files:**
- Create: `tests/e2e/reports.spec.js`

**Steps:**
- [x] Test: "Создать фильтр и получить результаты"
  - Navigate to `/reports`
  - Select field: employment_status
  - Select condition: contains
  - Enter value: "Працює"
  - Click "Додати фільтр"
  - Assert filter added to active filters list
  - Assert preview table shows filtered employees
- [x] Test: "Экспортировать отчёт в CSV"
  - Apply filter (status = "Працює")
  - Select columns for export (last_name, first_name, position)
  - Click "Експорт в CSV"
  - Assert CSV file downloaded with correct filename format
  - Assert CSV contains only selected columns and filtered rows
  - Assert UTF-8 BOM encoding (check file signature)
- [x] Test: "Множественные фильтры (AND logic)"
  - Add filter: position contains "Инженер"
  - Add filter: salary > 5000
  - Assert preview shows employees matching both conditions
- [x] `npm run test:e2e tests/e2e/reports.spec.js` (все тесты должны пройти)

---

### TASK 7: E2E Tests - CSV Import

**Files:**
- Create: `tests/e2e/import.spec.js`
- Create: `tests/fixtures/import-valid.csv` (valid data)
- Create: `tests/fixtures/import-invalid.csv` (invalid data)

**Steps:**
- [x] Test: "Импортировать валидный CSV"
  - Navigate to `/import`
  - Upload import-valid.csv (3 новых сотрудника)
  - Assert success message with count
  - Navigate to `/table`
  - Assert imported employees appear in table
- [x] Test: "Импорт с ошибками (invalid data)"
  - Upload import-invalid.csv (missing required fields)
  - Assert error messages displayed
  - Assert no employees created (check API)
- [x] Test: "Скачать шаблон CSV"
  - Click "Завантажити шаблон CSV"
  - Assert template file downloaded
  - Assert template matches employees_import_sample.csv structure
- [x] `npm run test:e2e tests/e2e/import.spec.js` (все тесты должны пройти)

---

### TASK 8: E2E Tests - Dashboard + Notifications

**Files:**
- Create: `tests/e2e/dashboard.spec.js`

**Steps:**
- [x] Test: "Отобразить статистику по статусам"
  - Navigate to `/` (dashboard)
  - Assert stat cards render with counts
  - Assert total employees count correct
- [x] Test: "Развернуть список сотрудников по статусу"
  - Click on "Відпустка" stat card
  - Assert accordion expands with employee names
  - Assert employee names are clickable links
  - Click employee name
  - Assert navigates to `/cards/:id`
- [x] Test: "Уведомление о окончании документов"
  - Create employee with expiring document (expiry_date = today + 3 days)
  - Reload dashboard
  - Assert notification popup appears
  - Assert document expiry event in timeline
- [x] Test: "Уведомление о днях рождения"
  - Create employee with birthday today
  - Reload dashboard
  - Assert birthday notification appears with cake emoji
- [x] Test: "Auto-refresh dashboard"
  - Load dashboard
  - Wait for auto-refresh interval (check lastUpdate timestamp changes)
  - Assert data refreshed without page reload
- [x] `npm run test:e2e tests/e2e/dashboard.spec.js` (все тесты должны пройти)

---

### TASK 9: E2E Tests - Status Changes + Retirement

**Files:**
- Create: `tests/e2e/status-retirement.spec.js`

**Steps:**
- [x] Test: "Изменить статус сотрудника (отпуск)"
  - Load employee (status = "Працює")
  - Click "Змінити статус"
  - Select "Відпустка" from dropdown
  - Set start_date = today, end_date = today + 7 days
  - Click "Застосувати"
  - Assert status updated in UI
  - Assert status_start_date and status_end_date saved (API check)
- [x] Test: "Автовосстановление статуса после end_date"
  - Create employee with status="Відпустка", end_date = yesterday
  - Call `GET /api/employees` (triggers checkStatusChanges)
  - Assert status restored to "Працює" (options[0])
  - Assert dates cleared
- [x] Test: "Уведомление о выходе на пенсию"
  - Create employee with birth_date = retirement_age_years ago today
  - Reload page
  - Assert retirement notification appears
  - Assert employee status auto-changed to "Звільнений" (options[1])
  - Assert audit log entry for auto-dismiss
- [x] `npm run test:e2e tests/e2e/status-retirement.spec.js` (все тесты должны пройти)

---

### TASK 10: E2E Tests - Audit Logs

**Files:**
- Create: `tests/e2e/logs.spec.js`

**Steps:**
- [x] Test: "Просмотр логов изменений"
  - Navigate to `/logs`
  - Assert logs table renders
  - Assert newest logs appear first (sorted by timestamp desc)
- [x] Test: "Поиск логов по сотруднику"
  - Create employee "Test Логів"
  - Edit employee (change position)
  - Delete employee
  - Navigate to `/logs`
  - Search for "Test Логів"
  - Assert 3 log entries: CREATE, UPDATE, DELETE
  - Assert UPDATE log shows old_value and new_value
- [x] `npm run test:e2e tests/e2e/logs.spec.js` (все тесты должны пройти)

---

### TASK 11: Fix All Test Failures + Debugging

**Files:**
- Modify: `tests/e2e/*.spec.js` (fix failing tests)
- Modify: `server/src/*.js` (fix bugs found by tests)
- Modify: `client/src/App.vue` (fix bugs found by tests)

**Steps:**
- [x] `npm run test:e2e` (run all tests)
- [x] For each failing test:
  - Analyze failure screenshot (`test-results/`)
  - Check Playwright trace (`npx playwright show-trace`)
  - Identify root cause (bug in code vs test issue)
  - Fix code or test accordingly
- [x] Re-run tests until all pass: `npm run test:e2e`
- [x] Verify test coverage covers main user flows (CRUD, documents, reports, import, dashboard, logs)
- [x] Run tests 3 times to ensure stability (no flaky tests)

---

### TASK 12: Add Test Documentation + CI (optional)

**Files:**
- Create: `tests/README.md`
- Create: `.github/workflows/tests.yml` (optional)

**Steps:**
- [ ] Создать `tests/README.md` с инструкциями:
  - Как запустить тесты локально
  - Как запустить отдельный тест
  - Как использовать Playwright UI mode для debugging
  - Требования: запущенные сервера (`./run.sh`)
- [ ] (Optional) Создать `.github/workflows/tests.yml`:
  - Install dependencies
  - Start server + client
  - Run Playwright tests
  - Upload test artifacts on failure
- [ ] Обновить `CLAUDE.md`:
  - Добавить секцию "Testing" с описанием E2E tests
  - Добавить команды для запуска тестов

---

## Финальная проверка

- [ ] Manual test: Запустить `./run.sh`, затем `npm run test:e2e` - все тесты должны пройти
- [ ] Run full test suite: `npm run test:e2e` (all green)
- [ ] Verify test reports in `test-results/` and `playwright-report/`
- [ ] Check test coverage: все основные user flows покрыты (CRUD, documents, reports, import, dashboard, logs, status changes)

## После завершения

- [ ] Update `README.md`: add Testing section with test commands
- [ ] Update `CLAUDE.md`: add Testing approach and E2E patterns
- [ ] (Optional) Move this plan to `docs/plans/completed/`
