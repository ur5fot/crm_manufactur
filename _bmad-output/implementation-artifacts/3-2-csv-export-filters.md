# Story 3.2: Експорт фільтрації в CSV

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a адміністратор,
I want експортувати результати поточної фільтрації зведеної таблиці у CSV файл,
So that я можу передати точні дані керівництву у форматі Excel.

## Acceptance Criteria

1. **Given** сервер працює **When** клієнт надсилає `GET /api/export` з query parameters фільтрів (status, location, department та інші select-поля) **Then** сервер повертає CSV файл з `Content-Disposition: attachment; filename="employees_export.csv"` **And** CSV файл має UTF-8 BOM кодування (NFR8) **And** роздільник `;` (NFR9) **And** експорт завершується менше ніж за 5 секунд (NFR4)

2. **Given** Table view активний з активними фільтрами **When** адміністратор бачить відфільтровану таблицю **Then** відображається кнопка "Експорт" (Primary button стиль)

3. **Given** Table view з активними фільтрами **When** адміністратор натискає кнопку "Експорт" **Then** браузер завантажує CSV файл з даними, що відповідають поточним фільтрам **And** файл містить лише колонки, які відображаються в таблиці (`show_in_table=yes`)

4. **Given** Table view без фільтрів **When** адміністратор натискає "Експорт" **Then** експортуються всі працівники

5. **Given** фільтрація повертає 0 результатів **When** адміністратор натискає "Експорт" **Then** завантажується CSV файл тільки з заголовками (без рядків даних)

6. **Given** експортований CSV файл **When** Олена відкриває його в Excel **Then** кирилиця відображається коректно **And** дані розділені по колонках (роздільник `;`)

## Tasks / Subtasks

- [x] Task 1: Backend — `exportEmployees(filters)` у store.js (AC: #1)
  - [x] 1.1: Створити функцію `exportEmployees(filters)` у `server/src/store.js`
  - [x] 1.2: Завантажити employees та fields_schema. З schema отримати список полів з `show_in_table === 'yes'` (field_name та field_label)
  - [x] 1.3: Фільтрація employees за переданими фільтрами (формат: `{ fieldName: [value1, value2] }` — AND-логіка між полями, OR-логіка всередині значень). Підтримка `__EMPTY__` sentinel для порожніх значень (патерн з клієнта)
  - [x] 1.4: Генерація CSV через `csv-stringify` (вже є в проєкті): лише колонки з `show_in_table=yes`, використовувати `field_label` як заголовки (для людинопонятних назв), delimiter `;`, UTF-8 BOM prepend
  - [x] 1.5: Повернути CSV string (рядок), route в index.js відповідає за headers
- [x] Task 2: Backend — route `GET /api/export` у index.js (AC: #1)
  - [x] 2.1: Додати route `GET /api/export` в `server/src/index.js`
  - [x] 2.2: Парсити query parameters як JSON-encoded фільтри: `?filters={...}` (URL-encoded JSON об'єкт з columnFilters)
  - [x] 2.3: Передати фільтри в `exportEmployees(filters)` з store.js
  - [x] 2.4: Встановити response headers: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="employees_export.csv"`
  - [x] 2.5: Відправити CSV string як response body через `res.send(csvString)`
- [x] Task 3: Frontend — `api.exportCSV(filters)` у api.js та download механізм (AC: #2, #3, #4, #5)
  - [x] 3.1: Додати метод `exportCSV(filters)` в `client/src/api.js`. НЕ використовувати стандартний `request()` wrapper — потрібна специфічна обробка для download. Використати `fetch` напряму, отримати response як blob, створити download через `URL.createObjectURL` + тимчасовий `<a>` елемент
  - [x] 3.2: Метод приймає `filters` об'єкт (ті самі `columnFilters` з reactive) та серіалізує як JSON в query parameter
- [x] Task 4: Frontend — UI кнопка "Експорт" у Table view у App.vue (AC: #2, #3, #4, #5)
  - [x] 4.1: Додати функцію `exportTableData()` в App.vue script — викликає `api.exportCSV(columnFilters)`, обробляє помилки
  - [x] 4.2: Додати кнопку "Експорт" в Table view UI — розмістити в `.table-controls` (рядок над таблицею), поряд з існуючими елементами (пошук, фільтри). Стиль: Primary button (`background: #1976D2, color: #FFF`)
  - [x] 4.3: Кнопка завжди видима у Table view (без фільтрів = експорт усіх)
- [x] Task 5: CSS стилі у styles.css (AC: #2)
  - [x] 5.1: `.export-btn` — Primary button стиль в контексті table controls, правильне позиціювання
- [x] Task 6: Перевірка та валідація (AC: #1-#6)
  - [x] 6.1: Production build: `cd client && npm run build` — 0 помилок (417ms)
  - [x] 6.2: Перевірити API endpoint `GET /api/export` без фільтрів — повертає CSV з усіма employees
  - [x] 6.3: Перевірити API endpoint `GET /api/export?filters=...` з фільтрами — повертає відфільтрований CSV
  - [x] 6.4: Перевірити що CSV містить UTF-8 BOM та delimiter `;`
  - [x] 6.5: Перевірити що заголовки CSV — це `field_label` (людинопонятні назви)
  - [x] 6.6: Перевірити що CSV містить лише колонки з `show_in_table=yes`
  - [x] 6.7: Перевірити кнопку "Експорт" у Table view — click ініціює download

## Dev Notes

### Архітектурні обмеження та патерни

- **Brownfield проєкт** — розширення Table view в App.vue + новий export endpoint в backend
- **Backend шари:** index.js (route) → store.js (logic) → csv.js (I/O). Route НЕ читає CSV напряму!
- **CSV format (КРИТИЧНО):** delimiter `;`, encoding UTF-8 with BOM (`\uFEFF`). Існуюча бібліотека `csv-stringify` вже використовується в csv.js (line 3, 51)
- **Compute-on-read:** немає кешування — кожен запит перечитує employees.csv з диску
- **Без нових npm залежностей** — використовувати існуючий `csv-stringify` (вже в package.json)
- **CSS підхід** — стилі додаються виключно в `client/src/styles.css`
- **State management:** тільки Vue 3 `ref()` / `computed()` — без Vuex/Pinia
- **Naming conventions:** camelCase для JS, kebab-case для CSS, snake_case для CSV колонок
- **API response format:** ЦЕЙ endpoint — ВИНЯТОК від стандартного JSON response. Повертає CSV file з Content-Disposition header
- **Export response НЕ обгортається в JSON** — сирий CSV текст як response body

### Існуючі функції для перевикористання

**csv.js (server):**
- `stringify` import (line 3) — `csv-stringify/sync` вже є в проєкті
- `DELIMITER = ";"` (line 5) — існуюча константа
- `UTF8_BOM = "\uFEFF"` (line 7) — існуюча константа
- `readCsv()` (line 27) — паттерн читання CSV
- `writeCsv()` (line 47) — паттерн з BOM prepend та stringify options

**store.js (server):**
- `loadEmployees()` (line 121) — завантажує всіх employees з CSV
- `loadFieldsSchema()` (line 131) — завантажує schema з field_options, show_in_table
- `getVacationReport()` (line 245) — приклад фільтрації employees в store

**index.js (server):**
- Route для `/api/reports/vacations` (line 110) — приклад async route з try/catch + query params
- `getEmployeeColumnsSync()` — доступ до колонок (використовується в import route)

**api.js (client):**
- `request()` wrapper (line 3) — НЕ підходить для export (потрібен blob download)
- `BASE_URL` (line 1) — використати для побудови URL

**App.vue:**
- `columnFilters` reactive (line 131) — фільтри які треба передати на сервер для export
- `filteredEmployees` computed (line 210) — клієнтська фільтрація, показує як працюють фільтри
- `summaryColumns` ref (line 720) — колонки таблиці з tableFields

### Імплементація Backend: `exportEmployees(filters)`

**Алгоритм:**
```javascript
export async function exportEmployees(filters) {
  const employees = await loadEmployees();
  const schema = await loadFieldsSchema();

  // Визначити колонки для export: тільки show_in_table=yes
  const exportFields = schema
    .filter(f => f.show_in_table === 'yes')
    .sort((a, b) => parseInt(a.field_order) - parseInt(b.field_order))
    .map(f => ({ key: f.field_name, label: f.field_label }));

  // Фільтрація employees (та сама логіка що і на клієнті)
  let filtered = employees;
  if (filters && typeof filters === 'object') {
    Object.keys(filters).forEach(fieldName => {
      const filterValues = filters[fieldName];
      if (Array.isArray(filterValues) && filterValues.length > 0) {
        filtered = filtered.filter(emp => {
          const value = emp[fieldName];
          // __EMPTY__ sentinel
          if (filterValues.includes('__EMPTY__')) {
            if (!value || value.trim() === '') return true;
          }
          return filterValues.includes(value);
        });
      }
    });
  }

  // Генерація CSV з csv-stringify
  const { stringify } = await import('csv-stringify/sync');
  const columns = exportFields.map(f => f.key);
  const headers = exportFields.map(f => f.label);

  // Підготовка даних з правильними заголовками
  const rows = filtered.map(emp => {
    const row = {};
    exportFields.forEach(f => {
      row[f.label] = emp[f.key] || '';
    });
    return row;
  });

  const csv = stringify(rows, {
    header: true,
    columns: headers,
    delimiter: ';',
    record_delimiter: '\r\n'
  });

  return '\uFEFF' + csv; // UTF-8 BOM
}
```

**Примітка:** `csv-stringify/sync` вже імпортується в `csv.js` (line 3) — можна або імпортувати в store.js напряму, або створити хелпер в csv.js. Рекомендація: імпортувати `stringify` в store.js напряму, як і в csv.js.

### Імплементація Frontend: Download механізм

**api.js — спеціальний метод для download:**
```javascript
async exportCSV(filters) {
  const params = filters && Object.keys(filters).length > 0
    ? `?filters=${encodeURIComponent(JSON.stringify(filters))}`
    : '';
  const response = await fetch(`${BASE_URL}/export${params}`);
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employees_export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

**App.vue — exportTableData():**
```javascript
async function exportTableData() {
  try {
    await api.exportCSV(columnFilters);
  } catch (e) {
    console.error('Export error:', e);
    errorMessage.value = 'Помилка експорту';
  }
}
```

### UX специфікації

- **Кнопка "Експорт":** Primary button — `background: #1976D2; color: #FFF; border-radius: 4px; padding: 8px 16px`
- **Розміщення:** У `.table-controls` зоні Table view, поруч з існуючими елементами (пошук, фільтри, статус-бар)
- **Стан:** Завжди видима у Table view. Без фільтрів = експорт усіх
- **Download:** Стандартний browser download — файл `employees_export.csv`
- **Правило UX:** Лише одна Primary кнопка на екран — "Експорт" є головною дією Table view

### Попередня Story Intelligence (Story 3.1)

**Що було зроблено в Story 3.1:**
- `getVacationReport(type)` в store.js — приклад фільтрації employees з schema
- Route `/api/reports/vacations` з query param validation — аналогічний паттерн
- `api.getVacationReport(type)` — приклад API методу
- Toggle UI на Dashboard — кнопки + inline результат
- Production build 438ms, 0 помилок

**Що було зроблено в Story 2.1:**
- `getDashboardEvents()` backend — приклад async store function
- `localDateStr()` helper — для timezone-safe дат
- Dynamic schema values

**Уроки:**
- Завжди `localDateStr()` замість `toISOString()` для локальних дат
- Production build перевіряти після КОЖНОЇ зміни
- CSS custom properties для кольорів (вже визначені в :root)
- `csv-stringify` з delimiter `;` та BOM — патерн з csv.js

### Ключові технічні деталі CSV Export

**csv-stringify вже в проєкті:**
- Server dependency: `csv-stringify: 6.5.1` (package.json)
- Import pattern: `import { stringify } from "csv-stringify/sync";` (csv.js line 3)
- Використання: `stringify(rows, { header: true, columns, delimiter: ";", record_delimiter: "\r\n" })` (csv.js line 51-55)
- BOM prepend: `"\uFEFF" + output` (csv.js line 59)

**columnFilters reactive object (клієнт App.vue line 131):**
- Формат: `{ fieldName: [value1, value2, ...] }` — масив обраних значень
- Спеціальне значення `"__EMPTY__"` — фільтр порожніх значень
- AND-логіка між полями, OR-логіка всередині одного поля
- Приклад: `{ employment_status: ["Працює", "Відпустка"], location: ["Сімферополь"] }`

**fields_schema show_in_table:**
- Визначає які колонки відображаються в Table view
- Доступ: `schema.filter(f => f.show_in_table === 'yes')`
- Цей самий набір колонок використовується для CSV export

### Anti-patterns (ЗАБОРОНЕНО)

- НЕ додавати нових npm залежностей — `csv-stringify` вже є
- НЕ створювати окремих .vue компонентів — додавати в App.vue
- НЕ створювати окремих CSS файлів — додавати в styles.css
- НЕ повертати JSON response з export endpoint — повертати сирий CSV з Content-Disposition
- НЕ реалізовувати client-side CSV generation — server-side гарантує правильний BOM + delimiter
- НЕ використовувати `window.open()` для download — використовувати blob + `<a>` click
- НЕ хардкодити колонки export — динамічно з fields_schema `show_in_table=yes`
- НЕ хардкодити заголовки CSV — використовувати `field_label` з schema
- НЕ кешувати результати — compute-on-read стратегія
- НЕ додавати Vuex/Pinia
- НЕ додавати loading spinners — експорт швидкий (NFR4 < 5 сек для ~120 записів)
- НЕ використовувати стандартний `request()` wrapper з api.js для download — він парсить JSON

### Project Structure Notes

- Зміни в 4 файлах: `server/src/store.js`, `server/src/index.js`, `client/src/api.js`, `client/src/App.vue`, `client/src/styles.css`
- Ніяких нових файлів не створюється
- Ніяких нових npm залежностей
- Новий API endpoint: `GET /api/export?filters={...}`
- Структура проєкту повністю відповідає існуючій архітектурі

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2: Експорт фільтрації в CSV]
- [Source: _bmad-output/planning-artifacts/prd.md#FR12 — Експорт результатів фільтрації]
- [Source: _bmad-output/planning-artifacts/prd.md#FR13 — CSV з UTF-8 BOM + `;`]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR4 — Експорт < 5 секунд]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR8 — UTF-8 BOM при кожному записі]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR9 — Роздільник `;`]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Design — GET /api/export]
- [Source: _bmad-output/planning-artifacts/architecture.md#CSV Export — server-side через csv-stringify]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — CSV Format]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy — Primary]
- [Source: server/src/csv.js#L3 — stringify import]
- [Source: server/src/csv.js#L5-7 — DELIMITER и UTF8_BOM constants]
- [Source: server/src/csv.js#L47-60 — writeCsv с BOM + stringify pattern]
- [Source: server/src/store.js#L121-124 — loadEmployees()]
- [Source: server/src/store.js#L131-133 — loadFieldsSchema()]
- [Source: server/src/store.js#L245-292 — getVacationReport() приклад фільтрації]
- [Source: server/src/index.js#L110-123 — vacation report route з query params]
- [Source: client/src/api.js#L1-13 — BASE_URL и request() wrapper]
- [Source: client/src/App.vue#L131 — columnFilters reactive object]
- [Source: client/src/App.vue#L210-251 — filteredEmployees computed з фільтрами]
- [Source: client/src/App.vue#L799-814 — toggleFilter() function]
- [Source: _bmad-output/implementation-artifacts/3-1-vacation-reports.md — попередня story]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Production build: 417ms, 0 errors
- API test without filters: returns all employees CSV with correct headers
- API test with filters: returns filtered CSV matching filter criteria
- BOM verification: first 3 bytes EF BB BF confirmed
- Invalid JSON filter test: returns 400 error as expected

### Completion Notes List

- All 6 tasks (19 subtasks) completed successfully
- No new npm dependencies added — used existing `csv-stringify`
- Export uses `field_label` from schema as CSV headers (human-readable)
- Export includes only `show_in_table=yes` columns from fields_schema
- `api.exportCSV()` uses `fetch` directly (not `request()` wrapper) because CSV needs blob download
- Button placed in Table view `.actions` div, always visible
- Filters serialized as JSON in query parameter, matching `columnFilters` reactive object format

### Code Review Fixes Applied

**Code Review Date:** 2026-02-09
**Reviewer:** Claude Sonnet 4.5 (claude-sonnet-4-5)
**Issues Fixed:** 5 (1 High, 4 Medium)

1. **[HIGH] Problem #3 Fixed:** Added `searchTerm` text search to export
   - Frontend: `exportTableData()` now passes `searchTerm.value` to API
   - API: `exportCSV()` accepts `searchTerm` parameter and adds to query string
   - Backend: `GET /api/export` accepts `?search=` parameter
   - Backend: `exportEmployees()` filters by text search (name, department, position, ID)
   - **Impact:** Export now matches user's visible filtered table including text search

2. **[MEDIUM] Problem #1 Fixed:** Filter field validation against schema
   - Backend: `exportEmployees()` validates `fieldName` against schema whitelist
   - Prevents side-channel data exfiltration via hidden columns
   - Invalid filter fields are silently ignored

3. **[MEDIUM] Problem #2 Fixed:** `__EMPTY__` filter logic corrected
   - Explicit conditional logic instead of fallthrough pattern
   - Filters `__EMPTY__` sentinel separately from actual values
   - Improved maintainability and correctness

4. **[MEDIUM] Problem #8 Fixed:** Error message handling improved
   - `exportTableData()` now clears `errorMessage.value = ''` at start
   - Error message includes specific details: `Помилка експорту: ${e.message}`
   - Consistent with other async functions in App.vue

5. **[KNOWN LIMITATION] Problem #9:** URL length limit risk remains
   - Large filter sets (10+ columns, many Cyrillic values) may exceed 2KB URL limit
   - Architectural change (GET → POST) deferred to avoid scope creep
   - Risk: Low for typical usage (~120 employees, <10 active filters)

**Production Build:** 473ms, 0 errors ✅

### File List

- `server/src/store.js` — Added `exportEmployees(filters)` function
- `server/src/index.js` — Added `GET /api/export` route, imported `exportEmployees`
- `client/src/api.js` — Added `exportCSV(filters)` method with blob download
- `client/src/App.vue` — Added `exportTableData()` function and "Експорт" button in Table view
- `client/src/styles.css` — Added `.export-btn` and `.export-btn:hover` styles

## Change Log

| Change | File | Details |
|--------|------|---------|
| Added `exportEmployees(filters)` | server/src/store.js | Server-side CSV generation with schema-driven columns and filter support |
| Added `GET /api/export` route | server/src/index.js | CSV download endpoint with JSON-encoded filters query param |
| Added `exportCSV(filters)` | client/src/api.js | Blob-based CSV download via fetch (not request wrapper) |
| Added `exportTableData()` + button | client/src/App.vue | Export function + "Експорт" Primary button in Table view |
| Added `.export-btn` styles | client/src/styles.css | Primary button style (#1976D2) with hover state |
| **[Code Review Fix]** Updated `exportEmployees()` signature | server/src/store.js | Added `searchTerm` parameter, text search filtering, field validation, fixed `__EMPTY__` logic |
| **[Code Review Fix]** Updated `GET /api/export` route | server/src/index.js | Added `req.query.search` parameter handling |
| **[Code Review Fix]** Updated `exportCSV()` signature | client/src/api.js | Added `searchTerm` parameter, improved query string building with URLSearchParams |
| **[Code Review Fix]** Updated `exportTableData()` | client/src/App.vue | Pass `searchTerm.value`, clear error message at start, detailed error feedback |
