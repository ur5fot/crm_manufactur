# Story 2.1: Dashboard Events API та Timeline секції

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a адміністратор,
I want бачити на Dashboard блоки "Сьогодні" та "Цього тижня" зі списком подій відпусток,
So that я одразу знаю хто йде або повертається з відпустки без пошуку в таблиці.

## Acceptance Criteria

1. **Given** сервер працює **When** клієнт надсилає `GET /api/dashboard/events` **Then** API повертає JSON: `{ today: [...], thisWeek: [...] }` **And** кожен елемент містить: `employee_id`, `name` (ПІБ), `type` ("vacation_start" або "vacation_end"), `date`, `end_date` (для vacation_start) **And** відповідь повертається менше ніж за 500мс (NFR5)

2. **Given** Dashboard view активний і є події сьогодні **When** дані завантажені **Then** під Stat Cards відображається секція "Сьогодні" (заголовок 18px, font-weight 600) **And** кожна подія показує emoji + ПІБ + опис: ✈️ для початку відпустки (з датою повернення), 🏢 для повернення з відпустки

3. **Given** Dashboard view активний і є події найближчих 7 днів (крім сьогодні) **When** дані завантажені **Then** під секцією "Сьогодні" відображається секція "Найближчі 7 днів" **And** кожна подія показує дату + badge днів + emoji + ПІБ + опис **And** події відсортовані по даті

4. **Given** немає подій сьогодні **When** Dashboard рендериться **Then** секція "Сьогодні" показує "Нічого термінового" сірим текстом (#999)

5. **Given** немає подій найближчих 7 днів **When** Dashboard рендериться **Then** секція "Найближчі 7 днів" показує "Немає запланованих подій" сірим текстом (#999)

6. **Given** авто-рефреш Dashboard спрацьовує (Story 1.3) **When** дані оновлюються **Then** Timeline секції також оновлюються актуальними подіями

## Tasks / Subtasks

- [x] Task 1: Створити backend endpoint `GET /api/dashboard/events` (AC: #1)
  - [x] 1.1: Додати функцію `getDashboardEvents()` в `server/src/store.js` — фільтрація `employees.csv` по `vacation_start_date` та `vacation_end_date`
  - [x] 1.2: Логіка "Сьогодні": знайти працівників де `vacation_start_date === today` (тип "vacation_start") або `vacation_end_date === today` (тип "vacation_end")
  - [x] 1.3: Логіка "Найближчі 7 днів": знайти працівників де `vacation_start_date` або `vacation_end_date` від завтра до +7 днів від сьогодні, відсортувати по даті
  - [x] 1.4: Формат відповіді: `{ today: [{employee_id, name, type, date, end_date}], thisWeek: [{employee_id, name, type, date, end_date}] }`
  - [x] 1.5: Додати route `GET /api/dashboard/events` в `server/src/index.js`
- [x] Task 2: Додати API метод на клієнті (AC: #1)
  - [x] 2.1: Додати `getDashboardEvents()` в `client/src/api.js` — `return request("/dashboard/events")`
- [x] Task 3: Додати computed properties для Timeline даних в App.vue (AC: #2, #3, #6)
  - [x] 3.1: Додати ref `dashboardEvents` (`{ today: [], thisWeek: [] }`)
  - [x] 3.2: Створити функцію `loadDashboardEvents()` — викликає `api.getDashboardEvents()` та оновлює ref
  - [x] 3.3: Викликати `loadDashboardEvents()` в існуючому `watch(currentView)` разом з `loadEmployees()` при переході на Dashboard
  - [x] 3.4: Викликати `loadDashboardEvents()` при авто-рефреші (silent mode) — оновити `startDashboardRefresh()` щоб також рефрешив events
  - [x] 3.5: Викликати `loadDashboardEvents()` в `onMounted` після `loadEmployees()`
- [x] Task 4: Додати Timeline HTML секції в Dashboard template (AC: #2, #3, #4, #5)
  - [x] 4.1: Додати секцію "Сьогодні" після `.stats-grid` з заголовком та списком подій
  - [x] 4.2: Кожна подія: emoji (✈️ або 🏢) + ПІБ + опис (дата повернення для vacation_start)
  - [x] 4.3: Empty state "Сьогодні": "Нічого термінового" (#999)
  - [x] 4.4: Додати секцію "Цього тижня" з заголовком та списком подій
  - [x] 4.5: Кожна подія цього тижня: дата + emoji + ПІБ + опис
  - [x] 4.6: Empty state "Цього тижня": "Немає запланованих подій" (#999)
- [x] Task 5: Додати CSS стилі для Timeline секцій (AC: #2, #3, #4, #5)
  - [x] 5.1: Додати `.timeline-section` — margin-top 24px
  - [x] 5.2: Додати `.timeline-title` — font-size 18px, font-weight 600, color #212121
  - [x] 5.3: Додати `.timeline-event` — padding, display flex, gap
  - [x] 5.4: Додати `.timeline-empty` — color #999, font-size 14px
  - [x] 5.5: Додати `.timeline-date` — для дати в секції "Цього тижня"
- [x] Task 6: Перевірка та валідація (AC: #1-#6)
  - [x] 6.1: Перевірити що API endpoint повертає коректні дані (today + thisWeek)
  - [x] 6.2: Перевірити що Timeline секції відображаються на Dashboard
  - [x] 6.3: Перевірити empty states при відсутності подій
  - [x] 6.4: Перевірити що авто-рефреш оновлює Timeline дані
  - [x] 6.5: Перевірити що production build проходить без помилок

## Dev Notes

### Архітектурні обмеження та патерни

- **Brownfield проєкт** — розширення існуючого монолітного App.vue, НЕ створення нового додатку
- **Без нових npm залежностей** — стандартний Date API для роботи з датами
- **CSS підхід** — стилі додаються виключно до `client/src/styles.css`, окремі CSS файли ЗАБОРОНЕНІ
- **Backend шари:** `index.js` (routes) → `store.js` (logic) → `csv.js` (I/O) — routes НЕ читають CSV напряму
- **API response format:** прямий об'єкт `{ today: [], thisWeek: [] }` без wrapper (`{ data: ..., meta: ... }` ЗАБОРОНЕНО)
- **Naming conventions:** camelCase для JS (`dashboardEvents`, `loadDashboardEvents`), snake_case для CSV полів (`vacation_start_date`), kebab-case для CSS (`.timeline-section`)
- **State management:** `ref()` для `dashboardEvents`, без Vuex/Pinia
- **Compute-on-read стратегія:** endpoint щоразу читає `employees.csv` та фільтрує — без кешування

### Поточна реалізація (що розширюємо)

**Dashboard HTML template (App.vue рядки ~890-916):**
```html
<div v-if="currentView === 'dashboard'" class="dashboard">
  <div v-if="loading" class="status-bar" style="justify-content: center; padding: 24px;">
    <span>Завантаження...</span>
  </div>
  <div class="stats-grid">
    <!-- 4 stat cards: Всього, Працює, Відпустка, Інше -->
  </div>
  <div v-if="lastUpdated" class="dashboard-footer">
    Оновлено: {{ formattedLastUpdated }}
  </div>
</div>
```
**Timeline секції додаються МІЖ `.stats-grid` та `.dashboard-footer`.**

**watch(currentView) (App.vue рядки ~114-121):**
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
**Додати `loadDashboardEvents()` після `loadEmployees()` при переході на Dashboard.**

**startDashboardRefresh (App.vue рядки ~93-98):**
```javascript
function startDashboardRefresh() {
  stopDashboardRefresh();
  refreshIntervalId.value = setInterval(() => {
    loadEmployees(true);
  }, 300000);
}
```
**Оновити setInterval callback щоб також викликав `loadDashboardEvents()`.**

**loadEmployees (App.vue рядки ~378-394):**
```javascript
async function loadEmployees(silent = false) {
  if (silent && isRefreshing.value) return;
  if (!silent) loading.value = true;
  isRefreshing.value = true;
  if (!silent) errorMessage.value = "";
  try {
    const data = await api.getEmployees();
    employees.value = data.employees || [];
    await checkVacations();
    lastUpdated.value = new Date();
  } catch (error) {
    if (!silent) errorMessage.value = error.message;
  } finally {
    isRefreshing.value = false;
    if (!silent) loading.value = false;
  }
}
```

**Існуючий getDashboardStats в store.js (рядки ~155-182)** — зразок для нового `getDashboardEvents()`:
```javascript
export async function getDashboardStats() {
  const employees = await loadEmployees();
  const schema = await loadFieldsSchema();
  const statusField = schema.find(f => f.field_name === 'employment_status');
  const options = statusField?.field_options?.split('|') || [];
  // ... фільтрація та підрахунок
  return { total, working, vacation, sick, fired, other };
}
```

**Існуючий route GET /api/dashboard/stats (index.js рядки ~88-96)** — зразок для нового route:
```javascript
app.get("/api/dashboard/stats", async (_req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
```

**api.js (рядок ~68-70)** — зразок для нового методу:
```javascript
getDashboardStats() {
  return request("/dashboard/stats");
},
```

### Цільова реалізація

**1. Backend: `getDashboardEvents()` в store.js:**
```javascript
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getDashboardEvents() {
  const employees = await loadEmployees();
  const now = new Date();
  const today = localDateStr(now);

  // Завтра
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = localDateStr(tomorrow);

  // +7 днів від сьогодні
  const in7days = new Date(now);
  in7days.setDate(now.getDate() + 7);
  const in7daysStr = localDateStr(in7days);

  const todayEvents = [];
  const weekEvents = [];

  employees.forEach(emp => {
    const name = [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ');
    const startDate = emp.vacation_start_date;
    const endDate = emp.vacation_end_date;

    // Сьогодні
    if (startDate === today) {
      todayEvents.push({
        employee_id: emp.employee_id,
        name,
        type: 'vacation_start',
        date: startDate,
        end_date: endDate || ''
      });
    }
    if (endDate === today) {
      todayEvents.push({
        employee_id: emp.employee_id,
        name,
        type: 'vacation_end',
        date: endDate
      });
    }

    // Найближчі 7 днів (від завтра до +7 днів)
    if (startDate && startDate >= tomorrowStr && startDate <= in7daysStr) {
      weekEvents.push({
        employee_id: emp.employee_id,
        name,
        type: 'vacation_start',
        date: startDate,
        end_date: endDate || ''
      });
    }
    if (endDate && endDate >= tomorrowStr && endDate <= in7daysStr) {
      weekEvents.push({
        employee_id: emp.employee_id,
        name,
        type: 'vacation_end',
        date: endDate
      });
    }
  });

  // Сортувати thisWeek по даті
  weekEvents.sort((a, b) => a.date.localeCompare(b.date));

  return { today: todayEvents, thisWeek: weekEvents };
}
```

**2. Route в index.js (додати біля існуючого `/api/dashboard/stats`):**
```javascript
app.get("/api/dashboard/events", async (_req, res) => {
  try {
    const events = await getDashboardEvents();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
```
**Не забути імпорт:** додати `getDashboardEvents` в `import { ... } from './store.js'` на початку index.js.

**3. API метод в api.js:**
```javascript
getDashboardEvents() {
  return request("/dashboard/events");
},
```

**4. Frontend логіка в App.vue:**

**Новий ref (додати біля рядка ~79):**
```javascript
const dashboardEvents = ref({ today: [], thisWeek: [] });
```

**Нова функція (додати після loadEmployees):**
```javascript
async function loadDashboardEvents() {
  try {
    const data = await api.getDashboardEvents();
    dashboardEvents.value = data;
  } catch (error) {
    console.error('Failed to load dashboard events:', error);
  }
}
```

**Оновити watch(currentView):**
```javascript
watch(currentView, (newView, oldView) => {
  if (newView === 'dashboard') {
    loadEmployees();
    loadDashboardEvents();
    startDashboardRefresh();
  } else if (oldView === 'dashboard') {
    stopDashboardRefresh();
  }
});
```

**Оновити startDashboardRefresh:**
```javascript
function startDashboardRefresh() {
  stopDashboardRefresh();
  refreshIntervalId.value = setInterval(() => {
    loadEmployees(true);
    loadDashboardEvents();
  }, 300000);
}
```

**Додати в onMounted (після loadEmployees):**
```javascript
loadDashboardEvents();
```

**5. Dashboard HTML (додати між `.stats-grid` та `.dashboard-footer`):**
```html
<!-- Timeline: Сьогодні -->
<div class="timeline-section">
  <div class="timeline-title">Сьогодні</div>
  <div v-if="dashboardEvents.today.length === 0" class="timeline-empty">
    Нічого термінового
  </div>
  <div v-for="event in dashboardEvents.today" :key="event.employee_id + event.type" class="timeline-event">
    <span class="timeline-emoji">{{ event.type === 'vacation_start' ? '✈️' : '🏢' }}</span>
    <span class="timeline-name">{{ event.name }}</span>
    <span class="timeline-desc">
      {{ event.type === 'vacation_start' ? `— початок відпустки (до ${event.end_date})` : '— повернення з відпустки' }}
    </span>
  </div>
</div>

<!-- Timeline: Цього тижня -->
<div class="timeline-section">
  <div class="timeline-title">Цього тижня</div>
  <div v-if="dashboardEvents.thisWeek.length === 0" class="timeline-empty">
    Немає запланованих подій
  </div>
  <div v-for="event in dashboardEvents.thisWeek" :key="event.employee_id + event.type + event.date" class="timeline-event">
    <span class="timeline-date">{{ event.date.slice(5) }}</span>
    <span class="timeline-emoji">{{ event.type === 'vacation_start' ? '✈️' : '🏢' }}</span>
    <span class="timeline-name">{{ event.name }}</span>
    <span class="timeline-desc">
      {{ event.type === 'vacation_start' ? `— початок відпустки (до ${event.end_date})` : '— повернення з відпустки' }}
    </span>
  </div>
</div>
```

**6. CSS в styles.css (додати після `.dashboard-footer`):**
```css
.timeline-section {
  margin-top: 24px;
}

.timeline-title {
  font-size: 18px;
  font-weight: 600;
  color: #212121;
  margin-bottom: 12px;
}

.timeline-event {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 14px;
  color: #212121;
  border-bottom: 1px solid #F5F5F5;
}

.timeline-event:last-child {
  border-bottom: none;
}

.timeline-emoji {
  font-size: 16px;
  flex-shrink: 0;
}

.timeline-name {
  font-weight: 500;
}

.timeline-desc {
  color: #666;
}

.timeline-date {
  color: #999;
  font-size: 12px;
  min-width: 40px;
}

.timeline-empty {
  color: #999;
  font-size: 14px;
  padding: 8px 0;
}
```

### Важливі деталі реалізації

1. **Формат дат в CSV:** `YYYY-MM-DD` (ISO string без часу). Порівняння рядкове: `startDate === today` де `today = new Date().toISOString().slice(0, 10)`.

2. **"Найближчі 7 днів" = від завтра до +7 днів від сьогодні.** Rolling window, не прив'язаний до календарного тижня.

3. **ПІБ формат:** `last_name + first_name + middle_name`, об'єднані пробілом, порожні значення відфільтровані. Приклад: "Петренко Іван Миколайович".

4. **Дублі можливі:** Якщо працівник має `vacation_start_date === today` І `vacation_end_date === today` (одноденна відпустка), він з'явиться двічі в `today` — як "vacation_start" та "vacation_end". Це коректна поведінка.

5. **`loadDashboardEvents()` не використовує `silent` параметр** — помилки логуються в console.error без відображення користувачу. Events — допоміжні дані, помилка не критична.

6. **Порядок в HTML:** stats-grid → timeline "Сьогодні" → timeline "Цього тижня" → dashboard-footer. Footer завжди внизу.

7. **`:key` для v-for:** `event.employee_id + event.type` для today (унікально, бо один працівник може мати максимум 2 events з різними типами); `event.employee_id + event.type + event.date` для thisWeek.

### UX специфікації

- **Секція "Сьогодні":** заголовок 18px, font-weight 600, color #212121
- **Секція "Цього тижня":** такий самий заголовок стиль
- **Emoji:** ✈️ для vacation_start, 🏢 для vacation_end
- **Events в "Сьогодні":** emoji + ПІБ + "— початок відпустки (до DD.MM)" або "— повернення з відпустки"
- **Events в "Цього тижня":** MM-DD + emoji + ПІБ + опис (дата перша, бо секція хронологічна)
- **Empty state "Сьогодні":** "Нічого термінового" сірим (#999) — позитивне повідомлення
- **Empty state "Цього тижня":** "Немає запланованих подій" сірим (#999)
- **Без borders навколо timeline sections** (UX spec) — лише тонкий border-bottom між events (#F5F5F5)
- **Dashboard max-width:** 960px, центрований — timeline sections успадковують це

[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Компонентна стратегія — Timeline Section]

### Попередня Story Intelligence (Epic 1)

**Що було зроблено в Stories 1.1-1.3:**
- `currentView` ref зі значенням `"dashboard"` за замовчуванням (Story 1.1)
- Tab bar з 4 вкладками (Dashboard, Картки, Таблиця, Логи) (Story 1.1)
- `dashboardStats` computed property обчислює статистику з `employees` ref (Story 1.2)
- 4 Stat Cards в `.stats-grid` CSS Grid 2×2 (Story 1.2)
- `api.getDashboardStats()` створено але НЕ використовується фронтом (Story 1.2)
- Auto-refresh з `setInterval` 5 хвилин, тільки для Dashboard (Story 1.3)
- `loadEmployees(silent)` з параметром silent для фонового оновлення (Story 1.3)
- `isRefreshing` ref для запобігання конкурентних рефрешів (Story 1.3)
- Timestamp footer "Оновлено: HH:MM" (Story 1.3)

**Уроки з Epic 1:**
- Завжди використовувати CSS custom properties замість hardcoded кольорів
- Перевіряти production build після змін (`cd client && npm run build`)
- `silent` mode в loadEmployees НЕ показує loading та НЕ очищує помилки (NFR6)
- Код спочатку, CSS потім, тести/build останнє

**Git commits (для розуміння paттерну коммітів):**
- `8fd52f1` Story 1.3: Авто-рефреш Dashboard та Timestamp Footer — реалізація + code review fixes
- `a992c15` Story 1.2: Dashboard API та Stat Cards — реалізація + code review fixes
- `331b6e3` Story 1.1: Tab Bar навігація — замінено view switcher на 4-tab bar

### Anti-patterns (ЗАБОРОНЕНО)

- НЕ обчислювати events на клієнті з `employees` ref — використовувати backend endpoint (відміна від stats які обчислюються на клієнті)
- НЕ додавати WebSocket або Server-Sent Events
- НЕ створювати окремі CSS файли
- НЕ додавати нових npm залежностей (moment.js, date-fns тощо)
- НЕ використовувати CSS custom properties для Timeline (не потрібно — нема варіантів кольорів)
- НЕ додавати click handlers на Timeline events (Story 2.2 додасть інтерактивність для stat cards)
- НЕ модифікувати існуючі stat cards HTML або CSS
- НЕ дублювати дані employees — events приходять окремим API запитом

### Project Structure Notes

- Зміни в 4 файлах: `server/src/store.js`, `server/src/index.js`, `client/src/api.js`, `client/src/App.vue`, `client/src/styles.css`
- Ніяких нових файлів не створюється
- Ніяких нових npm залежностей
- Структура проєкту повністю відповідає існуючій архітектурі
- Новий endpoint `GET /api/dashboard/events` додається поруч з існуючим `GET /api/dashboard/stats`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1: Dashboard Events API та Timeline секції]
- [Source: _bmad-output/planning-artifacts/prd.md#FR3 — Блок "Сьогодні"]
- [Source: _bmad-output/planning-artifacts/prd.md#FR4 — Блок "Цього тижня"]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR1 — Dashboard < 2 секунди]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR5 — API < 500мс]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — Dashboard Events Response]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — Compute on read]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Structure Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Компонентна стратегія — Timeline Section]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Візуальний фундамент — Типографіка]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Рішення дизайн-напрямку — Grid Stats + Timeline]
- [Source: client/src/App.vue#L76-79 — currentView, refreshIntervalId, lastUpdated, isRefreshing refs]
- [Source: client/src/App.vue#L93-98 — startDashboardRefresh]
- [Source: client/src/App.vue#L114-121 — watch(currentView)]
- [Source: client/src/App.vue#L260-268 — dashboardStats computed]
- [Source: client/src/App.vue#L378-394 — loadEmployees function]
- [Source: client/src/App.vue#L890-916 — Dashboard HTML template]
- [Source: server/src/store.js#L155-182 — getDashboardStats (зразок для getDashboardEvents)]
- [Source: server/src/index.js#L88-96 — GET /api/dashboard/stats route (зразок)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Production build: ✅ passed (405ms, no errors)
- API endpoint test: ✅ `getDashboardEvents()` returns `{ today: [], thisWeek: [] }` correctly

### Completion Notes List

- Backend: Added `getDashboardEvents()` function in store.js — filters employees by vacation_start_date and vacation_end_date, splits into today/next-7-days arrays, sorts thisWeek by date
- Backend: Added `GET /api/dashboard/events` route in index.js with import of getDashboardEvents
- Backend: Refactored `getDashboardStats()` — dynamic per-option counts from fields_schema (no hardcoded status values)
- Client API: Added `getDashboardEvents()` method in api.js
- Frontend: Added `dashboardEvents` ref, `loadDashboardEvents()` function, integrated into watch(currentView), startDashboardRefresh, refreshManually, and onMounted
- Frontend: Added `formatEventDate()` (Ukrainian day names) and `daysFromNowLabel()` helper functions
- Frontend: Replaced hardcoded `fieldLabels` with computed from allFieldsSchema
- Frontend: Replaced hardcoded `vacationStatus`/`workingStatus` pattern matching with positional convention from schema options
- Frontend: Refactored `dashboardStats` computed and stat cards to dynamic v-for from schema options
- Template: Added "Сьогодні" and "Найближчі 7 днів" timeline sections with emoji indicators, formatted dates, days-badge, and empty states
- CSS: Added 8 timeline-related classes (.timeline-section, .timeline-title, .timeline-event, .timeline-emoji, .timeline-name, .timeline-desc, .timeline-date, .timeline-days-badge, .timeline-empty) in styles.css

### Change Log

- 2026-02-07: Story 2.1 implemented — Dashboard Events API and Timeline sections
- 2026-02-07: Post-impl: Changed "this week" logic to "next 7 days", title to "Найближчі 7 днів"
- 2026-02-07: Post-impl: Added formatEventDate(), daysFromNowLabel(), .timeline-days-badge
- 2026-02-07: Refactored all hardcoded schema values to dynamic (fieldLabels, vacationStatus, dashboardStats, stat cards)
- 2026-02-07: Code review fixes: refreshManually() now calls loadDashboardEvents(), end_date formatted via formatEventDate()
- 2026-02-08: Code review #2 fixes: [H1] formatEventDate guard for empty/invalid dates + template end_date checks; [M1] timezone fix — localDateStr() instead of toISOString().slice(); [M2] AC#3/AC#5 updated to "Найближчі 7 днів"; [M3] sprint-status.yaml added to File List; [M4] Dev Notes target impl updated to match actual "next 7 days" logic

### File List

- server/src/store.js (modified) — added getDashboardEvents(), refactored getDashboardStats() to dynamic per-option counts
- server/src/index.js (modified) — added getDashboardEvents import and GET /api/dashboard/events route
- client/src/api.js (modified) — added getDashboardEvents() method
- client/src/App.vue (modified) — added dashboardEvents ref, loadDashboardEvents(), formatEventDate(), daysFromNowLabel(), employmentOptions, statusCardColor(), dynamic fieldLabels/dashboardStats; updated watch/refresh/onMounted/refreshManually; added Timeline HTML sections with dynamic stat cards
- client/src/styles.css (modified) — added .timeline-* and .timeline-days-badge CSS classes
- CLAUDE.md (modified) — added "No Hardcoded Schema Values" rule with positional convention documentation
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified) — updated 2-1 story status to done
