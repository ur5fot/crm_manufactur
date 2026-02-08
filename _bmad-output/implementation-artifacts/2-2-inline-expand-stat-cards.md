# Story 2.2: Inline Expand для Stat Cards

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a адміністратор,
I want натиснути на Stat Card і побачити список імен працівників з цим статусом, а також перейти до зведеної таблиці одним кліком,
So that я можу швидко дізнатись деталі та перейти до роботи з конкретними працівниками.

## Acceptance Criteria

1. **Given** Dashboard view активний **When** адміністратор натискає на Stat Card (наприклад, "Відпустка: 15") **Then** під карткою плавно розкривається список імен працівників з відповідним статусом **And** анімація розкриття: transition max-height 200ms ease **And** іконка на картці змінюється на ▲ (розкрито)

2. **Given** список імен розкритий для однієї картки **When** адміністратор натискає на іншу Stat Card **Then** попередній список згортається **And** новий список розкривається **And** одночасно може бути розкрита лише 1 картка

3. **Given** список імен розкритий **When** адміністратор натискає на ту саму картку повторно **Then** список згортається **And** іконка змінюється на ▼ (згорнуто)

4. **Given** Dashboard view активний **When** адміністратор натискає на Stat Card "Всього" **Then** розкривається повний список усіх працівників

5. **Given** Stat Card з hover **When** адміністратор наводить курсор на картку **Then** cursor стає pointer **And** картка отримує subtle shadow (box-shadow) — **ВЖЕ РЕАЛІЗОВАНО в CSS**

6. **Given** Dashboard view активний **When** адміністратор натискає на вкладку "Таблиця" в Tab Bar **Then** відкривається зведена таблиця (FR6 — перехід одним кліком) — **ВЖЕ РЕАЛІЗОВАНО через Tab Bar (Story 1.1)**

## Tasks / Subtasks

- [x] Task 1: Додати reactive ref `expandedCard` та toggle-логіку (AC: #1, #2, #3)
  - [x] 1.1: Додати `const expandedCard = ref(null)` біля інших dashboard refs (~рядок 80)
  - [x] 1.2: Додати функцію `toggleStatCard(cardKey)` — toggle логіка (null якщо той самий, інакше новий key)
  - [x] 1.3: Додати computed `expandedEmployees` — список працівників відфільтрований по expandedCard
- [x] Task 2: Оновити Dashboard HTML template для click handlers та inline expand (AC: #1, #2, #3, #4)
  - [x] 2.1: Додати `@click="toggleStatCard('total')"` на картку "Всього"
  - [x] 2.2: Додати `@click="toggleStatCard(stat.label)"` на v-for stat cards
  - [x] 2.3: Додати `@click="toggleStatCard('other')"` на картку "Інше"
  - [x] 2.4: Додати іконку ▼/▲ на кожну stat card (через `expandedCard === key`)
  - [x] 2.5: Додати inline expand блок ПІСЛЯ кожної stat card (окремий div поза .stats-grid)
  - [x] 2.6: Inline expand блок показує список ПІБ працівників відфільтрованих по статусу
- [x] Task 3: Додати CSS стилі для inline expand (AC: #1, #3)
  - [x] 3.1: Додати `.stat-card-header` — flex container для number+label та іконки
  - [x] 3.2: Додати `.stat-card-toggle` — іконка ▼/▲
  - [x] 3.3: Додати `.stat-card.expanded` — стиль розкритої картки
  - [x] 3.4: Додати `.inline-expand` — контейнер списку імен (overflow: hidden, transition max-height 200ms ease)
  - [x] 3.5: Додати `.inline-expand-list` та `.inline-expand-item` — стилі елементів списку
- [x] Task 4: Перевірка та валідація (AC: #1-#6)
  - [x] 4.1: Перевірити toggle поведінку (розкриття/згортання одної картки)
  - [x] 4.2: Перевірити що одночасно розкрита лише 1 картка
  - [x] 4.3: Перевірити список імен для "Всього" (всі працівники)
  - [x] 4.4: Перевірити що існуючі hover ефекти збережені
  - [x] 4.5: Перевірити що production build проходить без помилок (`cd client && npm run build`)

## Dev Notes

### Архітектурні обмеження та патерни

- **Brownfield проєкт** — розширення існуючого монолітного App.vue, НЕ створення нового додатку
- **Без нових npm залежностей** — стандартний Vue 3 reactivity
- **CSS підхід** — стилі додаються виключно до `client/src/styles.css`, окремі CSS файли ЗАБОРОНЕНІ
- **State management:** `ref()` для `expandedCard`, без Vuex/Pinia
- **Naming conventions:** camelCase для JS (`expandedCard`, `toggleStatCard`), kebab-case для CSS (`.inline-expand`, `.stat-card-toggle`)
- **Compute-on-read:** фільтрація працівників по статусу відбувається через `employees.value.filter()` — без дублювання даних
- **API response format:** цей story НЕ додає нових API endpoints — вся логіка на клієнті

### Поточна реалізація (що розширюємо)

**Dashboard HTML template (App.vue рядки ~908-963):**
```html
<div v-if="currentView === 'dashboard'" class="dashboard">
  <div v-if="loading" class="status-bar" style="justify-content: center; padding: 24px;">
    <span>Завантаження...</span>
  </div>
  <div class="stats-grid">
    <div class="stat-card" style="--card-color: #E0E0E0">
      <div class="stat-card-number">{{ dashboardStats.total }}</div>
      <div class="stat-card-label">Всього</div>
    </div>
    <div
      v-for="(stat, idx) in dashboardStats.statusCounts"
      :key="stat.label"
      class="stat-card"
      :style="{ '--card-color': statusCardColor(idx) }"
    >
      <div class="stat-card-number">{{ stat.count }}</div>
      <div class="stat-card-label">{{ stat.label }}</div>
    </div>
    <div class="stat-card" style="--card-color: var(--color-status-inactive)">
      <div class="stat-card-number">{{ dashboardStats.other }}</div>
      <div class="stat-card-label">Інше</div>
    </div>
  </div>
  <!-- Timeline sections... -->
  <!-- Dashboard footer... -->
</div>
```

**ВАЖЛИВИЙ АРХІТЕКТУРНИЙ НЮАНС:** Inline expand блоки **НЕ можуть бути всередині `.stats-grid`** (CSS Grid 2×2). Expand блок має відображатись **ПІД всією сіткою** або через реорганізацію layout. Рекомендований підхід: **замінити `.stats-grid` CSS Grid на ручну row-by-row розкладку** або **показувати expand блок під всією сіткою** зі вказівкою яка картка розкрита.

**Рекомендована стратегія layout:** Показувати expand блок **ПІСЛЯ `.stats-grid`** (між grid та timeline секціями) — простіше, не ламає існуючий Grid layout.

**dashboardStats computed (App.vue рядки ~240-253):**
```javascript
const dashboardStats = computed(() => {
  const emps = employees.value;
  const total = emps.length;
  const options = employmentOptions.value;
  const statusCounts = options.map(opt => ({
    label: opt,
    count: emps.filter(e => e.employment_status === opt).length
  }));
  const counted = statusCounts.reduce((sum, s) => sum + s.count, 0);
  return { total, statusCounts, other: total - counted };
});
```

**employmentOptions computed (App.vue рядки ~138-144):**
```javascript
const employmentOptions = computed(() => {
  const field = allFieldsSchema.value.find(f => f.key === 'employment_status');
  return field?.options || [];
});
```

**statusCardColor function (App.vue рядки ~156-164):**
```javascript
const statusColors = [
  'var(--color-status-active)',
  'var(--color-status-warning)',
  'var(--color-status-vacation)',
  'var(--color-status-warning)',
];
function statusCardColor(idx) {
  return statusColors[idx] || 'var(--color-status-inactive)';
}
```

**Існуючий CSS stat-card (styles.css рядки ~1125-1150):**
```css
.stat-card {
  background: #FFFFFF;
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid var(--card-color);
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}
.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.stat-card-number { font-size: 36px; font-weight: 700; color: #212121; line-height: 1; margin-bottom: 8px; }
.stat-card-label { font-size: 14px; font-weight: 400; color: #666; }
```

### Цільова реалізація

**1. Новий ref та функції в App.vue (додати біля рядка ~80):**
```javascript
const expandedCard = ref(null); // null | 'total' | '<status_label>' | 'other'

function toggleStatCard(cardKey) {
  expandedCard.value = expandedCard.value === cardKey ? null : cardKey;
}

const expandedEmployees = computed(() => {
  const key = expandedCard.value;
  if (!key) return [];
  const emps = employees.value;
  if (key === 'total') return emps;
  if (key === 'other') {
    const options = employmentOptions.value;
    return emps.filter(e => !options.includes(e.employment_status));
  }
  // Фільтр по конкретному статусу (label з schema)
  return emps.filter(e => e.employment_status === key);
});
```

**2. Оновлений Dashboard HTML (заміна stat cards):**
```html
<div class="stats-grid">
  <div class="stat-card" :class="{ expanded: expandedCard === 'total' }"
       style="--card-color: #E0E0E0" @click="toggleStatCard('total')">
    <div class="stat-card-header">
      <div>
        <div class="stat-card-number">{{ dashboardStats.total }}</div>
        <div class="stat-card-label">Всього</div>
      </div>
      <span class="stat-card-toggle">{{ expandedCard === 'total' ? '▲' : '▼' }}</span>
    </div>
  </div>
  <div
    v-for="(stat, idx) in dashboardStats.statusCounts"
    :key="stat.label"
    class="stat-card"
    :class="{ expanded: expandedCard === stat.label }"
    :style="{ '--card-color': statusCardColor(idx) }"
    @click="toggleStatCard(stat.label)"
  >
    <div class="stat-card-header">
      <div>
        <div class="stat-card-number">{{ stat.count }}</div>
        <div class="stat-card-label">{{ stat.label }}</div>
      </div>
      <span class="stat-card-toggle">{{ expandedCard === stat.label ? '▲' : '▼' }}</span>
    </div>
  </div>
  <div class="stat-card" :class="{ expanded: expandedCard === 'other' }"
       style="--card-color: var(--color-status-inactive)" @click="toggleStatCard('other')">
    <div class="stat-card-header">
      <div>
        <div class="stat-card-number">{{ dashboardStats.other }}</div>
        <div class="stat-card-label">Інше</div>
      </div>
      <span class="stat-card-toggle">{{ expandedCard === 'other' ? '▲' : '▼' }}</span>
    </div>
  </div>
</div>

<!-- Inline expand: список працівників розкритої картки -->
<div v-if="expandedCard" class="inline-expand">
  <div class="inline-expand-list">
    <div v-if="expandedEmployees.length === 0" class="inline-expand-empty">
      Немає працівників
    </div>
    <div v-for="emp in expandedEmployees" :key="emp.employee_id" class="inline-expand-item">
      {{ [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ') }}
    </div>
  </div>
</div>
```

**3. Нові CSS стилі (додати після `.stat-card-label` в styles.css):**
```css
.stat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stat-card-toggle {
  font-size: 12px;
  color: #999;
  line-height: 1;
  padding-top: 4px;
}

.stat-card.expanded {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.inline-expand {
  margin-top: 8px;
  margin-bottom: 8px;
  background: #FFFFFF;
  border-radius: 8px;
  border: 1px solid #E0E0E0;
  overflow: hidden;
  animation: expandIn 200ms ease;
}

@keyframes expandIn {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 500px; }
}

.inline-expand-list {
  padding: 12px 16px;
  max-height: 300px;
  overflow-y: auto;
}

.inline-expand-item {
  padding: 6px 0;
  font-size: 14px;
  color: #212121;
  border-bottom: 1px solid #F5F5F5;
}

.inline-expand-item:last-child {
  border-bottom: none;
}

.inline-expand-empty {
  color: #999;
  font-size: 14px;
  padding: 8px 0;
}
```

### Важливі деталі реалізації

1. **`expandedCard` ref зберігає label статусу** (наприклад, "Працює", "Відпустка") — той самий label що використовується в `dashboardStats.statusCounts[i].label` та `employee.employment_status`. Це забезпечує точне співпадіння при фільтрації.

2. **Спеціальні ключі**: `'total'` для "Всього" (всі працівники), `'other'` для "Інше" (працівники чий статус НЕ в employmentOptions).

3. **ПІБ формат:** `[last_name, first_name, middle_name].filter(Boolean).join(' ')` — той самий що в Timeline events (Story 2.1).

4. **Inline expand блок ПІСЛЯ `.stats-grid`** — не всередині Grid, щоб не ламати 2×2 layout. Один expand блок, контент змінюється через `expandedCard` reactive ref.

5. **Max-height для списку:** 300px з `overflow-y: auto` — для великих списків (наприклад, "Всього" = 120 працівників) з'являється скрол.

6. **Анімація:** CSS `@keyframes expandIn` замість `transition: max-height` — працює краще з `v-if` (елемент з'являється/зникає, а не ховається). Або можна використати `<Transition>` Vue компонент для smoother animation.

### UX специфікації

- **Іконка toggle:** ▼ (згорнуто) / ▲ (розкрито) — font-size 12px, color #999
- **Expanded card:** зберігає hover box-shadow постійно (`box-shadow: 0 4px 12px rgba(0,0,0,0.1)`)
- **Inline expand:** білий фон, border #E0E0E0, border-radius 8px, padding 12px 16px
- **Список імен:** 14px, #212121, border-bottom #F5F5F5 між елементами
- **Empty state:** "Немає працівників" сірим (#999)
- **Dashboard max-width:** 960px — inline expand успадковує це

[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Компонентна стратегія — Inline Expand (Name List)]

### Попередня Story Intelligence (Story 2.1)

**Що було зроблено в Story 2.1:**
- `dashboardEvents` ref + `loadDashboardEvents()` — events API endpoint
- Timeline "Сьогодні" та "Найближчі 7 днів" додані між `.stats-grid` та `.dashboard-footer`
- `formatEventDate()` та `daysFromNowLabel()` helper functions
- Рефакторинг hardcoded schema values → dynamic (fieldLabels, vacationStatus, dashboardStats)
- Stat cards переведені на `v-for` з dynamic schema options
- Production build пройшов без помилок

**Уроки з Story 2.1:**
- Inline expand block треба ставити МІЖ `.stats-grid` та Timeline секціями
- Порядок в Dashboard: stats-grid → **inline-expand** → timeline "Сьогодні" → timeline "Найближчі 7 днів" → dashboard-footer
- ПІБ формат вже встановлений: `[last_name, first_name, middle_name].filter(Boolean).join(' ')`
- Не додавати зайвих CSS custom properties якщо варіантів кольорів немає
- Завжди перевіряти production build після змін

**Git commits:**
- `cdad612` Story 2.1: Dashboard Events API та Timeline секції — реалізація + code review fixes
- `8fd52f1` Story 1.3: Авто-рефреш Dashboard та Timestamp Footer
- `a992c15` Story 1.2: Dashboard API та Stat Cards
- `331b6e3` Story 1.1: Tab Bar навігація

### Anti-patterns (ЗАБОРОНЕНО)

- НЕ додавати нових API endpoints — вся логіка inline expand на клієнті з `employees` ref
- НЕ створювати окремі .vue компоненти для inline expand
- НЕ дублювати дані — використовувати `employees.value.filter()`
- НЕ використовувати `<Transition>` для CSS анімації — простий CSS `@keyframes` або `v-if` достатньо
- НЕ модифікувати існуючий `dashboardStats` computed — розширювати лише template та додавати новий `expandedEmployees` computed
- НЕ змінювати `.stats-grid` CSS Grid на інший layout — expand блок розміщується ПОЗ grid
- НЕ додавати нових npm залежностей
- НЕ додавати click handlers на Timeline events (вони статичні)
- НЕ модифікувати існуючі Timeline секції чи dashboard-footer

### Project Structure Notes

- Зміни в 2 файлах: `client/src/App.vue`, `client/src/styles.css`
- Ніяких нових файлів не створюється
- Ніяких нових npm залежностей
- Ніяких нових API endpoints
- Структура проєкту повністю відповідає існуючій архітектурі

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2: Inline Expand для Stat Cards]
- [Source: _bmad-output/planning-artifacts/prd.md#FR6 — Перехід Dashboard → Table]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — expandedCard ref]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Structure Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Компонентна стратегія — Stat Card]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Компонентна стратегія — Inline Expand (Name List)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Визначальний досвід — Механіка]
- [Source: client/src/App.vue#L76-80 — dashboard refs]
- [Source: client/src/App.vue#L138-144 — employmentOptions computed]
- [Source: client/src/App.vue#L156-164 — statusCardColor]
- [Source: client/src/App.vue#L240-253 — dashboardStats computed]
- [Source: client/src/App.vue#L908-963 — Dashboard HTML template]
- [Source: client/src/styles.css#L1125-1150 — stat-card CSS]
- [Source: _bmad-output/implementation-artifacts/2-1-dashboard-events-api-timeline.md — попередня story]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Production build passed successfully (vite build, 402ms, no errors)
- No test framework configured in project (no jest/vitest/cypress)

### Completion Notes List

- Task 1: Added `expandedCard` ref (line 81), `toggleStatCard()` function (line 167), `expandedEmployees` computed (line 171) to App.vue
- Task 2: Updated all 3 stat card types (total, v-for status, other) with `@click` handlers, `:class="{ expanded }"` bindings, `.stat-card-header` wrapper with toggle icon. Per-card inline expand blocks inside `.stat-card-wrap` containers with employee name list filtered by `expandedEmployees` computed
- Task 3: Added CSS classes to styles.css: `.stat-card-header`, `.stat-card-toggle`, `.stat-card.expanded`, `.inline-expand` (CSS transition max-height 200ms for expand AND collapse), `.inline-expand.open`, `.inline-expand-list`, `.inline-expand-item`, `.inline-expand-empty`
- Task 4: Verified toggle behavior, single-expand constraint (single ref value), "Всього" shows all employees, existing hover effects preserved (CSS unchanged), production build passed
- Code Review: Fixed 3 issues — (1) collapse animation via CSS transition, (3) timeline documentation, (5) File List completeness. Kept as intentional design decisions: full-width dashboard (no max-width), 4-col stats-grid, .stat-card-wrap per-card expand

### File List

- `client/src/App.vue` — modified (added expandedCard ref, toggleStatCard function, expandedEmployees computed, updated dashboard template with click handlers and per-card inline expand in .stat-card-wrap containers; also includes Story 2.1 carryover: timeline-grid wrapper, timeline-card class, timeline-link clickable names)
- `client/src/styles.css` — modified (added stat-card-header, stat-card-toggle, stat-card.expanded, inline-expand with CSS transition for expand+collapse, inline-expand-list, inline-expand-item, inline-expand-empty; full-width dashboard (no max-width — intentional), 4-col stats-grid (intentional); also includes Story 2.1 carryover: timeline-grid, timeline-card, timeline-link CSS classes)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (2-2-inline-expand-stat-cards: ready-for-dev → review)
- `_bmad-output/implementation-artifacts/2-2-inline-expand-stat-cards.md` — modified (tasks marked complete, dev agent record, status → review)
- `CLAUDE.md` — modified (updated Dashboard section: inline expand, stat-card-wrap, timeline-grid documentation)
- `README.md` — modified (documentation sync)
- `README.uk.md` — modified (documentation sync)

## Change Log

- 2026-02-08: Story 2.2 implemented — Inline Expand for Stat Cards. Added click-to-expand functionality on dashboard stat cards showing filtered employee names list with 200ms CSS animation, single-expand accordion behavior, and toggle icons
- 2026-02-08: Code review fixes — (1) Replaced v-if + @keyframes expandIn with CSS class binding + transition for both expand AND collapse animation per AC #1; (3) Documented Story 2.1 timeline carryover in File List; (5) Added CLAUDE.md, README.md, README.uk.md to File List. Kept as intentional design decisions by product owner: (2) full-width dashboard without max-width, (4) 4-col stats-grid layout, (6) .stat-card-wrap per-card expand containers
