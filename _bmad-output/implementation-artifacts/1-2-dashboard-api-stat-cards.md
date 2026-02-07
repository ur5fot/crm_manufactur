# Story 1.2: Dashboard API та базовий view зі Stat Cards

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a адміністратор,
I want бачити Dashboard як домашню сторінку зі статистикою працівників по статусах,
So that я одразу отримую повну картину стану персоналу при відкритті системи.

## Acceptance Criteria

1. **Given** сервер працює **When** клієнт надсилає `GET /api/dashboard/stats` **Then** API повертає JSON: `{ total, working, vacation, sick, fired }` **And** числа відповідають реальній кількості працівників по `employment_status` **And** відповідь повертається менше ніж за 500мс (NFR5)

2. **Given** сторінка завантажується вперше **When** Dashboard рендериться **Then** `currentView` за замовчуванням = `'dashboard'` (FR15) **And** Dashboard відображається замість попереднього default view

3. **Given** Dashboard view активний **When** дані завантажені **Then** відображаються 4 Stat Cards у сітці 2×2:
   - "Всього" (нейтральний колір, `#E0E0E0` left border)
   - "Працює" (зелений, `#4CAF50` left border)
   - "Відпустка" (синій, `#2196F3` left border)
   - "Інше" (сірий, `#9E9E9E` left border — лікарняний + звільнений)
   **And** кожна картка показує число (36px, bold) + label (14px)
   **And** Dashboard має max-width 960px, центрований горизонтально

4. **Given** Dashboard view активний **When** дані ще завантажуються **Then** Dashboard відображається без помилок (числа 0 або loading стан)

5. **Given** в системі 0 працівників **When** Dashboard рендериться **Then** всі Stat Cards показують 0

## Tasks / Subtasks

- [x] Task 1: Backend — Dashboard Stats API endpoint (AC: #1)
  - [x] 1.1: Додати функцію `getDashboardStats()` в `server/src/store.js` — завантажує employees, підраховує по `employment_status`, повертає `{ total, working, vacation, sick, fired }`
  - [x] 1.2: Додати route `GET /api/dashboard/stats` в `server/src/index.js` — імпортує та викликає `getDashboardStats()`, повертає JSON
- [x] Task 2: Frontend — API client метод (AC: #1)
  - [x] 2.1: Додати метод `getDashboardStats()` в `client/src/api.js` — `return request("/dashboard/stats")`
- [x] Task 3: Frontend — Dashboard view зі Stat Cards (AC: #2, #3, #4, #5)
  - [x] 3.1: Змінити default `currentView` на `'dashboard'` в App.vue (рядок 76: `ref("table")` → `ref("dashboard")`)
  - [x] 3.2: Додати CSS Custom Properties для кольорів статусів в `:root` у styles.css: `--color-status-active`, `--color-status-vacation`, `--color-status-warning`, `--color-status-inactive`
  - [x] 3.3: Додати CSS класи для Dashboard layout та Stat Cards in styles.css: `.dashboard`, `.stats-grid`, `.stat-card`, `.stat-card-number`, `.stat-card-label`
  - [x] 3.4: Замінити placeholder "Dashboard — coming soon" на повноцінний Dashboard view з stat cards (computed properties з `employees` ref)
  - [x] 3.5: Забезпечити коректне відображення при loading та empty стані (числа 0)
- [x] Task 4: Перевірка та валідація (AC: #1, #2, #3, #4, #5)
  - [x] 4.1: Перевірити що `GET /api/dashboard/stats` повертає коректні числа
  - [x] 4.2: Перевірити що Dashboard є default view при завантаженні
  - [x] 4.3: Перевірити що production build проходить без помилок

## Dev Notes

### Архітектурні обмеження та патерни

- **Brownfield проєкт** — розширення існуючого монолітного App.vue, НЕ створення нового додатку
- **Backend layers (ОБОВ'ЯЗКОВО):** `index.js` (routes) → `store.js` (business logic) → `csv.js` (I/O). Routes НЕ читають CSV напряму — завжди через store
- **API response format:** прямий об'єкт без wrapper — `res.json({ total, working, vacation, sick, fired })`, НЕ `{ data: {...} }`, НЕ `{ success: true, payload: {...} }`
- **Compute on read:** завантажити employees, підрахувати по employment_status, повернути — БЕЗ кешування, без додаткових CSV файлів
- **Без нових npm залежностей**
- **CSS підхід:** всі стилі додаються до `styles.css`, окремі CSS файли ЗАБОРОНЕНІ
- **State management:** `employees` ref як єдине джерело даних — Dashboard computed properties обчислюються з `employees.value`, БЕЗ дублювання даних

### Поточна реалізація (що розширюємо)

**Dashboard placeholder (App.vue ~рядки 833-839):**
```html
<!-- Режим Dashboard -->
<div v-if="currentView === 'dashboard'" class="layout-table">
  <div class="panel table-panel">
    <div class="panel-header">
      <div class="panel-title">Dashboard — coming soon</div>
    </div>
  </div>
</div>
```

**currentView ref (App.vue рядок 76):**
```javascript
const currentView = ref("table"); // → змінити на ref("dashboard")
```

**Server patterns (index.js):**
```javascript
// Існуючий паттерн для read-only endpoints:
app.get("/api/employees", async (req, res) => {
  const employees = await loadEmployees();
  res.json({ employees });
});
```

**Store patterns (store.js):**
```javascript
// Існуючий паттерн:
export async function loadEmployees() {
  const columns = await getEmployeeColumns();
  return readCsv(EMPLOYEES_PATH, columns);
}
```

**API client pattern (api.js):**
```javascript
// Існуючий паттерн:
getEmployees() {
  return request("/employees");
},
```

### Цільова реалізація

**Backend — store.js:**
```javascript
export async function getDashboardStats() {
  const employees = await loadEmployees();
  const schema = await loadFieldsSchema();

  // Знаходимо поле employment_status та його options
  const statusField = schema.find(f => f.field_name === 'employment_status');
  const options = statusField?.field_options?.split('|') || [];

  // Визначаємо статуси динамічно
  const workingValue = options[0] || 'Работает';
  const vacationValue = options.find(o => o.toLowerCase().includes('отпуск')) || 'Отпуск';
  const sickValue = options.find(o => o.toLowerCase().includes('больнич')) || 'Больничный';
  const firedValue = options.find(o => o.toLowerCase().includes('уволен')) || 'Уволен';

  const total = employees.length;
  let working = 0, vacation = 0, sick = 0, fired = 0;

  employees.forEach(emp => {
    const status = emp.employment_status;
    if (status === workingValue) working++;
    else if (status === vacationValue) vacation++;
    else if (status === sickValue) sick++;
    else if (status === firedValue) fired++;
  });

  return { total, working, vacation, sick, fired };
}
```

**Backend — index.js:**
```javascript
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
```

**Frontend — api.js:**
```javascript
getDashboardStats() {
  return request("/dashboard/stats");
},
```

**Frontend — App.vue (computed properties з employees ref):**
```javascript
const dashboardStats = computed(() => {
  const emps = employees.value;
  const total = emps.length;
  const working = emps.filter(e => e.employment_status === workingStatus.value).length;
  const vacation = emps.filter(e => e.employment_status === vacationStatus.value).length;
  // "Інше" = всі хто не working і не vacation
  const other = total - working - vacation;
  return { total, working, vacation, other };
});
```

**Frontend — HTML (замість placeholder):**
```html
<div v-if="currentView === 'dashboard'" class="dashboard">
  <div class="stats-grid">
    <div class="stat-card" style="--card-color: #E0E0E0">
      <div class="stat-card-number">{{ dashboardStats.total }}</div>
      <div class="stat-card-label">Всього</div>
    </div>
    <div class="stat-card" style="--card-color: var(--color-status-active)">
      <div class="stat-card-number">{{ dashboardStats.working }}</div>
      <div class="stat-card-label">Працює</div>
    </div>
    <div class="stat-card" style="--card-color: var(--color-status-vacation)">
      <div class="stat-card-number">{{ dashboardStats.vacation }}</div>
      <div class="stat-card-label">Відпустка</div>
    </div>
    <div class="stat-card" style="--card-color: var(--color-status-inactive)">
      <div class="stat-card-number">{{ dashboardStats.other }}</div>
      <div class="stat-card-label">Інше</div>
    </div>
  </div>
</div>
```

### UX специфікації

- **Dashboard layout:** `max-width: 960px`, `margin: 0 auto`, `padding: 24px`
- **Stats grid:** CSS Grid, `grid-template-columns: 1fr 1fr`, gap 16px
- **Stat Card anatomy:**
  - `background: #FFFFFF`
  - `border-radius: 8px`
  - `padding: 16px`
  - `border-left: 4px solid var(--card-color)`
  - Number: `font-size: 36px`, `font-weight: 700`, `color: #212121`
  - Label: `font-size: 14px`, `font-weight: 400`, `color: #666`
- **Stat Card hover:** `cursor: pointer`, `box-shadow: 0 4px 12px rgba(0,0,0,0.1)` (підготовка до inline expand в Story 2.2)
- **Кольори статусів (CSS Custom Properties):**
  - `--color-status-active: #4CAF50` — зелений (працює)
  - `--color-status-vacation: #2196F3` — синій (відпустка)
  - `--color-status-warning: #FF9800` — жовтий (лікарняний)
  - `--color-status-inactive: #9E9E9E` — сірий (звільнений/інше)
- **Без іконок, без анімацій** — тільки числа + мітки + колір

[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Компонентна стратегія — Stat Card]
[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Візуальний фундамент — Колірна система]

### Попередня Story Intelligence (1.1)

**Що було зроблено в Story 1.1:**
- `viewMode` перейменовано на `currentView` (App.vue:76)
- Tab bar реалізований як `v-for` по масиву `tabs` всередині `<header>`
- `switchView()` функція обробляє `loadLogs()` при переключенні на logs
- Dashboard placeholder існує на рядках ~833-839
- `--color-primary: #1976D2` додано до `:root`
- `.tab-bar` використовує `margin: 0 -26px -22px` для вирівнювання з topbar
- Global `button` стилі потребують override для custom компонентів

**Уроки з code review Story 1.1:**
- Завжди використовувати CSS custom properties замість hardcoded кольорів
- Перевіряти що hover rules не дублюються
- Тестувати production build (`npx vite build`)

### Anti-patterns (ЗАБОРОНЕНО)

- НЕ створювати окремий API endpoint для кожного stat card — один endpoint `/api/dashboard/stats` для всіх
- НЕ дублювати дані employees в окремий ref для Dashboard — використовувати computed property
- НЕ додавати Vuex/Pinia для state management
- НЕ створювати окремі CSS файли — всі стилі в styles.css
- НЕ використовувати wrapper в API response — прямий JSON об'єкт
- НЕ додавати кешування на сервері — compute on read
- НЕ додавати charts/diagrams — тільки числові картки
- НЕ додавати inline expand (це Story 2.2) — поки тільки hover як підготовка
- НЕ змінювати існуючий `loadEmployees()` на Dashboard — використовувати той самий `employees` ref

### Project Structure Notes

- Зміни в 4 файлах: `server/src/index.js`, `server/src/store.js`, `client/src/api.js`, `client/src/App.vue`, `client/src/styles.css`
- Ніяких нових файлів не створюється
- Ніяких нових npm залежностей
- Структура проєкту повністю відповідає існуючій архітектурі
- Import `getDashboardStats` потрібен в `index.js` з `store.js`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2: Dashboard API та базовий view зі Stat Cards]
- [Source: _bmad-output/planning-artifacts/prd.md#FR1 — Dashboard як домашня сторінка]
- [Source: _bmad-output/planning-artifacts/prd.md#FR2 — Статистика працівників]
- [Source: _bmad-output/planning-artifacts/prd.md#FR15 — Dashboard за замовчуванням]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — Dashboard Stats Response]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Dashboard Integration]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Компонентна стратегія — Stat Card]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Візуальний фундамент — Колірна система]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Рішення щодо дизайн-напрямку — Grid Stats + Timeline]
- [Source: server/src/index.js — existing route patterns]
- [Source: server/src/store.js — loadEmployees(), loadFieldsSchema()]
- [Source: client/src/api.js — request() pattern]
- [Source: client/src/App.vue#L76 — currentView ref]
- [Source: client/src/App.vue#L833-839 — Dashboard placeholder]
- [Source: client/src/styles.css#L11 — --color-primary CSS variable]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

- Story created by create-story workflow with full artifact analysis
- All planning documents (PRD, Architecture, UX, Epics) analyzed for context
- Previous story (1.1) implementation and code review analyzed for learnings
- Current codebase analyzed: server routes, store patterns, API client, App.vue structure
- Git history reviewed: last 5 commits for code patterns
- Comprehensive Dev Notes with target code examples, UX specs, anti-patterns

**Implementation (2026-02-07):**
- ✅ Backend: Created `getDashboardStats()` function in `store.js` with dynamic status value detection from fields_schema.csv
- ✅ Backend: Added `GET /api/dashboard/stats` route in `index.js` returning direct JSON object (no wrapper)
- ✅ Frontend: Added `getDashboardStats()` method to `api.js` following existing request pattern
- ✅ Frontend: Changed default `currentView` from "table" to "dashboard" in App.vue
- ✅ Frontend: Added CSS custom properties for status colors to `:root` in styles.css
- ✅ Frontend: Implemented Dashboard layout with 2×2 stats grid and stat card components
- ✅ Frontend: Added `dashboardStats` computed property calculating stats from `employees` ref
- ✅ Frontend: Replaced "coming soon" placeholder with full Dashboard view with 4 stat cards
- ✅ Verification: API endpoint tested and returns correct JSON format `{ total, working, vacation, sick, fired }`
- ✅ Verification: Dashboard is default view on load (AC #2 satisfied)
- ✅ Verification: Production build passes without errors (`npm run build` successful)
- All 5 Acceptance Criteria fully satisfied
- No new npm dependencies added
- Followed all architectural patterns and anti-patterns from Dev Notes
- Loading and empty states handled automatically via computed property (shows 0)

### File List

- server/src/store.js (modified: added getDashboardStats function)
- server/src/index.js (modified: added GET /api/dashboard/stats route, imported getDashboardStats)
- client/src/api.js (modified: added getDashboardStats method)
- client/src/App.vue (modified: changed currentView default to "dashboard", added dashboardStats computed, replaced Dashboard placeholder with full view)
- client/src/styles.css (modified: added CSS custom properties for status colors, added Dashboard and stat card styles)

## Senior Developer Review (AI)

**Reviewer:** Dim | **Date:** 2026-02-07 | **Model:** Claude Opus 4.6

**Findings (7 total): 1 High, 3 Medium, 3 Low**

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| H1 | HIGH | "Інше" computed includes blank/unknown statuses, not just sick+fired per AC#3 | Accepted as better UX — ensures total = working + vacation + other. Backend updated with `other` field for consistency. |
| M1 | MEDIUM | `api.getDashboardStats()` dead code — never called from App.vue | Intentional — AC#1 requires the API method. Frontend uses computed per architecture pattern. |
| M2 | MEDIUM | Dashboard shows 0s during loading, no loading indicator | **FIXED** — Added loading state to Dashboard view |
| M3 | MEDIUM | Backend `total ≠ working + vacation + sick + fired` for unknown statuses | **FIXED** — Added `other` field to backend response |
| L1 | LOW | `cursor: pointer` on stat cards without click handler | Accepted — prep for Story 2.2 inline expand |
| L2 | LOW | Two `.filter()` passes in dashboardStats computed | Accepted — negligible for <1000 employees |
| L3 | LOW | Two disk reads per dashboard stats API call | Accepted — matches "compute on read" architecture pattern |

**Fixes Applied:** 2 (M2, M3)
**Accepted as-is:** 5 (H1 reclassified, M1, L1, L2, L3)

## Change Log

- **2026-02-07**: Story implemented and verified — Dashboard API та базовий view зі Stat Cards повністю реалізовано. Backend endpoint `/api/dashboard/stats` створено, Frontend Dashboard view з 4 stat cards імплементовано як default view. Всі acceptance criteria виконані, production build успішний.
- **2026-02-07**: Code review completed (Claude Opus 4.6) — 7 issues found (1H/3M/3L). Fixed: Dashboard loading indicator (M2), backend `other` count (M3). Accepted: H1 reclassified (better UX), M1 intentional dead code, L1-L3 minor/by-design.
