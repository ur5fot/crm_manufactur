# Догани та відзнаки співробітників

## Overview
- Додати в картку співробітника розділ «Догани та відзнаки» з можливістю додавання, редагування, перегляду та видалення записів
- Кожен запис містить: дату, тип (догана/сувора догана/подяка/грамота/премія/тощо), номер наказу, примітку (за що)
- Історія зберігається в окремому CSV файлі за паттерном `status_history.csv`
- UI: кнопка біля полів форми (або окрема секція) → модальне вікно з таблицею + форма додавання

## Context (from discovery)
- Існуючий паттерн для повторення: `status_history.csv` → `store.js` (load/add/remove з write lock) → `routes/employees.js` (GET endpoint) → `useStatusManagement.js` (composable) → `EmployeeCardsView.vue` (popup)
- Files/components involved:
  - `server/src/schema.js` — додати REPRIMAND_COLUMNS
  - `server/src/store.js` — додати load/add/remove функції з write lock
  - `server/src/routes/employees.js` — додати GET/POST/PUT/DELETE endpoints
  - `client/src/api.js` — додати API методи
  - `client/src/composables/useReprimands.js` — новий composable
  - `client/src/views/EmployeeCardsView.vue` — UI секція + popup
  - `data/reprimands.csv` — новий CSV файл
- Related patterns:
  - `STATUS_HISTORY_COLUMNS` в schema.js
  - `loadStatusHistory()`, `addStatusHistoryEntry()`, `removeStatusHistoryForEmployee()` в store.js
  - `GET /api/employees/:id/status-history` в routes/employees.js
  - `useStatusManagement.js` composable (openStatusHistoryPopup, formatHistoryTimestamp)

## Development Approach
- **Testing approach**: Regular (код спочатку, потім тести)
- Повторюємо паттерн status_history 1:1
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**
- **CRITICAL: update this plan file when scope changes during implementation**

## Testing Strategy
- **Unit tests**: `server/test/reprimands-api.test.js` — тести API endpoints
- **E2E tests**: `tests/e2e/reprimands.spec.js` — тести UI

## Progress Tracking
- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix

## Implementation Steps

### Task 1: Add CSV schema and store functions
- [x] Add `REPRIMAND_COLUMNS` to `server/src/schema.js`:
  ```
  record_id, employee_id, record_date, record_type, order_number, note, created_at
  ```
- [x] Add to `server/src/store.js`:
  - `REPRIMANDS_PATH` constant
  - `reprimandWriteLock` promise-based lock
  - `loadReprimands()` — read CSV
  - `addReprimand(data)` — add entry with auto-increment record_id + created_at timestamp
  - `updateReprimand(recordId, data)` — update existing record fields by ID
  - `deleteReprimand(recordId)` — hard delete single record by ID
  - `removeReprimandsForEmployee(employeeId)` — delete all records for employee (cleanup on employee delete)
- [x] Ensure CSV file auto-created with headers on first read (ensureCsvFile pattern)
- [x] Write unit test `server/test/reprimands-store.test.js` — test load/add/update/delete functions
- [x] Run tests: `cd server && npm test` — must pass before next task

### Task 2: Add API endpoints
- [x] Add to `server/src/routes/employees.js`:
  - `GET /api/employees/:id/reprimands` — list reprimands for employee, sorted by record_date desc
  - `POST /api/employees/:id/reprimands` — create new reprimand (validate: record_date, record_type required)
  - `PUT /api/employees/:id/reprimands/:recordId` — update existing reprimand (validate: record_date, record_type required)
  - `DELETE /api/employees/:id/reprimands/:recordId` — delete single reprimand by ID
- [x] Add audit log entries for POST, PUT and DELETE operations
- [x] Add cleanup call in DELETE employee endpoint (removeReprimandsForEmployee)
- [x] Write integration test `server/test/reprimands-api.test.js` — test all 4 endpoints (success + error cases)
- [x] Run tests: `cd server && npm test` — must pass before next task

### Task 3: Add frontend API methods and composable
- [ ] Add to `client/src/api.js`:
  - `getEmployeeReprimands(id)` — GET
  - `addEmployeeReprimand(id, data)` — POST
  - `updateEmployeeReprimand(employeeId, recordId, data)` — PUT
  - `deleteEmployeeReprimand(employeeId, recordId)` — DELETE
- [ ] Create `client/src/composables/useReprimands.js`:
  - State: `showReprimandsPopup`, `reprimandsLoading`, `reprimands`, `showReprimandForm`, `editingReprimandId` (null = creating, string = editing), `reprimandForm` (reactive: record_date, record_type, order_number, note), `reprimandSaving`
  - Functions: `openReprimandsPopup(employeeId)`, `closeReprimandsPopup()`, `openAddForm()`, `openEditForm(record)`, `closeReprimandForm()`, `submitReprimand(employeeId)` (creates or updates based on editingReprimandId), `deleteReprimandEntry(employeeId, recordId)`, `formatReprimandDate(dateStr)`
  - `record_type` options: `['Догана', 'Сувора догана', 'Зауваження', 'Попередження', 'Подяка', 'Грамота', 'Премія', 'Нагорода']`
- [ ] Run tests: `cd server && npm test` — must pass before next task

### Task 4: Add UI to EmployeeCardsView
- [ ] Add button «Догани та відзнаки» in EmployeeCardsView (near status section or as separate section) with clock-like icon
- [ ] Add popup modal in EmployeeCardsView template following status-history-modal pattern:
  - Table with columns: Дата, Тип, № наказу, Примітка, Дії (редагувати/видалити)
  - «Додати запис» button opens inline form (date + type select + order_number input + note textarea)
  - Edit button per row — opens same form pre-filled with record data, submit updates record
  - Delete button per row with confirm()
  - Empty state: «Записи відсутні»
  - Loading state: «Завантаження...»
- [ ] Import and wire `useReprimands` composable in EmployeeCardsView
- [ ] Add Escape key handler for popup in handleGlobalKeydown
- [ ] Verify in browser: open popup, add record, edit record, see it in table, delete record
- [ ] Write E2E test `tests/e2e/reprimands.spec.js` — test add, edit, view, delete reprimand
- [ ] Run tests: `npm run test:e2e` — must pass before next task

### Task 5: Verify acceptance criteria
- [ ] Verify: can add dogana with all fields (date, type, order number, note)
- [ ] Verify: can add vidznaka with all fields
- [ ] Verify: history table shows records sorted by date desc
- [ ] Verify: can edit existing record (all fields update correctly)
- [ ] Verify: can delete individual records with confirmation
- [ ] Verify: deleting employee cleans up reprimand records
- [ ] Run full test suite: `cd server && npm test`
- [ ] Run E2E tests: `npm run test:e2e`

### Task 6: [Final] Update documentation
- [ ] Update CLAUDE.md: add reprimands CSV to Data Files Overview, add API endpoints, add composable description
- [ ] Update README.md if needed (new feature description)

*Note: ralphex automatically moves completed plans to `docs/plans/completed/`*

## Technical Details

### CSV Structure (`data/reprimands.csv`)
```
record_id;employee_id;record_date;record_type;order_number;note;created_at
1;5;2026-01-15;Догана;№123;Порушення трудової дисципліни;2026-02-17T10:30:00.000Z
2;5;2026-02-10;Подяка;№45;За успішне виконання проєкту;2026-02-17T11:00:00.000Z
```

### Record Type Options (select field)
- Догана
- Сувора догана
- Зауваження
- Попередження
- Подяка
- Грамота
- Премія
- Нагорода

### API Endpoints
- `GET /api/employees/:id/reprimands` → `{ reprimands: [...] }`
- `POST /api/employees/:id/reprimands` body: `{ record_date, record_type, order_number, note }` → `{ reprimand: {...} }`
- `PUT /api/employees/:id/reprimands/:recordId` body: `{ record_date, record_type, order_number, note }` → `{ reprimand: {...} }`
- `DELETE /api/employees/:id/reprimands/:recordId` → 204

## Post-Completion

**Manual verification:**
- Перевірити додавання різних типів записів
- Перевірити редагування існуючих записів
- Перевірити видалення записів
- Перевірити що при видаленні співробітника записи очищуються
- Перевірити відображення порожнього стану
