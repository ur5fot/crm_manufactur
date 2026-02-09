# Story 3.1: Швидкі звіти по відпустках

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a адміністратор,
I want згенерувати звіт "Хто у відпустці зараз" або "Відпустки цього місяця" одним кліком на Dashboard,
So that я можу миттєво відповісти на запит керівництва без ручного пошуку та фільтрації.

## Acceptance Criteria

1. **Given** сервер працює **When** клієнт надсилає `GET /api/reports/vacations?type=current` **Then** API повертає масив працівників, які зараз у відпустці: `[{ employee_id, name, vacation_start_date, vacation_end_date, days }]` **And** відповідь повертається менше ніж за 500мс (NFR5)

2. **Given** сервер працює **When** клієнт надсилає `GET /api/reports/vacations?type=month` **Then** API повертає масив працівників з відпустками в поточному місяці (ті хто вже у відпустці + хто йде цього місяця) **And** генерація завершується менше ніж за 30 секунд (NFR3)

3. **Given** Dashboard view активний **When** адміністратор бачить Dashboard **Then** під Timeline секціями відображаються 2 кнопки швидких звітів: "Хто у відпустці зараз" та "Відпустки цього місяця"

4. **Given** Dashboard view активний **When** адміністратор натискає кнопку "Хто у відпустці зараз" **Then** під кнопкою відображається таблиця-результат: ПІБ, дата початку, дата закінчення, кількість днів **And** повторний клік згортає результат

5. **Given** Dashboard view активний **When** адміністратор натискає кнопку "Відпустки цього місяця" **Then** під кнопкою відображається таблиця-результат з усіма відпустками поточного місяця

6. **Given** немає працівників у відпустці **When** адміністратор натискає "Хто у відпустці зараз" **Then** відображається повідомлення "Наразі ніхто не у відпустці"

## Tasks / Subtasks

- [x] Task 1: Backend — `getVacationReport(type)` у store.js (AC: #1, #2)
  - [x] 1.1: Створити функцію `getVacationReport(type)` у `server/src/store.js`
  - [x] 1.2: Для `type=current` — фільтрувати employees де `employment_status === vacationStatus` (options[2] з schema) АБО де сьогоднішня дата між `vacation_start_date` і `vacation_end_date`
  - [x] 1.3: Для `type=month` — фільтрувати employees де `vacation_start_date` або `vacation_end_date` потрапляє в поточний місяць
  - [x] 1.4: Кожен результат: `{ employee_id, name, vacation_start_date, vacation_end_date, days }` — `days` обчислюється через `Math.ceil((end - start) / 86400000)`
  - [x] 1.5: Використовувати `localDateStr()` для поточної дати (уникнення timezone бага — Story 2.1 урок)
- [x] Task 2: Backend — route `GET /api/reports/vacations` у index.js (AC: #1, #2)
  - [x] 2.1: Додати route в `server/src/index.js` з query параметром `type`
  - [x] 2.2: Імпортувати `getVacationReport` з store.js
  - [x] 2.3: Валідація: `type` має бути `current` або `month`, інакше 400
  - [x] 2.4: Response format: прямий масив `[{ employee_id, name, ... }]` (без wrapper)
- [x] Task 3: Frontend — `api.getVacationReport(type)` у api.js (AC: #1, #2)
  - [x] 3.1: Додати метод `getVacationReport(type)` в `client/src/api.js`
- [x] Task 4: Frontend — UI кнопки та таблиці звітів на Dashboard у App.vue (AC: #3, #4, #5, #6)
  - [x] 4.1: Додати refs: `activeReport` (null | 'current' | 'month'), `reportData` (масив результатів), `reportLoading` (boolean)
  - [x] 4.2: Додати функцію `toggleReport(type)` — при кліку: якщо вже активний → згорнути, інакше → завантажити з API та показати
  - [x] 4.3: Додати HTML під `.timeline-grid` та перед `.dashboard-footer`: блок з 2 кнопками + inline таблиця-результат
  - [x] 4.4: Стилізація кнопок як Secondary buttons (прозорий фон, blue border) згідно UX spec
  - [x] 4.5: Таблиця-результат: 4 колонки (ПІБ, Початок, Закінчення, Днів)
  - [x] 4.6: Empty state: "Наразі ніхто не у відпустці" / "Немає відпусток цього місяця"
- [x] Task 5: CSS стилі у styles.css (AC: #3, #4, #5)
  - [x] 5.1: `.report-buttons` — flex контейнер з gap для 2 кнопок
  - [x] 5.2: `.report-btn` — secondary button стиль (transparent bg, blue border, blue text)
  - [x] 5.3: `.report-btn.active` — активна кнопка (blue bg, white text)
  - [x] 5.4: `.report-table` — стилі inline таблиці результатів
  - [x] 5.5: `.report-empty` — empty state стиль (сірий текст, центрування)
- [x] Task 6: Перевірка та валідація (AC: #1-#6)
  - [x] 6.1: Production build: `cd client && npm run build` — 0 помилок (438ms)
  - [x] 6.2: Перевірити API endpoint `GET /api/reports/vacations?type=current` повертає масив
  - [x] 6.3: Перевірити API endpoint `GET /api/reports/vacations?type=month` повертає масив
  - [x] 6.4: Перевірити що кнопки звітів відображаються на Dashboard
  - [x] 6.5: Перевірити toggle-поведінку (expand/collapse)

## Dev Notes

### Архітектурні обмеження та патерни

- **Brownfield проєкт** — розширення існуючого Dashboard view в App.vue + новий endpoint в backend
- **Backend шари:** index.js (route) → store.js (logic) → csv.js (I/O). Route НЕ читає CSV напряму!
- **API response format:** прямий масив/об'єкт без wrapper (патерн проєкту)
- **Compute-on-read:** немає кешування — кожен запит перечитує employees.csv з диску
- **Без нових npm залежностей** — стандартний Express.js + Vue 3
- **CSS підхід** — стилі додаються виключно в `client/src/styles.css`
- **State management:** тільки Vue 3 `ref()` / `computed()` — без Vuex/Pinia
- **Naming conventions:** camelCase для JS, kebab-case для CSS, snake_case для CSV колонок

### Існуючі функції для перевикористання

**store.js (server):**
- `loadEmployees()` (line 121) — завантажує всіх employees з CSV
- `loadFieldsSchema()` (line 131) — завантажує schema з field_options
- `localDateStr(date)` (line 175) — форматує Date в `YYYY-MM-DD` без timezone бага
- `getDashboardEvents()` (line 182) — приклад фільтрації employees по датах відпусток

**index.js (server):**
- Route для `/api/dashboard/stats` (line 89) — приклад async route з try/catch
- Route для `/api/dashboard/events` (line 99) — аналогічний патерн

**api.js (client):**
- `getDashboardStats()` (line 68) — приклад методу API, використовувати той самий `request()` wrapper
- `getDashboardEvents()` (line 71) — аналогічний патерн

**App.vue:**
- `expandedCard` ref + `toggleStatCard()` (line 81, 167) — приклад toggle-паттерну (один розкритий блок)
- `loadDashboardEvents()` — приклад завантаження даних з API для Dashboard
- `openEmployeeCard(id)` — навігація до картки працівника (можна використати для кліків по ПІБ в таблиці звітів)

### Імплементація Backend: `getVacationReport(type)`

**Алгоритм для `type=current`:**
```javascript
export async function getVacationReport(type) {
  const employees = await loadEmployees();
  const schema = await loadFieldsSchema();
  const statusField = schema.find(f => f.field_name === 'employment_status');
  const options = statusField?.field_options?.split('|') || [];
  const vacationOpt = options[2] || ''; // positional convention: options[2] = vacation

  const now = new Date();
  const today = localDateStr(now);

  let filtered;
  if (type === 'current') {
    // Хто зараз у відпустці: статус === vacation АБО сьогодні між start та end
    filtered = employees.filter(emp => {
      if (emp.employment_status === vacationOpt) return true;
      const start = emp.vacation_start_date;
      const end = emp.vacation_end_date;
      if (start && end && start <= today && end >= today) return true;
      return false;
    });
  } else if (type === 'month') {
    // Відпустки цього місяця: start або end потрапляє в поточний місяць
    const monthStart = today.slice(0, 7) + '-01'; // YYYY-MM-01
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthEnd = today.slice(0, 7) + '-' + String(lastDay).padStart(2, '0');
    filtered = employees.filter(emp => {
      const start = emp.vacation_start_date;
      const end = emp.vacation_end_date;
      if (!start && !end) return false;
      // start або end в межах місяця, АБО відпустка перекриває весь місяць
      if (start && start >= monthStart && start <= monthEnd) return true;
      if (end && end >= monthStart && end <= monthEnd) return true;
      if (start && end && start < monthStart && end > monthEnd) return true;
      return false;
    });
  }

  return filtered.map(emp => {
    const name = [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ');
    const start = emp.vacation_start_date;
    const end = emp.vacation_end_date;
    let days = 0;
    if (start && end) {
      days = Math.ceil((new Date(end) - new Date(start)) / 86400000);
      if (days < 0) days = 0;
    }
    return { employee_id: emp.employee_id, name, vacation_start_date: start, vacation_end_date: end, days };
  });
}
```

### Імплементація Frontend: Dashboard UI

**Розміщення кнопок у HTML шаблоні:**
- ПІСЛЯ `.timeline-grid` (рядок ~1039 App.vue)
- ПЕРЕД `.dashboard-footer` (рядок ~1040 App.vue)

**HTML структура:**
```html
<!-- Швидкі звіти по відпустках -->
<div class="report-section">
  <div class="report-buttons">
    <button class="report-btn" :class="{ active: activeReport === 'current' }" @click="toggleReport('current')">
      Хто у відпустці зараз
    </button>
    <button class="report-btn" :class="{ active: activeReport === 'month' }" @click="toggleReport('month')">
      Відпустки цього місяця
    </button>
  </div>
  <div v-if="activeReport && !reportLoading" class="report-result">
    <div v-if="reportData.length === 0" class="report-empty">
      {{ activeReport === 'current' ? 'Наразі ніхто не у відпустці' : 'Немає відпусток цього місяця' }}
    </div>
    <table v-else class="report-table">
      <thead>
        <tr>
          <th>ПІБ</th>
          <th>Початок</th>
          <th>Закінчення</th>
          <th>Днів</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in reportData" :key="row.employee_id">
          <td>{{ row.name }}</td>
          <td>{{ row.vacation_start_date }}</td>
          <td>{{ row.vacation_end_date }}</td>
          <td>{{ row.days }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-if="reportLoading" class="report-empty">Завантаження...</div>
</div>
```

**Refs та функції (App.vue script):**
```javascript
const activeReport = ref(null); // null | 'current' | 'month'
const reportData = ref([]);
const reportLoading = ref(false);

async function toggleReport(type) {
  if (activeReport.value === type) {
    activeReport.value = null;
    reportData.value = [];
    return;
  }
  activeReport.value = type;
  reportLoading.value = true;
  try {
    const data = await api.getVacationReport(type);
    reportData.value = data;
  } catch (e) {
    console.error('Report error:', e);
    reportData.value = [];
  } finally {
    reportLoading.value = false;
  }
}
```

### UX специфікації

- **Кнопки звітів:** Secondary button стиль — прозорий фон, border 1px solid #1976D2, колір тексту #1976D2
- **Активна кнопка:** Blue bg #1976D2, white text (показує який звіт відкритий)
- **Таблиця:** Звичайна HTML таблиця, border-collapse, border 1px solid #E0E0E0
- **Empty state:** Сірий текст #999, центрований, padding 16px
- **Розміщення:** Між timeline-grid та dashboard-footer, з відступом 24px зверху
- **Dashboard max-width:** 960px, центрований — кнопки та таблиця всередині цього контейнера

### Попередня Story Intelligence (Story 2.3)

**Що було зроблено в Story 2.3:**
- Escape key handler через onMounted/onUnmounted lifecycle
- Backdrop opacity зміна відповідно до UX spec
- Code review fix: timezone bug в `checkVacations()` — замінено `toISOString().split('T')[0]` на local date
- Code review fix: CSS variable `var(--radius)` → `var(--radius-lg)`
- Production build 429ms, 0 помилок

**Що було зроблено в Story 2.2:**
- `expandedCard` ref + `toggleStatCard()` — toggle паттерн (один розкритий)
- Inline expand CSS transition max-height 200ms

**Що було зроблено в Story 2.1:**
- `getDashboardEvents()` backend endpoint — приклад для нового endpoint
- `localDateStr()` helper — ОБОВ'ЯЗКОВО використовувати для дат
- Dynamic schema values — без hardcoded статусів

**Уроки:**
- Завжди `localDateStr()` замість `toISOString()` для локальних дат
- Production build перевіряти після КОЖНОЇ зміни
- CSS custom properties для кольорів (вже визначені в :root)
- Toggle паттерн: один ref, повторний клік = collapse

### Anti-patterns (ЗАБОРОНЕНО)

- НЕ додавати нових npm залежностей
- НЕ створювати окремих .vue компонентів для звітів — додавати в App.vue
- НЕ створювати окремих CSS файлів — додавати в styles.css
- НЕ використовувати `toISOString()` для локальних дат — тільки `localDateStr()`
- НЕ обгортати response масив у wrapper `{ reports: [...] }` — повертати прямий масив
- НЕ кешувати результати — compute-on-read стратегія
- НЕ додавати loading spinners — дані завантажуються швидко (NFR5 < 500ms)
- НЕ додавати Vuex/Pinia
- НЕ хардкодити vacation status — використовувати options[2] з schema

### Project Structure Notes

- Зміни в 4 файлах: `server/src/store.js`, `server/src/index.js`, `client/src/api.js`, `client/src/App.vue`, `client/src/styles.css`
- Ніяких нових файлів не створюється
- Ніяких нових npm залежностей
- Новий API endpoint: `GET /api/reports/vacations?type=current|month`
- Структура проєкту повністю відповідає існуючій архітектурі

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1: Швидкі звіти по відпустках]
- [Source: _bmad-output/planning-artifacts/prd.md#FR10 — Звіт "Хто у відпустці зараз"]
- [Source: _bmad-output/planning-artifacts/prd.md#FR11 — Звіт "Відпустки цього місяця"]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR3 — Генерація звіту < 30 сек]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR5 — API відповідь < 500мс]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Design — GET /api/reports/vacations]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy — Secondary]
- [Source: server/src/store.js#L155-173 — getDashboardStats() приклад]
- [Source: server/src/store.js#L175-180 — localDateStr() helper]
- [Source: server/src/store.js#L182-243 — getDashboardEvents() приклад]
- [Source: server/src/index.js#L89-107 — dashboard routes приклад]
- [Source: client/src/api.js#L68-73 — dashboard API methods]
- [Source: client/src/App.vue#L81 — expandedCard ref toggle pattern]
- [Source: client/src/App.vue#L167-169 — toggleStatCard() function]
- [Source: client/src/App.vue#L934-1043 — Dashboard HTML template]
- [Source: _bmad-output/implementation-artifacts/2-3-enhanced-notifications-modal.md — попередня story]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Production build passed successfully (vite build, 438ms, 0 errors)
- API endpoint `GET /api/reports/vacations?type=current` tested — returns array (200 OK)
- API endpoint `GET /api/reports/vacations?type=month` tested — returns array (200 OK)
- API endpoint `GET /api/reports/vacations?type=invalid` tested — returns 400 error with message
- No test framework configured in project (no jest/vitest/cypress)

### Completion Notes List

- Task 1: Created `getVacationReport(type)` in store.js — supports `current` (employees on vacation now by status or date range) and `month` (vacations overlapping current month). Uses `localDateStr()` for timezone-safe dates. Reads vacation status dynamically from schema options[2].
- Task 2: Added route `GET /api/reports/vacations` in index.js with `type` query parameter validation (400 for invalid type). Direct array response without wrapper.
- Task 3: Added `getVacationReport(type)` method in api.js using existing `request()` wrapper.
- Task 4: Added `activeReport`, `reportData`, `reportLoading` refs and `toggleReport(type)` function in App.vue. HTML block with 2 report buttons + inline result table placed between timeline-grid and dashboard-footer. Toggle behavior: click to expand, click again to collapse. Empty state messages for both report types.
- Task 5: Added CSS classes `.report-section`, `.report-buttons`, `.report-btn`, `.report-btn.active`, `.report-result`, `.report-table`, `.report-empty` in styles.css. Secondary button style (transparent bg, blue border) with active state (blue bg, white text).
- Task 6: All validations passed — production build 438ms/0 errors, both API endpoints return correct data, invalid type returns 400.

### File List

- `server/src/store.js` — modified (added `getVacationReport(type)` function after `getDashboardEvents()`)
- `server/src/index.js` — modified (added `getVacationReport` import, added `GET /api/reports/vacations` route)
- `client/src/api.js` — modified (added `getVacationReport(type)` method)
- `client/src/App.vue` — modified (added `activeReport`/`reportData`/`reportLoading` refs, `toggleReport()` function, report section HTML in dashboard template)
- `client/src/styles.css` — modified (added report section CSS: `.report-section`, `.report-buttons`, `.report-btn`, `.report-table`, `.report-empty`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (3-1-vacation-reports: ready-for-dev → in-progress → review)
- `_bmad-output/implementation-artifacts/3-1-vacation-reports.md` — modified (tasks marked complete, dev agent record, status → review)

## Change Log

- 2026-02-09: Story 3.1 implemented — Quick Vacation Reports. Added `GET /api/reports/vacations?type=current|month` backend endpoint with schema-driven vacation status detection. Frontend: 2 toggle buttons on Dashboard with inline result table. Production build passed (438ms).
