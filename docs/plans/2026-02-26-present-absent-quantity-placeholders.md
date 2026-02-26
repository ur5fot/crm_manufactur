# Плейхолдери present/absent, fit_status серед наявних, current_date_iso

## Overview

Три доповнення до системи плейхолдерів:

**1. present_quantity / absent_quantity**

- `{present_quantity}` — кількість **наявних** (статус = "Працює", перша опція STATUS-поля)
- `{absent_quantity}` — кількість **відсутніх** (всі крім "Працює" та "Звільнений")

Приклад (10 активних: 7 Працює, 1 Звільнений, 1 Відпустка, 1 Лікарняний):
```
{present_quantity} → 7  (Працює)
{absent_quantity}  → 2  (Відпустка + Лікарняний)
```

Звільнені не рахуються ні в наявні, ні у відсутні.

**2. fit_status серед тих хто Працює**

Кількість по полю "Придатність" (`f_fit_status`, опції: `Придатний|Не придатний|Обмежено придатний`), але рахуючи **тільки працівників зі статусом "Працює"**:

```
{f_fit_status_present_quantity}         → 7  (всі хто Працює)
{f_fit_status_present_option1_quantity} → 5  (Придатний серед тих хто Працює)
{f_fit_status_present_option2_quantity} → 1  (Не придатний серед тих хто Працює)
{f_fit_status_present_option3_quantity} → 1  (Обмежено придатний серед тих хто Працює)
```

**3. current_date_iso — дата у форматі YYYY-MM-DD**

Наразі існує тільки `{current_date}` → `26.02.2026` (DD.MM.YYYY). Додати:

```
{current_date_iso} → 2026-02-27
```

## Context

- `server/src/quantity-placeholders.js` — `buildQuantityPlaceholders(schema, employees)` генерує quantity-плейхолдери
- `server/src/field-utils.js` — `ROLES.STATUS` для визначення поля статусу
- `server/src/docx-generator.js:122-134` — `prepareData()` додає `current_date` та `current_datetime`
- `server/src/routes/misc.js:319-353` — `/api/placeholder-preview` відображає quantity-групу
- `server/test/quantity-placeholders.test.js` — існуючі тести
- `data/fields_schema.template.csv:18` — `f_fit_status;16;fit_status;Придатність;select;Придатний|Не придатний|Обмежено придатний;...`

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- **CRITICAL: all tests must pass before starting next task**
- Backward compatible — existing placeholders не змінюються

## Testing Strategy

- **Unit tests**: оновити `server/test/quantity-placeholders.test.js` та `server/test/docx-generator.test.js`

## Progress Tracking

- Mark completed items with `[x]` immediately when done

---

## Implementation Steps

### Task 1: Додати present_quantity / absent_quantity до buildQuantityPlaceholders

- [x] У `server/src/quantity-placeholders.js` після циклу по select-полях:
  - Знайти поле з `role === 'STATUS'` та `field_type === 'select'` у schema
  - Якщо знайдено: `workingStatus` = перша опція, `dismissedStatus` = друга опція
  - `present_quantity` = кількість де `status === workingStatus`
  - `absent_quantity` = кількість де `status` не порожній, не workingStatus, не dismissedStatus
  - Якщо STATUS-поле не знайдено — не додавати ці ключі
- [x] Написати тести у `server/test/quantity-placeholders.test.js`:
  - STATUS-поле з 3 опціями, 5 працівників (3 Працює, 1 Звільнений, 1 Відпустка) → `present: "3"`, `absent: "1"`
  - Порожній статус → не рахується в absent
  - Schema без STATUS-ролі → ключі відсутні
- [x] Запустити `node server/test/quantity-placeholders.test.js` — все проходить
- [x] Запустити `cd server && npm test` — все проходить

### Task 2: Додати fit_status_present плейхолдери (кількість серед наявних)

- [x] У `server/src/quantity-placeholders.js`:
  - Якщо STATUS-поле знайдено і fit_status-поле знайдено (шукати `field_name === 'fit_status'` або за field_id `f_fit_status`):
  - Відфільтрувати `presentEmployees = employees.filter(e => e[statusFieldName] === workingStatus)`
  - `{f_fit_status_present_quantity}` = `String(presentEmployees.length)`
  - Для кожної опції fit_status: `{f_fit_status_present_option<N>_quantity}` = count серед presentEmployees
- [x] Написати тести:
  - 4 працівники (3 Працює, 1 Відпустка); серед Працює: 2 Придатний, 1 Не придатний → `f_fit_status_present_quantity: "3"`, `f_fit_status_present_option1_quantity: "2"`, `f_fit_status_present_option2_quantity: "1"`, `f_fit_status_present_option3_quantity: "0"`
  - Без STATUS-поля → fit_status_present ключі відсутні
- [x] Запустити `node server/test/quantity-placeholders.test.js` — все проходить

### Task 3: Додати current_date_iso плейхолдер

- [x] У `server/src/docx-generator.js` у `prepareData()` (~рядок 129, після `prepared.current_date`):
  - Додати: `prepared.current_date_iso = \`${year}-${month}-${day}\`;`
- [x] У `server/src/docx-generator.js` у `extractPlaceholders()` (~рядок 247):
  - Додати `'current_date_iso'` до `specialNames` Set
- [x] У `server/src/routes/misc.js` у `/api/placeholder-preview` (~рядок 305-316, секція special placeholders):
  - Додати новий placeholder об'єкт: `{ placeholder: '{current_date_iso}', label: 'Поточна дата (ISO)', value: \`${year}-${month}-${day}\`, group: 'special' }`
- [x] Написати/оновити тест у `server/test/docx-generator.test.js`:
  - Перевірити що prepareData повертає `current_date_iso` у форматі YYYY-MM-DD
- [x] Запустити `cd server && npm test` — все проходить

### Task 4: Відобразити нові quantity-плейхолдери у довіднику

- [x] У `server/src/routes/misc.js` (~рядок 322-353, секція quantity placeholders):
  - Перед основним циклом по selectField-ключах, додати обробку спеціальних ключів:
  - `key === 'present_quantity'` → label = `"Наявні (зі статусом «Працює»)"`
  - `key === 'absent_quantity'` → label = `"Відсутні (крім «Працює» та «Звільнений»)"`
  - Ключі `f_fit_status_present_*` → розпізнавати та формувати label: `"Придатність серед наявних — кількість"`, `"Придатність серед наявних — «Придатний»"` і т.д.
- [x] Запустити `cd server && npm test`

### Task 5: Верифікація та документація

- [x] Запустити повний набір тестів: `cd server && npm test`
- [x] Оновити `CLAUDE.md`:
  - Секція "Placeholder Syntax and Replacement" — додати `{present_quantity}`, `{absent_quantity}`, `{f_fit_status_present_*}`, `{current_date_iso}`

*Note: ralphex automatically moves completed plans to `docs/plans/completed/`*

## Technical Details

### Зміни у buildQuantityPlaceholders

```javascript
// Після циклу по select-полях:

// 1. present / absent
const statusField = schema.find(f => f.role === 'STATUS' && f.field_type === 'select');
if (statusField && statusField.field_id) {
  const options = statusField.field_options ? statusField.field_options.split('|').filter(Boolean) : [];
  const workingStatus = options[0] || '';    // "Працює"
  const dismissedStatus = options[1] || '';  // "Звільнений"
  const statusFieldName = statusField.field_name;

  if (workingStatus) {
    const presentEmployees = employees.filter(e => e[statusFieldName] === workingStatus);
    result['present_quantity'] = String(presentEmployees.length);
    result['absent_quantity'] = String(employees.filter(e => {
      const v = e[statusFieldName];
      return v && v !== workingStatus && v !== dismissedStatus;
    }).length);

    // 2. fit_status among present employees
    const fitField = schema.find(f => f.field_id === 'f_fit_status' && f.field_type === 'select');
    if (fitField) {
      result[`${fitField.field_id}_present_quantity`] = String(presentEmployees.length);
      const fitOptions = fitField.field_options ? fitField.field_options.split('|').filter(Boolean) : [];
      fitOptions.forEach((optVal, idx) => {
        const count = presentEmployees.filter(e => e[fitField.field_name] === optVal).length;
        result[`${fitField.field_id}_present_option${idx + 1}_quantity`] = String(count);
      });
    }
  }
}
```

### Зміни у prepareData (docx-generator.js)

```javascript
// Після рядка prepared.current_date = `${day}.${month}.${year}`;
prepared.current_date_iso = `${year}-${month}-${day}`;  // YYYY-MM-DD format
```

### Приклад повного виводу

10 active: 7 Працює (5 Придатний, 1 Не придатний, 1 Обм. придатний), 1 Звільнений, 1 Відпустка, 1 Лікарняний:
```
present_quantity                      → "7"
absent_quantity                       → "2"
f_fit_status_present_quantity         → "7"
f_fit_status_present_option1_quantity → "5"  (Придатний)
f_fit_status_present_option2_quantity → "1"  (Не придатний)
f_fit_status_present_option3_quantity → "1"  (Обмежено придатний)
current_date_iso                      → "2026-02-27"
```

## Post-Completion

**Ручна перевірка:**
- DOCX з `{present_quantity}`, `{absent_quantity}`, `{f_fit_status_present_option1_quantity}`, `{current_date_iso}` → згенерувати → значення замінені
- Довідник плейхолдерів → нові плейхолдери відображаються
