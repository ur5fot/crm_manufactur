# Показувати кількість у кнопках звітів завжди

## Overview
Обидві кнопки дашборду («Хто відсутній зараз» і «Зміни статусів цього місяця») мають завжди показувати свою кількість — незалежно від того, яка активна. Наразі кількість відображається лише у активній кнопці.

## Context
- Composable: `client/src/composables/useDashboardReport.js`
- View: `client/src/views/DashboardView.vue` (~рядки 454-460)
- Один shared `reportData = ref([])` для обох звітів — кількість рахується тільки для активного
- API: `api.getStatusReport(type)` → повертає масив співробітників

## Development Approach
- **Testing approach**: Regular
- Мінімальні зміни — лише composable + 2 рядки в шаблоні

## Implementation Steps

### Task 1: Розділити дані двох звітів і завантажувати при маунті

- [x] В `useDashboardReport.js` додати два окремих ref: `currentData = ref([])` і `monthData = ref([])`
- [x] Зробити `reportData` computed-ом: `computed(() => activeReport.value === 'current' ? currentData.value : activeReport.value === 'month' ? monthData.value : [])`
- [x] Оновити `toggleReport(type)`: замість `reportData.value = data` → писати у `currentData.value` або `monthData.value` залежно від type
- [x] Додати функцію `loadCounts()` яка завантажує обидва типи паралельно:
  ```js
  async function loadCounts() {
    try {
      const [cur, mon] = await Promise.all([
        api.getStatusReport('current'),
        api.getStatusReport('month'),
      ]);
      currentData.value = cur;
      monthData.value = mon;
    } catch (e) { /* silently ignore */ }
  }
  ```
- [x] Оновити `absentEmployeesCount`: прибрати умову `if (activeReport === 'current')` → завжди `return currentData.value.length`
- [x] Оновити `statusChangesThisMonthCount`: прибрати умову → завжди `return monthData.value.length`
- [x] Додати `loadCounts` до `return` composable

### Task 2: Оновити шаблон і ініціалізацію в DashboardView

- [ ] В `DashboardView.vue` деструктурувати `loadCounts` з `useDashboardReport()`
- [ ] В `onMounted` (або поруч з іншими init-викликами) додати `loadCounts()`
- [ ] Кнопка «Хто відсутній зараз»: змінити `v-if="activeReport === 'current'"` → `v-if="absentEmployeesCount > 0"`
- [ ] Кнопка «Зміни статусів»: змінити `v-if="activeReport === 'month'"` → `v-if="statusChangesThisMonthCount > 0"`

### Task 3: Verify acceptance criteria

- [ ] Обидві кнопки показують кількість одразу при завантаженні дашборду (не треба клікати)
- [ ] Якщо кількість = 0, дужки не показуються (логіка `> 0`)
- [ ] При кліку на кнопку таблиця все ще відкривається і закривається
- [ ] Дані таблиці відповідають кількості на кнопці

## Technical Details
- `reportData` стає computed (не ref) — шаблон таблиці не треба чіпати
- `toggleReport` тепер не завантажує дані (вже є), просто перемикає `activeReport`
  - Але якщо дані ще не прийшли (race condition), попереднє завантаження через `toggleReport` залишається як fallback
- Два API-запити паралельно в `loadCounts()` — мінімальний overhead

## Post-Completion
- Ручна перевірка в браузері: кнопки одразу показують числа після завантаження дашборду
