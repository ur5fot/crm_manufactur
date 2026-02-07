# Story 1.1: Tab Bar навігація

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a адміністратор,
I want перемикатися між режимами перегляду через горизонтальні вкладки (Dashboard, Картки, Таблиця, Логи),
So that я маю зручну навігацію між усіма розділами системи.

## Acceptance Criteria

1. **Given** сторінка завантажена **When** адміністратор бачить верхню частину інтерфейсу **Then** відображається Tab Bar з 4 вкладками: "Dashboard", "Картки", "Таблиця", "Логи" **And** Tab Bar має висоту 48px, border-bottom 1px solid #E0E0E0

2. **Given** Tab Bar відображається **When** адміністратор натискає на вкладку **Then** активна вкладка підсвічується (#1976D2 + border-bottom 2px) **And** вміст перемикається на відповідний view **And** попередній view switcher (3 кнопки) замінений новим Tab Bar

3. **Given** адміністратор наводить курсор на неактивну вкладку **When** hover спрацьовує **Then** текст вкладки змінює колір на #333 **And** cursor стає pointer

## Tasks / Subtasks

- [x] Task 1: Замінити view switcher на Tab Bar в App.vue (AC: #1, #2)
  - [x] 1.1: Перейменувати ref `viewMode` на `currentView` та додати значення `'dashboard'` (поки не default, default залишається `'table'`)
  - [x] 1.2: Замінити HTML блок `.top-actions` з 3 кнопками на новий `.tab-bar` з 4 вкладками
  - [x] 1.3: Зберегти кнопки "Оновити" та "Новий співробітник" окремо від Tab Bar (вони залишаються в `.topbar`)
  - [x] 1.4: Додати пустий `v-if="currentView === 'dashboard'"` блок-заглушку в template (контент Dashboard буде в Story 1.2)
  - [x] 1.5: Оновити всі `viewMode` references в template та script на `currentView`
- [x] Task 2: Додати CSS стилі Tab Bar в styles.css (AC: #1, #3)
  - [x] 2.1: Додати CSS Custom Properties для кольорів (якщо ще немає): `--color-primary: #1976D2`
  - [x] 2.2: Створити клас `.tab-bar` — flex контейнер, height 48px, border-bottom 1px solid #E0E0E0
  - [x] 2.3: Створити клас `.tab-item` — padding, font-size 14px, font-weight 500, color #666, cursor pointer, без border/background
  - [x] 2.4: Створити клас `.tab-item.active` — color #1976D2, border-bottom 2px solid #1976D2
  - [x] 2.5: Створити `.tab-item:hover` — color #333
  - [x] 2.6: Видалити або залишити стилі `button.secondary.active` (вони ще використовуються іншими кнопками, НЕ видаляти)
- [x] Task 3: Перевірити роботу навігації (AC: #1, #2, #3)
  - [x] 3.1: Переконатися що перемикання між Cards, Table, Logs працює як раніше
  - [x] 3.2: Переконатися що вкладка Dashboard відображає заглушку (порожній блок або повідомлення "Dashboard — coming soon")
  - [x] 3.3: Переконатися що кнопка "Логи" досі викликає `loadLogs()` при натисканні
  - [x] 3.4: Переконатися що кнопка "Новий співробітник" з'являється тільки при `currentView === 'cards'`

## Dev Notes

### Архітектурні обмеження та патерни

- **Brownfield проєкт** — розширення існуючого монолітного App.vue (~46KB), НЕ створення нового додатку
- **Без Vue Router** — навігація через reactive ref `currentView`, без URL routing
- **CSS підхід** — всі стилі додаються до `styles.css`, окремі CSS файли ЗАБОРОНЕНІ
- **Компоненти** — Tab Bar можна реалізувати як inline HTML в App.vue (v-for по масиву) або як окремий TabBar.vue компонент якщо > 100-150 рядків. Для цієї story рекомендується inline в App.vue (таб бар буде ~15-20 рядків HTML)
- **Naming conventions**: camelCase для JS (`currentView`), kebab-case для CSS (`.tab-bar`, `.tab-item`)

### Поточна реалізація (що замінюємо)

**HTML (App.vue ~рядки 800-830):**
```html
<div class="top-actions">
  <button class="secondary" :class="{ active: viewMode === 'cards' }" @click="viewMode = 'cards'">Картки</button>
  <button class="secondary" :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'">Зведена таблиця</button>
  <button class="secondary" :class="{ active: viewMode === 'logs' }" @click="viewMode = 'logs'; loadLogs()">Логи</button>
  <button class="secondary" @click="loadEmployees">Оновити</button>
  <button class="primary" @click="startNew" v-if="viewMode === 'cards'">Новий співробітник</button>
</div>
```

**JS (App.vue ~рядок 76):**
```javascript
const viewMode = ref("table"); // "cards", "table", or "logs"
```

**CSS (styles.css):**
```css
.top-actions { display: flex; gap: 12px; }
button.secondary.active { background: var(--accent); color: #fff; border-color: var(--accent); }
```

### Цільова реалізація (що створюємо)

**HTML Tab Bar (замість .top-actions кнопок):**
```html
<div class="tab-bar">
  <button
    v-for="tab in tabs"
    :key="tab.key"
    class="tab-item"
    :class="{ active: currentView === tab.key }"
    @click="switchView(tab.key)"
  >
    {{ tab.label }}
  </button>
</div>
```

**JS:**
```javascript
const currentView = ref("table"); // "dashboard", "cards", "table", "logs"

const tabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'cards', label: 'Картки' },
  { key: 'table', label: 'Таблиця' },
  { key: 'logs', label: 'Логи' },
];

function switchView(view) {
  currentView.value = view;
  if (view === 'logs') loadLogs();
}
```

**ВАЖЛИВО:** кнопки "Оновити" та "Новий співробітник" залишаються в `.topbar` окремо від Tab Bar. Вони не є частиною навігації.

### UX специфікації

- **Tab Bar anatomy:** 4 tab items — Dashboard · Картки · Таблиця · Логи
- **Висота:** 48px
- **Активна вкладка:** text color `#1976D2`, border-bottom 2px solid `#1976D2`
- **Неактивна вкладка:** text color `#666`, font-weight 500, font-size 14px
- **Hover:** text color `#333`, cursor pointer
- **Border:** bottom 1px solid `#E0E0E0` по всій ширині Tab Bar
- **Layout:** `display: flex`, tabs розташовані зліва
- **Без іконок** — тільки текстові мітки
- **Без анімацій** — миттєве перемикання (робочий інструмент, не продукт)

[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Компонентна стратегія]
[Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]

### Project Structure Notes

- Зміни лише в 2 файлах: `client/src/App.vue` та `client/src/styles.css`
- Ніяких нових файлів не створюється
- Ніяких нових npm залежностей
- Структура проєкту повністю відповідає існуючій архітектурі
- `v-if` блоки для views: `currentView === 'dashboard'` (новий), `currentView === 'cards'`, `currentView === 'table'`, `currentView === 'logs'`

### Anti-patterns (ЗАБОРОНЕНО)

- НЕ додавати Vue Router
- НЕ створювати окремі CSS файли
- НЕ використовувати CSS modules або scoped styles
- НЕ додавати анімації переходу між views
- НЕ змінювати default view на 'dashboard' (це буде в Story 1.2)
- НЕ видаляти стилі `button.secondary.active` — вони використовуються іншими кнопками
- НЕ змінювати `.topbar` layout — Tab Bar розміщується всередині або поруч

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Tab Bar навігація]
- [Source: _bmad-output/planning-artifacts/prd.md#FR14 — Навігація та перегляд]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Tab bar замінює існуючий view switcher]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns — Коли створювати окремі .vue компоненти]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Tab Bar компонент]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Візуальний фундамент — Колірна система]
- [Source: client/src/App.vue#L76 — viewMode ref]
- [Source: client/src/App.vue#L800-830 — current view switcher HTML]
- [Source: client/src/styles.css#L113-116 — .top-actions]
- [Source: client/src/styles.css#L740-745 — button.secondary.active]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Story created by create-story workflow with full artifact analysis
- All planning documents (PRD, Architecture, UX, Epics) analyzed for context
- Current codebase analyzed: existing view switcher code, styles, git history identified
- This is the first story in Epic 1 — prerequisite for all Dashboard functionality
- Implemented Tab Bar navigation replacing old 3-button view switcher with 4-tab bar (Dashboard, Картки, Таблиця, Логи)
- Renamed `viewMode` ref to `currentView` across all script and template references
- Added `tabs` array and `switchView()` function for clean navigation logic
- Dashboard tab shows placeholder "Dashboard — coming soon" panel
- "Оновити" and "Новий співробітник" buttons moved to `.topbar-actions` separate from tab bar
- CSS styles added: `.tab-bar` (48px flex container), `.tab-item` (inactive #666, active #1976D2 with 2px border-bottom), hover #333
- `button.secondary.active` styles preserved for other UI elements
- Production build passes with no errors (vite build successful)
- No new files created, no new dependencies added

### Implementation Plan

- Replaced `.top-actions` div with `.tab-bar` using v-for over `tabs` array
- Tab Bar placed inside `<header>` as part of the topbar component
- Used `switchView()` function that handles `loadLogs()` call when switching to logs tab
- Dashboard view uses `v-if`, others use `v-else-if` for proper conditional rendering
- Default view remains `'table'` as specified (not changed to 'dashboard')

### File List

- `client/src/App.vue` — modified (replaced view switcher with tab-bar, renamed viewMode → currentView, added tabs/switchView, added dashboard v-if block)
- `client/src/styles.css` — modified (renamed .top-actions → .topbar-actions, added .tab-bar, .tab-item, .tab-item.active, .tab-item:hover styles)

## Change Log

- 2026-02-06: Implemented Tab Bar navigation (Story 1.1) — replaced 3-button view switcher with 4-tab horizontal bar, added Dashboard placeholder view
- 2026-02-06: Code review (adversarial) — fixed 4 issues: added --color-primary CSS custom property (HIGH), consolidated duplicate hover rules (MEDIUM), moved tab-bar inside topbar to fix visual gap (MEDIUM), removed hardcoded background in favor of inherited topbar styles (MEDIUM)
