# Story 1.3: Авто-рефреш Dashboard та Timestamp Footer

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a адміністратор,
I want щоб Dashboard автоматично оновлював дані кожні 5 хвилин і показував час останнього оновлення,
So that я завжди бачу актуальну інформацію та довіряю даним на екрані.

## Acceptance Criteria

1. **Given** Dashboard view активний **When** проходить 5 хвилин **Then** система автоматично перезавантажує дані з сервера **And** Stat Cards оновлюються новими числами **And** оновлення відбувається фоново, без впливу на інтерактивність (NFR6)

2. **Given** Dashboard view активний **When** дані завантажені або оновлені **Then** внизу Dashboard відображається "Оновлено: HH:MM" **And** текст 12px, колір #999, вирівнювання по правому краю

3. **Given** адміністратор перемикається з Dashboard на інший view **When** view змінюється **Then** авто-рефреш зупиняється (clearInterval)

4. **Given** адміністратор повертається на Dashboard з іншого view **When** Dashboard стає активним **Then** дані одразу перезавантажуються **And** авто-рефреш запускається знову (новий setInterval)

## Tasks / Subtasks

- [x] Task 1: Додати `watch` на `currentView` для управління авто-рефрешем (AC: #1, #3, #4)
  - [x] 1.1: Додати ref `refreshIntervalId` (null | number) для зберігання ID інтервалу
  - [x] 1.2: Додати ref `lastUpdated` (null | Date) для зберігання часу останнього оновлення
  - [x] 1.3: Створити функцію `startDashboardRefresh()` — запускає `setInterval` з інтервалом 300000мс (5 хв), що викликає `loadEmployees()`
  - [x] 1.4: Створити функцію `stopDashboardRefresh()` — викликає `clearInterval(refreshIntervalId.value)` і обнуляє ref
  - [x] 1.5: Додати `watch(currentView, ...)`: при переході на `'dashboard'` — викликати `loadEmployees()` + `startDashboardRefresh()`; при виході з `'dashboard'` — `stopDashboardRefresh()`
  - [x] 1.6: Додати `onUnmounted(() => stopDashboardRefresh())` для очищення при знищенні компонента
- [x] Task 2: Оновлювати `lastUpdated` при завантаженні даних (AC: #2)
  - [x] 2.1: В `loadEmployees()` після успішного завантаження додати `lastUpdated.value = new Date()`
- [x] Task 3: Додати Timestamp Footer в Dashboard HTML (AC: #2)
  - [x] 3.1: Додати computed `formattedLastUpdated` — форматує `lastUpdated` як `HH:MM` (наприклад "08:45")
  - [x] 3.2: Додати HTML блок після `.stats-grid`: `<div class="dashboard-footer">Оновлено: {{ formattedLastUpdated }}</div>`
  - [x] 3.3: Показувати footer тільки коли `lastUpdated` не null
- [x] Task 4: Додати CSS стилі для Timestamp Footer (AC: #2)
  - [x] 4.1: Додати клас `.dashboard-footer` в styles.css: `text-align: right; color: #999; font-size: 12px; margin-top: 16px`
- [x] Task 5: Перевірка та валідація (AC: #1, #2, #3, #4)
  - [x] 5.1: Перевірити що авто-рефреш запускається при відкритті Dashboard
  - [x] 5.2: Перевірити що авто-рефреш зупиняється при переході на інший view (console.log для debug)
  - [x] 5.3: Перевірити що при поверненні на Dashboard дані перезавантажуються одразу
  - [x] 5.4: Перевірити що timestamp footer оновлюється після кожного reload
  - [x] 5.5: Перевірити що production build проходить без помилок

## Dev Notes

### Архітектурні обмеження та патерни

- **Brownfield проєкт** — розширення існуючого монолітного App.vue, НЕ створення нового додатку
- **Без нових npm залежностей** — використовуємо стандартні `setInterval` / `clearInterval`
- **CSS підхід** — стилі додаються до `styles.css`, окремі CSS файли ЗАБОРОНЕНІ
- **State management** — `ref()` для `refreshIntervalId` та `lastUpdated`, `computed()` для форматованого часу
- **Naming conventions**: camelCase для JS (`lastUpdated`, `refreshIntervalId`), kebab-case для CSS (`.dashboard-footer`)
- **Auto-refresh стратегія (Architecture):** `setInterval` з інтервалом 5 хвилин, активний ТІЛЬКИ при `currentView === 'dashboard'`

### Поточна реалізація (що розширюємо)

**Dashboard view (App.vue рядки ~843-865):**
```html
<div v-if="currentView === 'dashboard'" class="dashboard">
  <div v-if="loading" class="status-bar" style="justify-content: center; padding: 24px;">
    <span>Завантаження...</span>
  </div>
  <div class="stats-grid">
    <!-- 4 stat cards -->
  </div>
</div>
```

**currentView ref (App.vue рядок 76):**
```javascript
const currentView = ref("dashboard"); // "dashboard", "cards", "table", or "logs"
```

**switchView function (App.vue рядки 85-88):**
```javascript
function switchView(view) {
  currentView.value = view;
  if (view === 'logs') loadLogs();
}
```

**loadEmployees function (App.vue рядки 339-351):**
```javascript
async function loadEmployees() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const data = await api.getEmployees();
    employees.value = data.employees || [];
    await checkVacations();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}
```

**dashboardStats computed (App.vue рядки 227-235):**
```javascript
const dashboardStats = computed(() => {
  const emps = employees.value;
  const total = emps.length;
  const working = emps.filter(e => e.employment_status === workingStatus.value).length;
  const vacation = emps.filter(e => e.employment_status === vacationStatus.value).length;
  const other = total - working - vacation;
  return { total, working, vacation, other };
});
```

**ВАЖЛИВО: Зараз немає `watch` на `currentView` і немає `setInterval` логіки.**

### Цільова реалізація

**Нові refs (додати біля рядка 76-77):**
```javascript
const refreshIntervalId = ref(null);
const lastUpdated = ref(null);
```

**Нова computed property (додати біля dashboardStats):**
```javascript
const formattedLastUpdated = computed(() => {
  if (!lastUpdated.value) return '';
  const d = lastUpdated.value;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
});
```

**Нові функції (додати після switchView):**
```javascript
function startDashboardRefresh() {
  stopDashboardRefresh();
  refreshIntervalId.value = setInterval(() => {
    loadEmployees();
  }, 300000); // 5 хвилин
}

function stopDashboardRefresh() {
  if (refreshIntervalId.value) {
    clearInterval(refreshIntervalId.value);
    refreshIntervalId.value = null;
  }
}
```

**Watch на currentView (додати після функцій):**
```javascript
watch(currentView, (newView, oldView) => {
  if (newView === 'dashboard') {
    loadEmployees();
    startDashboardRefresh();
  } else if (oldView === 'dashboard') {
    stopDashboardRefresh();
  }
});
```

**Оновлення loadEmployees (рядок ~347, після `await checkVacations()`):**
```javascript
lastUpdated.value = new Date();
```

**Cleanup на unmount:**
```javascript
onUnmounted(() => {
  stopDashboardRefresh();
});
```

**HTML — додати після `.stats-grid` всередині `.dashboard`:**
```html
<div v-if="lastUpdated" class="dashboard-footer">
  Оновлено: {{ formattedLastUpdated }}
</div>
```

**CSS (додати в styles.css):**
```css
.dashboard-footer {
  text-align: right;
  color: #999;
  font-size: 12px;
  margin-top: 16px;
}
```

### Важливі деталі реалізації

1. **`watch` спрацьовує при ЗМІНІ `currentView`:** При першому завантаженні сторінки `currentView` вже = `'dashboard'`, тому watch НЕ спрацює (немає зміни). Автоматичний рефреш запуститься тільки при ПОВЕРНЕННІ на Dashboard. Для першого завантаження — `loadEmployees()` вже викликається в `onMounted`. Потрібно додати `startDashboardRefresh()` також в `onMounted` після `loadEmployees()`.

2. **Або використати `watch` з `{ immediate: true }`** — але це викличе подвійний `loadEmployees()` при mount (один з onMounted, один з watch). Кращий підхід: запустити `startDashboardRefresh()` в `onMounted` окремо після `loadEmployees()`.

3. **`lastUpdated` оновлюється в `loadEmployees()`** — це означає що БУДЬ-ЯКЕ завантаження даних (не тільки Dashboard) оновить timestamp. Це прийнятно — дані актуальні незалежно від джерела виклику.

4. **`loading` state** — існуючий `loading` ref вже обробляє loading стан в Dashboard. Авто-рефреш НЕ повинен показувати loading індикатор (NFR6: без впливу на інтерактивність). Рішення: для авто-рефрешу не встановлювати `loading = true`, або створити окрему функцію `refreshDashboardSilently()` що не встановлює `loading`.

5. **Рекомендація по п.4:** Створити окрему функцію `silentRefresh()` яка не встановлює `loading.value = true`, або додати параметр `silent` до `loadEmployees()`:
```javascript
async function loadEmployees(silent = false) {
  if (!silent) loading.value = true;
  // ... решта без змін
}
```
І в setInterval викликати `loadEmployees(true)`.

### UX специфікації

- **Timestamp Footer anatomy:** "Оновлено: HH:MM"
- **Font-size:** 12px
- **Color:** `#999`
- **Alignment:** `text-align: right`
- **Margin:** `margin-top: 16px` (від stat cards)
- **Формат часу:** `HH:MM` (24-годинний, без секунд)
- **Показувати:** тільки коли `lastUpdated` не null
- **Auto-refresh:** фоновий, БЕЗ loading індикатора (NFR6)

[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Компонентна стратегія — Timestamp Footer]

### Попередня Story Intelligence (1.1 та 1.2)

**Що було зроблено в Story 1.1:**
- `viewMode` перейменовано на `currentView`
- Tab bar реалізований як `v-for` по масиву `tabs` всередині `<header>`
- `switchView()` функція обробляє `loadLogs()` при переключенні на logs
- `--color-primary: #1976D2` додано до `:root`
- **Урок:** Завжди використовувати CSS custom properties замість hardcoded кольорів

**Що було зроблено в Story 1.2:**
- `currentView` default змінено на `"dashboard"`
- `dashboardStats` computed property обчислює статистику з `employees` ref
- 4 Stat Cards відображаються в `.stats-grid` (CSS Grid 2×2)
- Loading state: `<div v-if="loading">` показує "Завантаження..."
- CSS Custom Properties для кольорів статусів додано до `:root`
- `api.getDashboardStats()` створено але НЕ використовується (frontend computed)
- **Урок з code review:** Перевіряти production build після змін

**Git commits:**
- `a992c15` Story 1.2: Dashboard API та Stat Cards — реалізація + code review fixes
- `331b6e3` Story 1.1: Tab Bar навігація — замінено view switcher на 4-tab bar

### Anti-patterns (ЗАБОРОНЕНО)

- НЕ створювати окремий API endpoint для рефрешу — використовувати існуючий `loadEmployees()`
- НЕ додавати WebSocket або Server-Sent Events — простий `setInterval` + polling
- НЕ показувати loading індикатор при авто-рефреші (NFR6: фоново)
- НЕ використовувати `requestAnimationFrame` або складні timing механізми
- НЕ створювати окремі CSS файли — стилі в styles.css
- НЕ додавати нових npm залежностей
- НЕ дублювати дані employees — використовувати existing ref
- НЕ запускати авто-рефреш на інших views (тільки Dashboard)

### Project Structure Notes

- Зміни лише в 2 файлах: `client/src/App.vue` та `client/src/styles.css`
- Ніяких нових файлів не створюється
- Ніяких нових npm залежностей
- Потрібні імпорти: `watch`, `onUnmounted` з `vue` (перевірити що вже імпортовані)
- Структура проєкту повністю відповідає існуючій архітектурі

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Авто-рефреш Dashboard та Timestamp Footer]
- [Source: _bmad-output/planning-artifacts/prd.md#FR5 — Авто-рефреш кожні 5 хвилин]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR6 — Авто-рефреш не впливає на інтерактивність]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Auto-Refresh]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Communication Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Компонентна стратегія — Timestamp Footer]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Візуальний фундамент — Типографіка]
- [Source: client/src/App.vue#L76 — currentView ref]
- [Source: client/src/App.vue#L85-88 — switchView function]
- [Source: client/src/App.vue#L227-235 — dashboardStats computed]
- [Source: client/src/App.vue#L339-351 — loadEmployees function]
- [Source: client/src/App.vue#L843-865 — Dashboard HTML block]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Production build passed successfully (vite build, 401ms, no errors)
- No test framework configured in project (no vitest/jest/mocha)

### Completion Notes List

- Added `watch` and `onUnmounted` imports from Vue
- Added `refreshIntervalId` and `lastUpdated` refs for auto-refresh state management
- Created `startDashboardRefresh()` — starts 5-min interval calling `loadEmployees(true)` (silent mode)
- Created `stopDashboardRefresh()` — clears interval and resets ref
- Added `watch(currentView)` — starts refresh when entering dashboard, stops when leaving
- Added `startDashboardRefresh()` in `onMounted` for initial page load
- Added `onUnmounted` cleanup to prevent memory leaks
- Added `silent` parameter to `loadEmployees()` — NFR6 compliance (no loading indicator during auto-refresh)
- Added `lastUpdated.value = new Date()` after successful data load
- Added `formattedLastUpdated` computed property (HH:MM format)
- Added dashboard footer HTML with `v-if="lastUpdated"` conditional rendering
- Added `.dashboard-footer` CSS class (12px, #999, right-aligned, 16px margin-top)
- [Code Review] Added `isRefreshing` ref — concurrency guard to prevent overlapping silent refreshes
- [Code Review] Added `refreshManually()` function — reloads data and resets auto-refresh timer
- [Code Review] Silent mode now suppresses both error display and error clearing (NFR6 compliance)

### Change Log

- 2026-02-07: Story 1.3 implementation — auto-refresh with 5-min interval and timestamp footer
- 2026-02-07: Code review fixes — silent error suppression (NFR6), refresh timer reset on manual update, concurrency guard for overlapping loadEmployees calls

### File List

- `client/src/App.vue` (modified) — added auto-refresh logic, watch, refs, computed, HTML footer
- `client/src/styles.css` (modified) — added `.dashboard-footer` CSS class
