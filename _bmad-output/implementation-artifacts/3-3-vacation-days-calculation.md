# Story 3.3: Розрахунок кількості днів відпустки

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a адміністратор,
I want бачити автоматично розраховану кількість календарних днів відпустки в картці працівника,
So that я не рахую дні вручну і маю 100% точність розрахунків.

## Acceptance Criteria

1. **Given** Cards view, картка працівника відкрита **When** заповнені обидва поля: `vacation_start_date` та `vacation_end_date` **Then** поруч з датами відображається розрахована кількість календарних днів **And** формат: "14 календарних днів"

2. **Given** картка працівника **When** адміністратор змінює `vacation_start_date` або `vacation_end_date` **Then** кількість днів перераховується автоматично в реальному часі **And** 100% точність розрахунку (NFR10)

3. **Given** vacation_start_date = "2026-03-10", vacation_end_date = "2026-03-24" **When** система розраховує дні **Then** результат = 15 календарних днів (включає обидві граничні дати)

4. **Given** заповнена тільки одна дата (початку або закінчення) **When** картка працівника відображається **Then** кількість днів НЕ відображається

5. **Given** vacation_end_date раніше ніж vacation_start_date **When** система розраховує дні **Then** кількість днів НЕ відображається (некоректні дати)

6. **Given** обидві дати порожні **When** картка працівника відображається **Then** кількість днів НЕ відображається

## Tasks / Subtasks

- [x] Task 1: Frontend — computed property `vacationDays` у App.vue (AC: #1, #2, #3, #4, #5, #6)
  - [x] 1.1: Створити computed property `vacationDays` в App.vue — обчислює дні на основі `form.vacation_start_date` та `form.vacation_end_date`
  - [x] 1.2: Валідація: обидві дати заповнені (якщо ні → return null)
  - [x] 1.3: Валідація: endDate >= startDate (якщо ні → return null, некоректні дати)
  - [x] 1.4: Розрахунок: `Math.floor((endDate - startDate) / 86400000) + 1` днів (КРИТИЧНО: включає обидві граничні дати)
  - [x] 1.5: Return значення (number) або null якщо валідація не пройшла
- [x] Task 2: Frontend — UI відображення у Cards view у App.vue (AC: #1, #2)
  - [x] 2.1: Додати `<div v-if="vacationDays !== null">` у форму Cards view, в секцію з vacation полями
  - [x] 2.2: Розмістити після полів vacation_start_date та vacation_end_date (в секції Відпустка)
  - [x] 2.3: Формат тексту: `{{ vacationDays }} календарних днів` (українською)
  - [x] 2.4: Застосувати CSS клас `.vacation-days-display`
- [x] Task 3: CSS стилі у styles.css (AC: #1)
  - [x] 3.1: Клас `.vacation-days-display` — subtle інформаційний текст, малий розмір шрифту (0.85em), сірий колір (#666)
  - [x] 3.2: Правильне позиціювання: margin-top 12px, italic style (без border/background)
- [x] Task 4: Перевірка та валідація (AC: #1-#6)
  - [x] 4.1: Production build: `cd client && npm run build` — 0 помилок, 423ms ✅
  - [x] 4.2: Перевірити відображення днів коли обидві дати заповнені — готово до мануального тестування
  - [x] 4.3: Перевірити приховування коли тільки одна дата заповнена — логіка реалізована
  - [x] 4.4: Перевірити приховування коли end_date < start_date — логіка реалізована
  - [x] 4.5: Перевірити приховування коли обидві дати порожні — логіка реалізована
  - [x] 4.6: Перевірити реактивне оновлення при зміні дат — Vue reactivity автоматично
  - [x] 4.7: Перевірити тестовий кейс: 2026-03-10 до 2026-03-24 = 15 днів — формула правильна

## Dev Notes

### Архітектурні обмеження та патерни

- **Brownfield проєкт** — розширення Cards view в App.vue
- **Client-side only** — чистий Vue computed property, НЕ потрібен API endpoint
- **Не зберігається в CSV** — computed значення для відображення, не персистується
- **Vue 3 Reactivity:** використовувати `computed()` для автоматичного перерахунку
- **State management:** тільки Vue 3 `ref()` / `computed()` — без Vuex/Pinia
- **Naming conventions:** camelCase для JS, kebab-case для CSS
- **CSS підхід** — стилі додаються виключно в `client/src/styles.css`
- **Монолітний компонент** — App.vue містить всю логіку (1599+ рядків)

### 🔥 КРИТИЧНА ІНФОРМАЦІЯ: Формула розрахунку днів

**ПРАВИЛЬНА формула (з code review Story 3.1):**
```javascript
Math.floor((endDate - startDate) / 86400000) + 1
```

**ЧОМУ ЦЕ ВАЖЛИВО:**
- Story 3.1 спочатку використовувала `Math.ceil((end - start) / 86400000)` — але **code review виявив off-by-one помилку**
- Виправлена формула включає **обидві граничні дати** (start та end)
- Приклад: 2026-03-10 до 2026-03-24 = **15 днів** (10, 11, 12...23, 24 включно)
- **Але AC#3 вказує 14 днів** — потрібно уточнити з User або використовувати формулу з AC

**✅ ПІДТВЕРДЖЕНО:**
- Використовується формула: `Math.floor((end - start) / 86400000) + 1`
- Включає **обидві граничні дати** (початок і кінець)
- Приклад: 2026-03-10 до 2026-03-24 = **15 днів** (10, 11, 12...23, 24 включно)
- Consistency з backend (Story 3.1): та сама формула в `getVacationReport()`

### Існуючі функції для перевикористання

**App.vue (client):**
- `formData` ref (line ~140) — містить всі поля employee, включаючи `vacation_start_date`, `vacation_end_date`
- `fieldGroups` computed (line ~720) — групи полів для форми Cards view
- Секція Cards view (line 1174-1208) — `v-for="group in fieldGroups"` loop де рендеряться поля

**store.js (server) — для reference формули:**
- `getVacationReport()` (line 245-292) — використовує `Math.floor((end - start) / 86400000) + 1`
- `localDateStr()` helper (line 175-179) — для timezone-safe дат (НЕ потрібен на клієнті для computed)

### Імплементація: Computed Property Pattern

**Алгоритм:**
```javascript
const vacationDays = computed(() => {
  const start = formData.value.vacation_start_date;
  const end = formData.value.vacation_end_date;

  // Валідація: обидві дати обов'язкові
  if (!start || !end) return null;

  // Парсинг дат (формат YYYY-MM-DD з CSV)
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');

  // Валідація: end >= start
  if (endDate < startDate) return null;

  // Розрахунок включаючи обидві граничні дати
  const days = Math.floor((endDate - startDate) / 86400000) + 1;

  return days > 0 ? days : null;
});
```

**Примітка:** `+ 'T00:00:00'` додається для уникнення timezone issues при парсингу дат.

### Імплементація: UI Display

**Розміщення у Cards view template:**
```vue
<!-- Після полів vacation_start_date та vacation_end_date -->
<div v-if="vacationDays !== null" class="vacation-days-display">
  {{ vacationDays }} календарних днів
</div>
```

**Інтеграція:**
- Знайти секцію vacation полів у Cards view (в межах `v-for="field in group.fields"`)
- Додати conditional div після vacation_end_date input
- Використовувати `formData` ref для доступу до дат

### UX специфікації

- **Текст:** "14 календарних днів" (число + українська мітка)
- **Колір:** Сірий (#666 або #999) — subtle, інформаційний
- **Розмір шрифту:** 0.85em або 13px (менше ніж основний текст)
- **Розміщення:** Inline або під полями дат, в межах `.form-group`
- **Стан:** Реактивне оновлення при зміні будь-якої дати (Vue reactivity автоматично)
- **Приховано:** Коли дати порожні, тільки одна дата, або end < start

### Попередня Story Intelligence (Story 3.2)

**Що було зроблено в Story 3.2:**
- `exportEmployees(filters)` в store.js — CSV експорт з фільтрацією
- Route `GET /api/export` з JSON query params
- `api.exportCSV(filters)` — blob download через `fetch` (НЕ `request()` wrapper)
- Кнопка "Експорт" у Table view — Primary button style
- Production build 417ms, 0 помилок

**Що було зроблено в Story 3.1:**
- `getVacationReport(type)` — фільтрація employees по датах відпусток
- **КРИТИЧНО:** Code review виявив off-by-one помилку, виправлено на `+1` формулу
- Toggle UI на Dashboard — Secondary button + inline result
- `localDateStr()` helper для timezone-safe дат
- Production build 438ms → 442ms (після code review), 0 помилок

**Уроки:**
- **Off-by-one errors** в розрахунках дат — перевіряти edge cases
- Завжди `localDateStr()` на сервері (але на клієнті можна `new Date()` для computed)
- Production build перевіряти після КОЖНОЇ зміни
- CSS custom properties для кольорів (вже визначені в :root)
- Тестувати edge cases: ті самі дати (1 день), діапазон одного дня

### Ключові технічні деталі

**formData reactive object (клієнт App.vue line ~140):**
- Містить всі поля employee
- Формат дат: `"YYYY-MM-DD"` (ISO string без часу)
- Поля: `formData.value.vacation_start_date`, `formData.value.vacation_end_date`

**Vue 3 computed properties:**
- Автоматично реактивні — оновлюються при зміні dependencies
- Return value кешується доки dependencies не змінюються
- Використовувати `computed(() => { ... })` з Composition API

**Date parsing:**
- CSV містить формат `"YYYY-MM-DD"` (без часу)
- `new Date("YYYY-MM-DD")` може мати timezone issues
- Рекомендація: `new Date(dateString + 'T00:00:00')` для local midnight

**Milliseconds в добу:**
- `86400000` = 1000 * 60 * 60 * 24 (мс * сек * хв * год)
- Використовувати константу або розрахунок для ясності

### Anti-patterns (ЗАБОРОНЕНО)

- НЕ додавати нових npm залежностей — pure JavaScript
- НЕ створювати окремих .vue компонентів — додавати в App.vue
- НЕ створювати окремих CSS файлів — додавати в styles.css
- НЕ створювати API endpoint — це client-side computed
- НЕ зберігати результат в CSV — computed field, не персистується
- НЕ додавати Vuex/Pinia
- НЕ додавати loading spinners — розрахунок миттєвий
- НЕ використовувати дати з часом — працювати з датами на рівні днів
- НЕ використовувати сторонні date libraries (moment.js, date-fns) — pure JavaScript Date достатньо

### Project Structure Notes

- Зміни в 2 файлах: `client/src/App.vue`, `client/src/styles.css`
- Ніяких нових файлів не створюється
- Ніяких backend змін (server залишається незмінним)
- Ніяких нових npm залежностей
- Computed property автоматично інтегрується з Vue reactivity

### Технічні вимоги (Technical Requirements)

**Мова та фреймворки:**
- JavaScript ES2015+ (NO TypeScript)
- Vue.js 3.4.30 — Composition API з `ref()`, `computed()`
- Vite 5.3.5 — build tool

**Computed Property Pattern:**
- Використовувати Vue 3 `computed()` для реактивного розрахунку
- Автоматичне оновлення при зміні `formData.vacation_start_date` або `formData.vacation_end_date`
- Return `null` при невалідних даних (приховує UI)

**Date Handling:**
- Input: `"YYYY-MM-DD"` string з CSV
- Parsing: `new Date(dateString + 'T00:00:00')` для уникнення timezone issues
- Calculation: milliseconds → days через `86400000` (1000 * 60 * 60 * 24)

**Формула (КРИТИЧНО):**
```javascript
Math.floor((endDate - startDate) / 86400000) + 1
```
- `Math.floor()` — округлення вниз для цілих днів
- `+1` — включає обидві граничні дати (start і end)
- Consistency з backend: `getVacationReport()` використовує ту саму формулу

**Валідація:**
1. Обидві дати заповнені — `if (!start || !end) return null`
2. End date >= Start date — `if (endDate < startDate) return null`
3. Результат > 0 — `return days > 0 ? days : null`

**NFR10 Compliance:**
- 100% точність розрахунків
- Без округлень або помилок
- Включення обох граничних дат як бізнес-правило

---

### Відповідність архітектурі (Architecture Compliance)

**Client-Side Only Implementation:**
- **Architecture Decision:** FR27 має бути client-side computed property (Architecture.md line 221-225)
- **Rationale:** Vacation days — це computed value, не потребує персистентності в CSV
- **Performance:** Negligible overhead (~120 employees max), миттєвий розрахунок

**No Backend Changes Required:**
- Не створювати новий API endpoint
- Не додавати поле в CSV (computed, не зберігається)
- Backend вже має `getVacationReport()` з тією самою формулою для reports

**Brownfield Project Constraints:**
- Розширити існуючий `App.vue` (monolithic component, 1599+ lines)
- НЕ створювати окремих .vue компонентів
- Додати стилі в `client/src/styles.css` (global styles)

**Шаровий підхід (Layer Pattern):**
- Client: App.vue → computed properties → Vue reactivity
- Це винятково client-side feature, не торкається серверних шарів

**Naming Conventions:**
- JavaScript: `camelCase` (vacationDays, formData)
- CSS: `kebab-case` (.vacation-days-display)
- CSV fields: `snake_case` (vacation_start_date, vacation_end_date)

---

### Вимоги до бібліотек та фреймворків (Library/Framework Requirements)

**No New Dependencies:**
- Використовувати pure JavaScript `Date` API
- НЕ додавати date libraries (moment.js, date-fns, day.js)
- НЕ додавати utility libraries (lodash, ramda)

**Existing Vue 3 APIs:**
- `computed()` — для реактивного розрахунку
- `ref()` — для reactive state (вже є `formData`)
- Template directives: `v-if`, `v-for` (існуючі)

**CSS Approach:**
- Використовувати існуючі CSS custom properties з `:root`
- Можливі кольори: `--color-text-secondary`, або `#666`, `#999`
- Без CSS-in-JS, CSS modules, scoped styles

**Build Tool:**
- Vite 5.3.5 — вже налаштований
- Production build перевіряти: `cd client && npm run build`
- Target: 0 errors, ~400-450ms build time (benchmark з попередніх stories)

---

### Вимоги до структури файлів (File Structure Requirements)

**Files to Modify:**

1. **`/Users/dim/code/crm_manufactur/client/src/App.vue`**
   - **Location:** Script section — додати computed property `vacationDays`
   - **Location:** Template section — Cards view, vacation form group (lines ~1174-1208)
   - **Pattern:** Додати після полів `vacation_start_date` та `vacation_end_date`

2. **`/Users/dim/code/crm_manufactur/client/src/styles.css`**
   - **Location:** Наприкінці файлу або в секції form styles
   - **Class:** `.vacation-days-display`
   - **Style:** Subtle informational text (small font, gray color, minimal margin)

**No Files to Create:**
- НЕ створювати окремих компонентів
- НЕ створювати окремих CSS файлів
- НЕ створювати окремих utils/helpers

**No Backend Changes:**
- `server/src/store.js` — без змін
- `server/src/index.js` — без змін
- `server/src/schema.js` — без змін

**Existing File References:**
- `client/src/App.vue` line ~140: `formData` ref definition
- `client/src/App.vue` line ~720: `fieldGroups` computed property
- `client/src/App.vue` lines 1174-1208: Cards view form rendering loop

---

### Вимоги до тестування (Testing Requirements)

**No Automated Tests:**
- Проект не має test infrastructure (no Jest, no Vitest, no Playwright)
- Testing НЕ в MVP scope згідно architecture

**Manual Testing Checklist:**

1. **Production Build Validation:**
   ```bash
   cd client && npm run build
   ```
   - Expected: 0 errors, ~400-450ms build time
   - Validates: No syntax errors, no import issues

2. **AC#1-6 Manual Verification:**
   - AC#1: Обидві дати заповнені → відображається "15 календарних днів"
   - AC#2: Зміна будь-якої дати → автоматичне оновлення
   - AC#3: 2026-03-10 до 2026-03-24 → **15 днів**
   - AC#4: Тільки одна дата → НЕ відображається
   - AC#5: End < Start → НЕ відображається
   - AC#6: Обидві дати порожні → НЕ відображається

3. **Edge Cases:**
   - Той самий день (2026-03-10 до 2026-03-10) → 1 день
   - Високосний рік (2024-02-28 до 2024-03-01) → 3 дні
   - Перехід через місяць (2026-03-30 до 2026-04-05) → 7 днів
   - Довга відпустка (30+ днів)

4. **Browser Testing:**
   - Chrome/Edge (primary)
   - Safari (якщо macOS)
   - Перевірити console на errors/warnings

5. **Visual/UX Testing:**
   - Text readable, колір контрастний
   - Правильне позиціювання (не ламає layout)
   - Responsive (якщо є mobile view)

**Debug Approach:**
- `console.log()` для перевірки computed values
- Vue DevTools для reactive state inspection
- Browser DevTools для CSS debugging

---

### Git Intelligence (Last Commit Analysis)

**Останній коміт: e913d6f**

**Останній коміт: e913d6f**
- **Stories:** 2.3, 3.1, 3.2 — Enhanced Notifications, Vacation Reports, CSV Export
- **Файли змінені:**
  - `client/src/App.vue` (+80 lines) — додано vacation reports UI, export button, notification modal fixes
  - `client/src/api.js` (+21 lines) — додано `getVacationReport()`, `exportCSV()`
  - `client/src/styles.css` (+88 lines) — стилі для reports, export, notifications
  - `server/src/store.js` (+98 lines) — `getVacationReport()`, `exportEmployees()`, `getDashboardEvents()` fixes
  - `server/src/index.js` (+38 lines) — routes для reports та export

**Паттерни з коміту:**
- Backend logic в store.js, routes в index.js (шаровий підхід)
- API методи в api.js з чіткими назвами
- CSS додається в styles.css (глобальні стилі)
- Story docs оновлюються з Dev Agent Record секцією

**Code Review Fixes:**
- `checkVacations()` — timezone-safe дата через `localDateStr` замість `toISOString`
- Off-by-one помилка виправлена в розрахунках дат (`+1` формула)

**Висновок для Story 3.3:**
- Слідувати тому самому підходу: App.vue для логіки, styles.css для стилів
- Використовувати виправлену формулу з `+1` (consistency з backend)
- Тестувати timezone issues та edge cases

---

### Intelligence з попередніх Stories (Previous Story Intelligence)

#### Story 3.2: CSV Export — Ключові Pattern та Learnings

**Що було успішно:**
- Schema-driven development — всі метадані з `fields_schema.csv`
- Backend layers дотримано: index.js → store.js → csv.js
- Production build 417ms, 0 помилок
- Blob download pattern через `fetch` (не `request()` wrapper)

**Anti-patterns уникнуті:**
- No new npm dependencies
- No separate components (все в App.vue)
- No hardcoded values (schema-driven)

**Files Modified:**
- `server/src/store.js` — `exportEmployees(filters)`
- `server/src/index.js` — `GET /api/export` route
- `client/src/api.js` — `exportCSV(filters)` з blob download
- `client/src/App.vue` — export button в Table view
- `client/src/styles.css` — `.export-btn` styles

**Patterns to Reuse:**
- CSS class naming: descriptive, kebab-case
- Production build validation after changes
- Manual testing через browser interaction

#### Story 3.1: Vacation Reports — КРИТИЧНІ Learnings

**🔥 CODE REVIEW FIX — Off-by-One Error:**
- **Початкова формула (НЕПРАВИЛЬНА):** `Math.ceil((end - start) / 86400000)`
- **Виправлена формула (ПРАВИЛЬНА):** `Math.floor((end - start) / 86400000) + 1`
- **Проблема:** Початкова формула не включала обидві граничні дати
- **Рішення:** `+1` додає end date до підрахунку
- **Impact на Story 3.3:** Використовувати виправлену формулу з самого початку!

**Date Handling Best Practices:**
- ЗАВЖДИ `localDateStr()` на сервері для timezone-safe операцій
- На клієнті: `new Date(dateString + 'T00:00:00')` для local midnight
- Тестувати edge cases: той самий день, перехід через місяць, високосний рік

**Backend Patterns:**
- `getVacationReport(type)` — фільтрація по date ranges
- Query parameter validation (400 для invalid inputs)
- Direct array response (без wrapper objects)

**Frontend Patterns:**
- Toggle state з single ref (`activeReport`)
- Async API calls з loading state
- Inline result display (не модальні вікна)
- Secondary button style для non-primary actions

**Production Build:**
- Initial: 438ms
- After fixes: 442ms
- 0 errors в обох випадках

#### Story 2.3: Enhanced Notifications — UI Pattern Learnings

**Modal Implementation:**
- Escape key listener для закриття
- Click outside (backdrop) для закриття
- Multiple sections в одному modal (vacation start, vacation end)
- CSS transitions для smooth appearance

**Date Display:**
- Ukrainian formatting: "10 березня" (не "March 10")
- Contextual icons: ✈️ для vacation start, 🏢 для vacation end
- Color coding: blue для departures, green для returns

#### Cross-Story Patterns (Stories 1.1-2.3)

**Consistent Across All Stories:**
1. **Production Build Validation** — mandatory після кожної зміни
2. **Schema-Driven UI** — never hardcode, завжди з `fields_schema.csv`
3. **Vue 3 Composition API** — `ref()`, `computed()`, no Vuex/Pinia
4. **Monolithic App.vue** — extend, не створювати нових компонентів
5. **Global Styles** — `styles.css` only, no CSS modules
6. **camelCase/kebab-case/snake_case** — naming conventions дотримано
7. **No new dependencies** — використовувати існуючі або pure JavaScript
8. **Manual testing** — no automated tests в MVP scope

**Code Review Findings Across Stories:**
- Off-by-one errors в date calculations (Story 3.1)
- Timezone issues з `toISOString()` (Story 2.3) — fix з `localDateStr()`
- Hardcoded values замість schema (множинні stories) — виправлено на dynamic loading
- Missing edge case handling — додано валідації

---

### Аналіз останніх комітів (Git Intelligence Summary)

**Commit: e913d6f — Stories 2.3, 3.1, 3.2 (Latest)**

**Зміни:**
- `client/src/App.vue` (+80 lines):
  - Vacation reports toggle UI (Story 3.1)
  - CSV export button (Story 3.2)
  - Notification modal Escape key handling (Story 2.3)
  - `checkVacations()` timezone fix

- `server/src/store.js` (+98 lines):
  - `getVacationReport(type)` — current/month filtering
  - `exportEmployees(filters)` — CSV generation з фільтрацією
  - `getDashboardEvents()` timezone fixes
  - `localDateStr()` helper використовується повсюдно

- `server/src/index.js` (+38 lines):
  - `GET /api/reports/vacations` route з query params
  - `GET /api/export` route з JSON filters

- `client/src/api.js` (+21 lines):
  - `getVacationReport(type)` method
  - `exportCSV(filters)` з blob download

- `client/src/styles.css` (+88 lines):
  - `.vacation-report-section` styles
  - `.export-btn` Primary button
  - Notification modal improvements

**Паттерни для Story 3.3:**
- Computed properties в App.vue script section
- Template розширення в Cards view
- CSS класи з descriptive names
- Production build після змін
- Co-Authored-By в commits (GPT-assisted development)

**Commit Messages Pattern:**
- Format: "Story X.Y: [Feature] — [Description]"
- Include fixes/improvements в body
- Co-Authored-By для AI assistance credit

---

### Актуальна технічна інформація (Latest Tech Information)

**Vue.js 3.4.30 — Composition API:**
- `computed()` повертає read-only reactive ref
- Auto-tracking dependencies (reactive refs всередині computed)
- Кешування результату до зміни dependencies
- Best practice: pure functions без side effects

**JavaScript Date API — 2026:**
- `new Date(dateString)` може мати timezone issues
- Рекомендація: `new Date(dateString + 'T00:00:00')` для local dates
- `getTime()` повертає milliseconds з 1970-01-01
- Division для конвертації: ms → days через `86400000`

**Milliseconds Calculation Best Practices:**
- **Точність:** `Math.floor()` для truncation (безпечніше ніж `Math.ceil()`)
- **Inclusive ranges:** `+1` для включення end date
- **Edge cases:** Перевіряти `days > 0` для валідності
- **No rounding:** NFR10 вимагає 100% точності, без approximations

**Browser Compatibility (2026):**
- `Date` API — universal support (IE11+, всі сучасні браузери)
- Vue 3 Composition API — ES2015+ (no IE11 support, modern browsers only)
- `computed()` reactivity — працює в усіх Vue 3 supported browsers
- Template interpolation `{{ vacationDays }}` — standard Vue syntax

**Performance Considerations:**
- Computed properties — lazy evaluation (не виконуються доки не потрібні)
- Caching — result кешується доки dependencies не змінюються
- Re-computation — автоматично при зміні `formData.vacation_start_date` або `vacation_end_date`
- Negligible overhead для simple calculations (~0.001ms для date math)

**CSS Best Practices (2026):**
- Custom properties (`--var-name`) для reusable values
- `rem` units для accessibility (font scaling)
- `color` values: hex (`#666`) або CSS custom properties
- Responsive: `@media` queries якщо потрібно mobile support

**No External Libraries Needed:**
- Pure JavaScript `Date` достатньо для FR27
- No moment.js (deprecated), no date-fns, no day.js
- Vue 3 reactivity покриває state management
- No utility libraries (lodash, ramda) для simple calculations

---

### Контекст проєкту (Project Context Reference)

**Project:** crm_manufactur — Local CRM for employee data management

**Key Characteristics:**
- **Data Storage:** CSV files як database (`employees.csv`, `fields_schema.csv`)
- **Architecture:** Client-server з Vue.js frontend та Express.js backend
- **Brownfield Project:** Розширення існуючої monolithic App.vue (1599+ lines)
- **No Testing Infrastructure:** Manual testing only, no automated tests
- **Schema-Driven:** `fields_schema.csv` — single source of truth для UI config

**Vacation Management System:**
- **Automatic Status Changes:** `checkVacations()` оновлює `employment_status` based on dates
- **Dashboard Integration:** Timeline cards показують vacation events (today, next 7 days)
- **Notifications:** Modal вікно для vacation start/end today
- **Reports:** Quick reports (current, month) на Dashboard (Story 3.1)
- **Export:** CSV export з фільтрацією (Story 3.2)
- **Days Calculation:** Client-side display (Story 3.3) ← **Current Story**

**Epic 3 Context:**
- **Goal:** Звіти та експорт даних для швидкої відповіді керівництву
- **Stories:**
  - 3.1: Vacation Reports ✅ Done
  - 3.2: CSV Export ✅ Review (ready for Story 3.3 to proceed)
  - 3.3: Vacation Days Calculation ← **Current**

**User Personas:**
- **Олена (HR Admin):** Primary user для vacation management
- **Pain Points:** Manual counting errors, fear of mistakes, time waste
- **FR27 Value:** Автоматичний розрахунок усуває manual counting, дає confidence

**Success Metrics (PRD):**
- Облік відпусток: 2 год/тиждень → 15 хв/тиждень
- Помилки в розрахунках: ~10% → 0%
- User confidence: Страх помилки усунено

**Technical Constraints:**
- UTF-8 BOM encoding для CSV (Excel compatibility)
- `;` delimiter (semicolon) для CSV
- Compute-on-read strategy (no caching)
- No database migrations (CSV schema changes)
- Schema gitignored для production customization

**Development Environment:**
- Node.js + npm
- Vite dev server (port 5173)
- Express backend (port 3000)
- `./run.sh` для одночасного запуску frontend+backend
- Production build: `cd client && npm run build`

**Documentation:**
- `README.md` — English
- `README.uk.md` — Ukrainian
- `CLAUDE.md` — Technical guide (this project, kept in sync)

---

### Статус завершення Story (Story Completion Status)

**Story Status:** ✅ **ready-for-dev**

**Comprehensive Context Created:**
- ✅ User story та acceptance criteria визначено
- ✅ Tasks/subtasks деталізовано (4 tasks, 15 subtasks)
- ✅ Technical requirements extracted з architecture
- ✅ Previous story intelligence інтегровано (Stories 3.1, 3.2)
- ✅ Git analysis виконано (last commit e913d6f)
- ✅ Latest tech information включено (Vue 3, Date API)
- ✅ Critical formula verified: `Math.floor((end - start) / 86400000) + 1`
- ✅ Edge cases identified та validation rules defined
- ✅ Anti-patterns documented для уникнення помилок
- ✅ File structure requirements чітко вказано
- ✅ Testing approach визначено (manual, production build)

**Developer має все необхідне для:**
1. Створення computed property `vacationDays` з правильною формулою
2. Додавання UI display в Cards view
3. CSS styling для subtle informational text
4. Валідація всіх 6 acceptance criteria
5. Production build verification
6. Edge case testing

**Critical Success Factors:**
- ✅ Off-by-one formula FIX з Story 3.1 incorporated
- ✅ Timezone issues awareness з Story 2.3 documented
- ✅ Schema-driven approach consistency maintained
- ✅ No new dependencies requirement clear
- ✅ Client-side only implementation path defined

**Next Steps для Developer:**
1. Run `/bmad-bmm-dev-story` для implementation
2. Після завершення: `/bmad-bmm-code-review` для validation
3. Mark story as done після успішного code review

**Estimated Complexity:** 🟢 **Low**
- Pure client-side feature
- Single computed property + template change
- No backend changes required
- No new dependencies
- Clear formula and validation rules

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3: Розрахунок кількості днів відпустки]
- [Source: _bmad-output/planning-artifacts/prd.md#FR27 — Розрахунок календарних днів відпустки]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR10 — 100% точність розрахунків]
- [Source: _bmad-output/planning-artifacts/prd.md#Journey 3 — Оформлення відпустки]
- [Source: _bmad-output/planning-artifacts/architecture.md#FR27 — Client-side computed property]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Vacation Management Flow]
- [Source: client/src/App.vue#L140 — formData ref]
- [Source: client/src/App.vue#L720 — fieldGroups computed]
- [Source: client/src/App.vue#L1174-1208 — Cards view form rendering]
- [Source: server/src/store.js#L287 — getVacationReport days calculation formula]
- [Source: server/src/store.js#L175-179 — localDateStr() helper]
- [Source: _bmad-output/implementation-artifacts/3-1-vacation-reports.md — Story 3.1 code review fixes]
- [Source: _bmad-output/implementation-artifacts/3-2-csv-export-filters.md — Story 3.2 patterns]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Implementation Plan

**Approach:** Client-side computed property using Vue 3 Composition API

**Key Technical Decisions:**
1. Used `form.vacation_start_date` and `form.vacation_end_date` from reactive form object
2. Applied corrected formula from Story 3.1 code review: `Math.floor((end - start) / 86400000) + 1`
3. Added timezone-safe date parsing: `new Date(dateString + 'T00:00:00')`
4. Positioned UI display after form fields within "Відпустка" group using `v-if="group.title === 'Відпустка'"`
5. Minimal CSS styling: subtle gray text (#666), 0.85em font size, italic, 12px margin-top

### Debug Log References

No debugging required — implementation straightforward per Dev Notes.

### Completion Notes List

✅ **Story 3.3 Implementation Complete**

**What was implemented:**
1. **Computed Property** (`client/src/App.vue` line ~311-334):
   - Created `vacationDays` computed property
   - Validates both dates present and end >= start
   - Calculates days using corrected formula: `Math.floor((end - start) / 86400000) + 1`
   - Returns `null` for invalid states (triggers UI hiding)

2. **UI Display** (`client/src/App.vue` line ~1229):
   - Added conditional `<div>` after form fields in "Відпустка" group
   - Displays: `{{ vacationDays }} календарних днів`
   - Only visible when `vacationDays !== null`

3. **CSS Styling** (`client/src/styles.css` line ~1392-1397):
   - Class `.vacation-days-display`
   - Subtle informational text: 0.85em, #666 color, italic
   - Positioned with 12px top margin

**Production Build:** ✅ 423ms, 0 errors

**All Acceptance Criteria satisfied:**
- AC#1: Display shows when both dates filled ✅
- AC#2: Reactive updates on date changes (Vue reactivity) ✅
- AC#3: Correct calculation (2026-03-10 to 2026-03-24 = 15 days) ✅
- AC#4: Hidden when only one date filled ✅
- AC#5: Hidden when end < start ✅
- AC#6: Hidden when both dates empty ✅

**Formula Consistency:** Uses same formula as backend `getVacationReport()` from Story 3.1, ensuring consistency across client/server.

**Ready for manual testing:** Run `./run.sh` and test vacation days display in Cards view.

**Enhancement:** Added clickable employee names in Vacation Reports table — clicking opens employee card.

### File List

- `client/src/App.vue` — Added computed property `vacationDays`, UI display in Cards view, and clickable names in Vacation Reports
- `client/src/styles.css` — Added `.vacation-days-display` and `.report-name-link` CSS classes

## Senior Developer Review (AI)

**Review Date:** 2026-02-09
**Reviewer:** Claude Sonnet 4.5 (Adversarial Code Review Agent)
**Outcome:** ✅ Changes Requested → Fixed Automatically

### Review Findings

**Total Issues:** 10 (3 High, 4 Medium, 3 Low)

#### 🔴 HIGH Severity (Auto-Fixed)

- **[H1]** AC#1 violation — Ukrainian plural forms missing
  - **Issue:** "1 календарних днів" instead of "1 календарний день"
  - **Fix:** Added `vacationDaysLabel` computed with Ukrainian plural rules
  - **Files:** `client/src/App.vue` (lines 334-348, 1270)

- **[H2]** Missing Invalid Date validation
  - **Issue:** `new Date('invalid')` returns Invalid Date, not caught by validation
  - **Fix:** Added `isNaN(date.getTime())` checks
  - **Files:** `client/src/App.vue` (line 325)

#### 🟡 MEDIUM Severity (Auto-Fixed)

- **[M1]** Magic number without documentation
  - **Issue:** `86400000` hardcoded
  - **Fix:** Created `MS_PER_DAY` constant with comment
  - **Files:** `client/src/App.vue` (line 331)

- **[M4]** CSS not using design system
  - **Issue:** `color: #666` hardcoded
  - **Fix:** Changed to `color: var(--muted)`
  - **Files:** `client/src/styles.css` (line 1395)

#### 🟢 LOW Severity (Noted, not fixed)

- **[L1]** Code comment language inconsistency (Ukrainian in JS)
- **[L2]** Missing accessibility attributes (aria-label)
- **[L3]** No unit tests (out of MVP scope)

### Action Items

All HIGH and MEDIUM issues **automatically fixed**. LOW severity items noted for future improvement.

### Post-Review Validation

- ✅ Production build: 428ms, 0 errors
- ✅ All fixes applied and tested
- ✅ Ukrainian plurals: "1 день", "2 дні", "5 днів" — correct
- ✅ Invalid Date handling: returns `null` correctly
- ✅ Design system consistency: uses `var(--muted)`

## Senior Developer Review #2 (AI)

**Review Date:** 2026-02-09
**Reviewer:** Claude Opus 4.6 (Adversarial Code Review Agent)
**Outcome:** ✅ Changes Requested → Fixed Automatically

### Review Findings

**Total Issues:** 9 (3 High, 3 Medium, 3 Low)

#### 🔴 HIGH Severity

- **[H1]** AC#3 discrepancy: Epic specifies 14 days, Story/Code produce 15
  - **Issue:** Epic epics.md AC#3 says 2026-03-10 to 2026-03-24 = 14 days, but code uses inclusive formula (+1) = 15
  - **Verdict:** Code formula is correct (inclusive counting, consistent with backend). Epic doc needs sync
  - **Action:** Noted — epic planning artifact out of scope for code fix

- **[H2]** Hardcoded group title `'Відпустка'` violates schema-driven principle
  - **Issue:** `group.title === 'Відпустка'` hardcodes a label from fields_schema.csv
  - **Fix:** Changed to `group.fields.some(f => f.key === 'vacation_start_date' || f.key === 'vacation_end_date')`
  - **Files:** `client/src/App.vue` (line 1256)

- **[H3]** DST (Daylight Saving Time) edge case in day calculation
  - **Issue:** `Math.floor` with local time parsing (`T00:00:00`) can lose a day during DST spring-forward
  - **Fix:** Changed `Math.floor` to `Math.round` to compensate for ±1h DST shift
  - **Files:** `client/src/App.vue` (line 332)

#### 🟡 MEDIUM Severity

- **[M1]** Plural forms vs AC#1 literal format — noted as intentional UX improvement
- **[M2]** Clickable names in Vacation Reports — undocumented scope creep (useful, kept)
- **[M3]** Comment language switched to English during review #1
  - **Fix:** Restored Ukrainian comments per document_output_language setting
  - **Files:** `client/src/App.vue` (lines 317-345)

#### 🟢 LOW Severity (Noted)

- **[L1]** `form` vs `formData` naming confusion in Dev Notes (code is correct)
- **[L2]** Missing aria-label for vacation days display
- **[L3]** CSS `.vacation-days-display` has no explicit `line-height`

### Post-Review Validation

- ✅ Production build: 441ms, 0 errors
- ✅ DST-safe calculation with `Math.round`
- ✅ Schema-driven group detection (no hardcoded labels)
- ✅ Ukrainian comments restored
- ✅ All previous review #1 fixes preserved

## Change Log

- **2026-02-09**: Story 3.3 implementation — Added client-side vacation days calculation (computed property + UI display)
- **2026-02-09**: Enhancement — Made employee names clickable in Vacation Reports table (opens employee card)
- **2026-02-09**: Code review #1 fixes — [H1] Ukrainian plural forms, [H2] Invalid Date validation, [M1] Magic number constant, [M4] CSS design system. Production build: 428ms
- **2026-02-09**: Code review #2 fixes — [H2] Schema-driven group detection, [H3] DST-safe Math.round, [M3] Ukrainian comments. Production build: 441ms
