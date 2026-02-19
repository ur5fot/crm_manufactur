# Dashboard: Замінити "Найближчі 7 днів" на 30-денне вікно

## Overview

Змінити розділ дашборду "Найближчі 7 днів" з рухомого 7-денного вікна на рухоме 30-денне вікно.
Охоплює зміну статусів, закінчення терміну документів та дні народження.

Ціль: щоб менеджери бачили більш широкий горизонт подій заздалегідь.

## Context (from discovery)

- Files/components involved:
  - `server/src/store.js` — 3 функції з логікою `in7days`:
    - `getDashboardEvents()` (lines ~350–416) — зміни статусів
    - `getDocumentExpiryEvents()` (lines ~418–469) — закінчення документів
    - `getBirthdayEvents()` (lines ~759–846) — дні народження
  - `client/src/views/DashboardView.vue` (line ~432) — текст "Найближчі 7 днів"
  - `client/src/composables/useDashboardTimeline.js` — комбінує результати; поле `next7Days` від birthday API
- Related patterns found: локальна функція `localDateStr()`, рядкове порівняння дат YYYY-MM-DD
- Dependencies: backend → frontend (API shape не змінюється, лише вікно)

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Мінімальні зміни — лише вікно та лейбл, без рефакторингу
- **CRITICAL: всі тести повинні пройти перед переходом до наступного завдання**

## Testing Strategy

- **Unit tests**: перевірити логіку у server/test/ (birthday-events, dashboard events, document expiry)
- **E2E tests**: відсутні специфічні тести для цього компонента — не потрібно додавати нові

## Progress Tracking

- Позначати виконані пункти `[x]`
- Додавати нові завдання з префіксом ➕
- Блокери позначати ⚠️

## Implementation Steps

### Task 1: Оновити бекенд — збільшити вікно з 7 до 30 днів

- [x] в `getDashboardEvents()` (store.js): замінити `in7days = today + 7` на `in30days = today + 30`; оновити всі посилання на цю змінну (`in7daysStr` → `in30daysStr`)
- [x] в `getDocumentExpiryEvents()` (store.js): те саме — замінити 7 на 30
- [x] в `getBirthdayEvents()` (store.js): замінити `in7days = today + 7` на `in30days = today + 30`; перейменувати `next7DaysEvents` → `next30DaysEvents`; повертати `next30Days` замість `next7Days`
- [x] написати unit test: `getDashboardEvents` повертає події через 25 днів (перевіряє нове вікно)
- [x] написати unit test: `getDocumentExpiryEvents` повертає документ що закінчується через 25 днів
- [x] написати unit test: `getBirthdayEvents` повертає день народження через 25 днів у `next30Days`
- [x] запустити тести: `cd server && npm test` — повинні пройти

### Task 2: Оновити фронтенд — лейбл і маппінг API

- [ ] в `useDashboardTimeline.js`: змінити `birthdayData.next7Days` на `birthdayData.next30Days`
- [ ] в `DashboardView.vue`: замінити текст `"Найближчі 7 днів"` на `"Найближчі 30 днів"`
- [ ] запустити `cd server && npm test` — повинні пройти (немає окремих фронт-тестів)

### Task 3: Фінальна верифікація

- [ ] перевірити що `getDashboardEvents`, `getDocumentExpiryEvents`, `getBirthdayEvents` більше не використовують магічне число 7 для вікна (окрім де це явно 7 — як назви змінних)
- [ ] запустити `cd server && npm test` — всі unit тести проходять
- [ ] вручну перевірити дашборд у браузері: розділ відображається як "Найближчі 30 днів"

## Technical Details

**Шаблон зміни у store.js (для кожної з 3 функцій):**
```js
// БУЛО:
const in7days = new Date(now);
in7days.setDate(now.getDate() + 7);
const in7daysStr = localDateStr(in7days);
// ... фільтр: date <= in7daysStr

// СТАЛО:
const in30days = new Date(now);
in30days.setDate(now.getDate() + 30);
const in30daysStr = localDateStr(in30days);
// ... фільтр: date <= in30daysStr
```

**getBirthdayEvents — зміна форми відповіді:**
```js
// БУЛО: return { today: todayEvents, next7Days: next7DaysEvents };
// СТАЛО: return { today: todayEvents, next30Days: next30DaysEvents };
```

**useDashboardTimeline.js:**
```js
// БУЛО: const weekBirthdayEvents = (birthdayData.next7Days || [])
// СТАЛО: const weekBirthdayEvents = (birthdayData.next30Days || [])
```

## Post-Completion

**Ручна перевірка:**
- Відкрити дашборд, перевірити що розділ називається "Найближчі 30 днів"
- Якщо є тестові співробітники з подіями через 8-30 днів — перевірити що вони з'являються
