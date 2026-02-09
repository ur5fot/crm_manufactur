# Story 2.3: Розширене модальне вікно нагадувань

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a адміністратор,
I want бачити модальне вікно з подіями відпусток при завантаженні сторінки,
So that я одразу отримую нагадування про важливі події без додаткових дій.

## Acceptance Criteria

1. **Given** сторінка завантажується і є події відпусток сьогодні **When** дані завантажені **Then** автоматично з'являється модальне вікно нагадувань **And** модальне вікно має max-width 500px, центроване, backdrop rgba(0,0,0,0.3)

2. **Given** модальне вікно відкрите **When** адміністратор бачить вміст **Then** відображаються дві секції: ✈️ "Йдуть у відпустку сьогодні" (синій акцент) — список працівників з датою повернення; 🏢 "Повертаються з відпустки сьогодні" (зелений акцент) — список працівників

3. **Given** немає працівників що йдуть у відпустку сьогодні **When** модальне вікно відображається **Then** секція "Йдуть у відпустку" не показується (тільки "Повертаються")

4. **Given** немає працівників що повертаються сьогодні **When** модальне вікно відображається **Then** секція "Повертаються" не показується (тільки "Йдуть у відпустку")

5. **Given** немає жодних подій сьогодні **When** сторінка завантажується **Then** модальне вікно НЕ з'являється

6. **Given** модальне вікно відкрите **When** адміністратор натискає кнопку "Закрити" або Escape **Then** модальне вікно закривається **And** адміністратор бачить Dashboard

## Tasks / Subtasks

- [x] Task 1: Оновити backdrop модального вікна (AC: #1)
  - [x] 1.1: Змінити CSS `.vacation-notification-overlay` background з `rgba(0, 0, 0, 0.5)` на `rgba(0, 0, 0, 0.3)` (відповідність UX spec)
- [x] Task 2: Додати підтримку клавіші Escape для закриття модалки (AC: #6)
  - [x] 2.1: Додати обробник `@keydown.escape` для закриття модального вікна
  - [x] 2.2: Варіант реалізації A: додати `@keydown.escape.window="closeVacationNotification"` на overlay div (Vue directive) — НЕ ОБРАНО
  - [x] 2.3: Варіант реалізації B: використати `onMounted` + `addEventListener('keydown', ...)` з перевіркою `showVacationNotification.value` та `event.key === 'Escape'` + `onUnmounted` cleanup — ОБРАНО
  - [x] 2.4: Обрати варіант що краще вписується в існуючий код — обрано варіант B (onMounted/onUnmounted)
- [x] Task 3: Перевірка існуючої логіки відповідності AC (AC: #1-#5)
  - [x] 3.1: Перевірити що модалка показується тільки коли є події (AC: #5 — `if (returningToday.length > 0 || startingToday.length > 0)`)
  - [x] 3.2: Перевірити що секція "Йдуть у відпустку" прихована коли `vacationStarting.length === 0` (AC: #3 — через `v-if`)
  - [x] 3.3: Перевірити що секція "Повертаються" прихована коли `vacationReturning.length === 0` (AC: #4 — через `v-if`)
  - [x] 3.4: Перевірити що кнопка "Зрозуміло" та backdrop click закривають модалку (AC: #6)
  - [x] 3.5: Перевірити що модалка має max-width 500px (AC: #1 — через CSS)
- [x] Task 4: Перевірка та валідація (AC: #1-#6)
  - [x] 4.1: Перевірити що модалка з'являється при завантаженні коли є події сьогодні
  - [x] 4.2: Перевірити що модалка НЕ з'являється коли немає подій
  - [x] 4.3: Перевірити backdrop rgba(0,0,0,0.3)
  - [x] 4.4: Перевірити Escape key закриває модалку
  - [x] 4.5: Перевірити що production build проходить без помилок (`cd client && npm run build`)

## Dev Notes

### Архітектурні обмеження та патерни

- **Brownfield проєкт** — розширення існуючого модального вікна в App.vue, НЕ створення нового
- **Без нових npm залежностей** — стандартний Vue 3 + DOM API
- **CSS підхід** — стилі модифікуються виключно в `client/src/styles.css`, окремі CSS файли ЗАБОРОНЕНІ
- **State management:** існуючі `ref()` — `showVacationNotification`, `vacationStarting`, `vacationReturning`
- **Naming conventions:** camelCase для JS, kebab-case для CSS
- **Мінімальні зміни** — більшість AC вже реалізовані, потрібні лише 2 зміни: backdrop opacity та Escape key handler

### Аналіз поточної реалізації vs Acceptance Criteria

**КРИТИЧНО: Більшість функціональності вже реалізована!** Ця story переважно ВАЛІДАЦІЙНА з двома невеликими змінами.

| AC | Статус | Що потрібно |
|----|--------|-------------|
| #1 Автоматична поява модалки з подіями | ✅ Вже реалізовано | Змінити backdrop з 0.5 → 0.3 |
| #2 Дві секції (синій/зелений акцент) | ✅ Вже реалізовано | Нічого (CSS вже має `.starting` blue, `.returning` green) |
| #3 Секція "Йдуть" прихована без подій | ✅ Вже реалізовано | Нічого (`v-if="vacationStarting.length > 0"`) |
| #4 Секція "Повертаються" прихована без подій | ✅ Вже реалізовано | Нічого (`v-if="vacationReturning.length > 0"`) |
| #5 Модалка НЕ з'являється без подій | ✅ Вже реалізовано | Нічого (`showVacationNotification` = true тільки при наявності подій) |
| #6 Закриття кнопкою або Escape | ⚠️ Частково | **Додати Escape key handler** (кнопка + backdrop click вже є) |

### Поточна реалізація (що модифікуємо)

**Vacation notification refs (App.vue рядки ~132-135):**
```javascript
const vacationReturning = ref([]);
const vacationStarting = ref([]);
const showVacationNotification = ref(false);
```

**checkVacations() (App.vue рядки ~430-525):**
Функція вже коректно:
1. Перевіряє повернення сьогодні → `returningToday[]`
2. Перевіряє початок відпустки сьогодні → `startingToday[]`
3. Показує модалку тільки якщо є події: `if (returningToday.length > 0 || startingToday.length > 0)`
4. Оновлює статуси через API
5. Перезавантажує employees після оновлень

**closeVacationNotification (App.vue рядки ~527-529):**
```javascript
function closeVacationNotification() {
  showVacationNotification.value = false;
}
```

**Modal template (App.vue рядки ~856-895):**
```html
<div v-if="showVacationNotification" class="vacation-notification-overlay" @click="closeVacationNotification">
  <div class="vacation-notification-modal" @click.stop>
    <!-- header з close-btn, body з двома секціями, footer з кнопкою "Зрозуміло" -->
  </div>
</div>
```
- ✅ `v-if` на overlay — модалка не рендериться без подій
- ✅ `@click` на overlay — закриття по backdrop
- ✅ `@click.stop` на modal — клік всередині не закриває
- ✅ Секція `.starting` (blue) для відпусток що починаються
- ✅ Секція `.returning` (green) для повернень
- ✅ `v-if` на кожну секцію — приховує порожні
- ⚠️ НЕМАЄ `@keydown.escape` для закриття по Escape

**Поточний CSS (styles.css рядки ~952-960):**
```css
.vacation-notification-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);  /* ← ЗМІНИТИ на 0.3 */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}
```

### Цільова реалізація

**Зміна 1: Backdrop opacity (styles.css)**

Знайти:
```css
background: rgba(0, 0, 0, 0.5);
```
Замінити на:
```css
background: rgba(0, 0, 0, 0.3);
```

**Зміна 2: Escape key handler (App.vue)**

Найпростіший підхід — додати watcher на `showVacationNotification` який додає/видаляє keydown listener:

```javascript
// Escape key для закриття модального вікна нагадувань
watch(showVacationNotification, (isVisible) => {
  if (isVisible) {
    const handler = (e) => {
      if (e.key === 'Escape') {
        closeVacationNotification();
        document.removeEventListener('keydown', handler);
      }
    };
    document.addEventListener('keydown', handler);
  }
});
```

АБО простіший варіант з `onMounted`/`onUnmounted`:

```javascript
function handleEscapeKey(e) {
  if (e.key === 'Escape' && showVacationNotification.value) {
    closeVacationNotification();
  }
}
onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey);
});
onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey);
});
```

Рекомендую **другий варіант** — чистіший, єдиний listener на весь lifecycle, без memory leak ризику.

### Важливі деталі реалізації

1. **Мінімальний scope змін** — це story по суті потребує лише 2 точкових змін. Решта вже працює. Не розширювати scope!

2. **Escape handler не повинен конфліктувати** з іншими модалками (delete confirmation, import). Перевірка `showVacationNotification.value` гарантує що Escape закриває тільки потрібну модалку.

3. **`checkVacations()` вже використовує `today` через `new Date().toISOString().split('T')[0]`** — УВАГА: Story 2.1 виявила timezone issue з `toISOString()` (див. code review fix M1). Перевірити чи `checkVacations()` також потребує виправлення на `localDateStr()`. Якщо `today` розраховується через `toISOString().split('T')[0]`, це може дати неправильну дату біля опівночі в часових поясах != UTC.

4. **Backdrop rgba(0,0,0,0.3)** — відповідно до UX specification (секція "Layout загальний: Modal: centered, max-width 500px, backdrop rgba(0,0,0,0.3)"). Поточне значення 0.5 було встановлено раніше і не відповідає spec.

5. **max-width 500px вже встановлений** в CSS `.vacation-notification-modal` — відповідає AC#1.

6. **Анімації вже є** — `fadeIn` для overlay, `slideUp` для modal. Не змінювати.

### UX специфікації

- **Backdrop:** rgba(0,0,0,0.3) — згідно UX spec (зараз 0.5 — занадто темний)
- **Max-width:** 500px — ✅ вже реалізовано
- **Секція "Йдуть":** blue accent (border-left: #3b82f6, background: #eff6ff) — ✅ вже реалізовано
- **Секція "Повертаються":** green accent (border-left: #10b981, background: #f0fdf4) — ✅ вже реалізовано
- **Закриття:** кнопка ×, backdrop click, Escape key, кнопка "Зрозуміло"
- **Автоматична поява:** тільки при наявності подій сьогодні (vacation_start або vacation_end)
- **Центрування:** flex align-items + justify-content center — ✅ вже реалізовано

[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Патерни модальних вікон]

### Попередня Story Intelligence (Story 2.2)

**Що було зроблено в Story 2.2:**
- `expandedCard` ref + `toggleStatCard()` + `expandedEmployees` computed
- Inline expand blocks inside `.stat-card-wrap` containers
- CSS transition max-height 200ms for expand AND collapse
- Production build passed without errors

**Що було зроблено в Story 2.1:**
- `getDashboardEvents()` backend endpoint
- `dashboardEvents` ref + `loadDashboardEvents()`
- Timeline "Сьогодні" та "Найближчі 7 днів" sections
- Timezone fix: `localDateStr()` замість `toISOString().slice()` в store.js
- Dynamic schema values замість hardcoded

**Уроки з попередніх stories:**
- Завжди перевіряти production build після змін
- Timezone awareness — `toISOString()` може дати неправильну дату (Story 2.1 fix M1)
- Мінімальні зміни — не розширювати scope
- CSS зміни тестувати візуально

**Git commits:**
- `cc58817` Story 2.2: Inline Expand для Stat Cards — реалізація + code review fixes
- `cdad612` Story 2.1: Dashboard Events API та Timeline секції — реалізація + code review fixes
- `8fd52f1` Story 1.3: Авто-рефреш Dashboard та Timestamp Footer
- `a992c15` Story 1.2: Dashboard API та Stat Cards
- `331b6e3` Story 1.1: Tab Bar навігація

### Потенціальне timezone покращення (OPTIONAL)

**УВАГА:** `checkVacations()` на рядку ~433 використовує:
```javascript
const today = new Date().toISOString().split('T')[0];
```

Цей підхід має timezone issue (виявлений та виправлений в Story 2.1 для store.js — commit `cdad612`, fix M1). Біля опівночі в часових поясах зі зсувом від UTC, `toISOString()` може повернути вчорашню або завтрашню дату.

**Рекомендація:** Замінити на `localDateStr()` або inline аналог:
```javascript
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
```

Це не в scope AC, але виправляє відомий баг. Рішення на розсуд розробника.

### Anti-patterns (ЗАБОРОНЕНО)

- НЕ створювати новий модальний компонент — розширювати існуючий HTML в App.vue
- НЕ додавати нових API endpoints — вся логіка вже на клієнті
- НЕ змінювати `checkVacations()` логіку (крім optional timezone fix) — вона працює коректно
- НЕ додавати нових npm залежностей
- НЕ створювати окремих CSS файлів
- НЕ змінювати анімації fadeIn/slideUp — вони працюють коректно
- НЕ модифікувати колірну палітру секцій (.starting blue, .returning green)
- НЕ додавати Vuex/Pinia для state management модалки
- НЕ додавати "Don't show again" або cookie persistence — не в scope

### Project Structure Notes

- Зміни в 2 файлах: `client/src/App.vue`, `client/src/styles.css`
- Ніяких нових файлів не створюється
- Ніяких нових npm залежностей
- Ніяких нових API endpoints
- Структура проєкту повністю відповідає існуючій архітектурі

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3: Розширене модальне вікно нагадувань]
- [Source: _bmad-output/planning-artifacts/prd.md#FR7 — Модальне вікно при завантаженні]
- [Source: _bmad-output/planning-artifacts/prd.md#FR8 — Дві секції в модальному вікні]
- [Source: _bmad-output/planning-artifacts/prd.md#FR9 — Закриття модального вікна]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Vacation status automation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Structure Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Патерни модальних вікон]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Візуальний фундамент — Layout загальний]
- [Source: client/src/App.vue#L132-135 — vacation notification refs]
- [Source: client/src/App.vue#L430-525 — checkVacations() function]
- [Source: client/src/App.vue#L527-529 — closeVacationNotification()]
- [Source: client/src/App.vue#L856-895 — vacation notification modal HTML template]
- [Source: client/src/styles.css#L952-1110 — vacation notification CSS]
- [Source: _bmad-output/implementation-artifacts/2-2-inline-expand-stat-cards.md — попередня story]
- [Source: _bmad-output/implementation-artifacts/2-1-dashboard-events-api-timeline.md — попередня story, timezone fix]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Production build passed successfully (vite build, 432ms, no errors)
- No test framework configured in project (no jest/vitest/cypress)

### Completion Notes List

- Task 1: Changed `.vacation-notification-overlay` background from `rgba(0, 0, 0, 0.5)` to `rgba(0, 0, 0, 0.3)` in styles.css line 959 — aligns with UX specification
- Task 2: Added `handleGlobalKeydown()` function + `document.addEventListener('keydown', ...)` in `onMounted` + `document.removeEventListener` in `onUnmounted` for Escape key support. Chose variant B (onMounted/onUnmounted lifecycle) over variant A (Vue directive) for consistency with existing codebase pattern
- Task 3: Verified all 5 existing AC implementations — all correct, no changes needed. Conditional rendering via `v-if`, modal show logic via `showVacationNotification` ref guard, max-width 500px confirmed in CSS
- Task 4: All AC validated. Production build passed (432ms, 0 errors). Backdrop opacity confirmed at 0.3. Escape key handler verified in code

### File List

- `client/src/styles.css` — modified (line 959: backdrop rgba(0,0,0,0.5) → rgba(0,0,0,0.3))
- `client/src/App.vue` — modified (added handleGlobalKeydown function, updated onMounted/onUnmounted with keydown listener for Escape key)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (2-3-enhanced-notifications-modal: ready-for-dev → in-progress → review)
- `_bmad-output/implementation-artifacts/2-3-enhanced-notifications-modal.md` — modified (tasks marked complete, dev agent record, status → review)

## Change Log

- 2026-02-09: Story 2.3 implemented — Enhanced Notifications Modal. Changed backdrop opacity from 0.5 to 0.3 per UX spec. Added Escape key handler for closing modal via onMounted/onUnmounted lifecycle pattern. All 6 AC verified (5 were already implemented, 2 minor changes applied).
- 2026-02-09: Code review fixes — [H1] Fixed timezone bug in checkVacations(): replaced toISOString().split('T')[0] with local date construction to prevent wrong date near midnight in non-UTC timezones. [M2] Fixed undefined CSS variable var(--radius) → var(--radius-lg) in .vacation-notification-modal border-radius. Production build passed (429ms).
- 2026-02-09: Code review #2 fixes — [H1] Fixed endDate display in notification modal: used formatEventDate() instead of raw YYYY-MM-DD format. [M1] Removed 6 debug console.log() calls from checkVacations() function. Production build passed (426ms).
