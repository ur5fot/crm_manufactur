# Загальні шаблони та плейхолдери кількості по select-полях

## Overview

Дві пов'язані фічі:

**1. Плейхолдери кількості (quantity placeholders)**

Для кожного `select`-поля з `fields_schema.csv` автоматично генеруються плейхолдери:
- `{f_<field_id>_quantity}` — загальна кількість **всіх активних** співробітників
- `{f_<field_id>_option1_quantity}` — кількість зі значенням першої опції
- `{f_<field_id>_option2_quantity}` — кількість зі значенням другої опції
- і т.д. (нумерація за порядком у `field_options`)

Приклад для поля `gender` (`field_id: f_gender`, опції `Чоловіча|Жіноча`):
```
{f_gender_quantity}         → 10  (всі активні співробітники)
{f_gender_option1_quantity} → 7   (зі значенням "Чоловіча")
{f_gender_option2_quantity} → 3   (зі значенням "Жіноча")
```

Сума option-кількостей може не дорівнювати total (якщо є порожні значення).

Quantity-плейхолдери доступні у **всіх** шаблонах — і звичайних, і загальних.

**2. Загальні шаблони (is_general)**

- Checkbox "Загальний шаблон" при створенні/редагуванні шаблону
- Загальні шаблони **не відображаються** у списку генерації в картці співробітника
- Нова вкладка "Загальні шаблони" у розділі "Документи" (поруч з "Шаблони" та "Історія документів")
- Генерація документу без прив'язки до конкретного співробітника

## Context (від дослідження)

**Файли, які будуть змінені:**
- `server/src/schema.js` — `TEMPLATE_COLUMNS` (додати `is_general`)
- `server/src/routes/templates.js` — CRUD шаблонів + генерація (POST .../:id/generate)
- `server/src/docx-generator.js` — `prepareData()` (додати quantity-плейхолдери)
- `server/src/routes/misc.js` — `/api/placeholder-preview` (нова група quantity)
- `client/src/composables/useTemplatesManagement.js` — templateForm + CRUD
- `client/src/composables/useDocumentGeneration.js` — фільтр templates
- `client/src/views/TemplatesView.vue` — checkbox у формі
- `client/src/views/DocumentsView.vue` — третя вкладка
- `client/src/api.js` — новий метод для генерації без employee_id

**Файли, які будуть створені:**
- `server/src/quantity-placeholders.js` — функція buildQuantityPlaceholders
- `client/src/views/GeneralTemplatesView.vue` — компонент вкладки загальних шаблонів

**Існуючі паттерни:**
- `TEMPLATE_COLUMNS` у `schema.js:336-345` — додаємо `is_general` після `active`
- `prepareData()` у `docx-generator.js:77-171` — додаємо quantity-дані до prepared
- Template CRUD у `routes/templates.js:44-145` — додаємо is_general до POST/PUT
- Template generate у `routes/templates.js:328-444` — робимо employee_id опціональним
- Tab-патерн у `DocumentsView.vue` — додаємо третю кнопку+компонент
- `useTemplatesManagement.js:9-16` — templateForm reactive object

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**
- **CRITICAL: update this plan file when scope changes during implementation**
- Maintain backward compatibility — existing templates/generation must працювати як раніше

## Testing Strategy

- **Unit tests**: `server/test/quantity-placeholders.test.js` для нової функції
- **Unit tests**: оновити `server/test/templates-api.test.js` для is_general
- **E2E tests**: `tests/e2e/general-templates.spec.js` для UI

## Progress Tracking

- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix

---

## Implementation Steps

### Task 1: Додати `is_general` до схеми шаблонів

**Ціль:** Бекенд зберігає та повертає поле `is_general` для шаблонів.

- [x] У `server/src/schema.js`: додати `"is_general"` до масиву `TEMPLATE_COLUMNS` (після `"active"`, рядок ~345)
- [x] У `server/src/routes/templates.js` POST `/api/templates` (~рядок 63-72): додати `is_general: payload.is_general === 'yes' ? 'yes' : 'no'` до `newTemplate`
- [x] У `server/src/routes/templates.js` PUT `/api/templates/:id` (~рядок 120-126): додати збереження `is_general` з payload (аналогічно description)
- [x] Написати тест у `server/test/templates-api.test.js`: POST з `is_general: 'yes'` → GET повертає шаблон з `is_general: 'yes'`
- [x] Написати тест: POST без `is_general` → шаблон має `is_general: 'no'` (default)
- [x] Запустити `cd server && npm test` — всі тести проходять

### Task 2: Функція buildQuantityPlaceholders

**Ціль:** Чиста функція, яка приймає schema + employees → повертає об'єкт з quantity-плейхолдерами.

- [x] Створити `server/src/quantity-placeholders.js` з експортом `buildQuantityPlaceholders(schema, employees)`:
  - Фільтрувати `schema` по `field_type === 'select'`
  - Для кожного select-поля:
    - `{f_<field_id>_quantity}` = `String(employees.length)` (всі активні)
    - Розбити `field_options` по `|`, для кожної опції (1-indexed):
      - `{f_<field_id>_option<N>_quantity}` = `String(count)` де count = employees з цим значенням field_name
  - Повернути plain object `{ "f_gender_quantity": "10", "f_gender_option1_quantity": "7", ... }`
- [x] Написати `server/test/quantity-placeholders.test.js`:
  - Тест: порожня schema → порожній об'єкт
  - Тест: 1 select-поле (`f_gender`, опції `Чоловіча|Жіноча`), 3 працівники (2 Чоловіча, 1 Жіноча) → `f_gender_quantity: "3"`, `f_gender_option1_quantity: "2"`, `f_gender_option2_quantity: "1"`
  - Тест: поле з `field_type: 'text'` ігнорується
  - Тест: порожнє `field_options` → тільки `f_X_quantity`, без option-плейхолдерів
  - Тест: працівник з порожнім значенням → не рахується ні в одну option
- [x] Запустити `node server/test/quantity-placeholders.test.js` — всі тести проходять

### Task 3: Інтегрувати quantity-плейхолдери у генерацію документів

**Ціль:** Quantity-плейхолдери потрапляють у кожен згенерований документ.

- [x] У `server/src/routes/templates.js`: імпортувати `buildQuantityPlaceholders` з `../quantity-placeholders.js`
- [x] У POST `/api/templates/:id/generate` (~рядок 355): `employees` вже завантажується через `loadEmployees()`, `schema` через `loadFieldsSchema()` — додати виклик `const quantities = buildQuantityPlaceholders(schema, employees)` після їх завантаження
- [x] Включити quantities у data перед generateDocx: `const data = { ...quantities, ...employee }` (employee-дані мають вищий пріоритет)
- [x] Написати тест: генерація з обома наборами → quantity-ключі присутні у data (або перевірити через mock/інтеграцію)
- [x] Запустити `cd server && npm test`

### Task 4: Генерація документу без employee_id (загальні шаблони)

**Ціль:** POST `/api/templates/:id/generate` працює без `employee_id` для загальних шаблонів.

- [x] У POST `/api/templates/:id/generate` (`routes/templates.js:329-444`): замінити обов'язкову перевірку `employee_id` (~рядок 331-336) на умовну:
  - Завантажити шаблон спочатку
  - Якщо `template.is_general === 'yes'` і `employee_id` відсутній: дозволити, `data = { ...quantities }` (тільки quantity + special placeholders)
  - Якщо `template.is_general !== 'yes'` і `employee_id` відсутній: повернути 400 (поточна поведінка)
- [x] Для загальних шаблонів: назва файлу `{TemplateName}_{timestamp}.docx` (без прізвища та employee_id)
- [x] Для загальних шаблонів: `employee_id` в `generated_documents.csv` = порожній рядок
- [x] Для загальних шаблонів: `data_snapshot` містить тільки quantity-ключі (без employee data)
- [x] Написати тест: POST generate загального шаблону без employee_id → 200, є document_id
- [x] Написати тест: POST generate звичайного шаблону без employee_id → 400
- [x] Написати тест: POST generate загального шаблону з employee_id → теж працює (дані employee + quantities)
- [x] Запустити `cd server && npm test`

### Task 5: Frontend — is_general у формі шаблону

**Ціль:** Checkbox "Загальний шаблон" у модалі створення/редагування.

- [x] У `client/src/composables/useTemplatesManagement.js`:
  - Додати `is_general: 'no'` до початкового стану `templateForm` (рядок ~9-16)
  - Додати `is_general` до `openCreateTemplateDialog()` reset (рядок ~32-39)
  - Додати `is_general` до `editTemplate()` (рядок ~43-53)
  - Додати `is_general` до `closeTemplateDialog()` reset (рядок ~81-88)
  - У `saveTemplate()` (рядок ~57-62): включити `is_general: templateForm.is_general` у payload
- [x] У `client/src/views/TemplatesView.vue` у діалозі створення (~після description, рядок 113):
  - Додати checkbox: `<label><input type="checkbox" v-model="templateForm.is_general" true-value="yes" false-value="no" /> Загальний шаблон (не прив'язаний до співробітника)</label>`
- [x] У таблиці шаблонів: відобразити значок/бейдж для загальних шаблонів (наприклад, поруч з назвою)
- [x] Написати E2E тест `tests/e2e/general-templates.spec.js`:
  - Створити шаблон з галочкою "Загальний" → API повертає `is_general: 'yes'`
  - Створити звичайний шаблон → `is_general: 'no'`
- [x] Запустити E2E тести

### Task 6: Frontend — приховати загальні шаблони в картці співробітника

**Ціль:** У випадаючому списку генерації документу в картці показуються тільки звичайні шаблони.

- [x] У `client/src/composables/useDocumentGeneration.js` (рядок ~9-10): після завантаження відфільтрувати:
  ```javascript
  templates.value = (data.templates || []).filter(t => t.is_general !== 'yes');
  ```
- [x] Додати до E2E тесту `general-templates.spec.js`:
  - Відкрити картку співробітника → список шаблонів для генерації НЕ містить загальний шаблон
- [x] Запустити E2E тести

### Task 7: Frontend — вкладка "Загальні шаблони" у DocumentsView

**Ціль:** Нова вкладка з кнопкою генерації без вибору співробітника.

- [x] Створити `client/src/views/GeneralTemplatesView.vue`:
  - Завантажити шаблони через `api.getTemplates()`, відфільтрувати `is_general === 'yes'`
  - Відобразити таблицю: ID, Назва, Тип, Файл DOCX, Дії
  - Кнопка "Створити документ" (disabled якщо немає docx_filename):
    - Викликає `api.generateDocument(template.template_id, null, {})` — null замість employee_id
    - Або новий метод `api.generateGeneralDocument(templateId)` який POST без employee_id
    - При успіху: `window.open(api.downloadDocument(result.document_id), '_blank')`
  - Пустий стан: "Загальних шаблонів немає. Позначте шаблон як загальний у вкладці «Шаблони»."
- [x] У `client/src/api.js`: додати метод:
  ```javascript
  generateGeneralDocument(templateId, customData = {}) {
    return request(`/templates/${templateId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_data: customData })
    });
  }
  ```
- [x] У `client/src/views/DocumentsView.vue`:
  - Імпортувати `GeneralTemplatesView`
  - Додати третю кнопку-вкладку `"Загальні шаблони"` з `activeTab === 'general'`
  - Додати `<GeneralTemplatesView v-else-if="activeTab === 'general'" />`
- [x] Додати до E2E тесту `general-templates.spec.js`:
  - Перейти в "Документи" → вкладка "Загальні шаблони" видна
  - Загальний шаблон відображається у списку
  - Клік "Створити документ" → ініціюється генерація
- [x] Запустити E2E тести

### Task 8: Оновити довідник плейхолдерів (Placeholder Reference)

**Ціль:** Нова група "Кількість по полях" у довіднику.

- [x] У `server/src/routes/misc.js` GET `/api/placeholder-preview/:employeeId?` (~рядок 164-351):
  - Після секції "Special placeholders" і перед "Case variant placeholders":
  - Імпортувати `buildQuantityPlaceholders` з `../quantity-placeholders.js`
  - Обчислити `const quantities = buildQuantityPlaceholders(schema, employees)`
  - Для кожного ключа в quantities: додати об'єкт у `placeholders[]` з `group: 'quantities'`
  - Label формувати зрозуміло: "{field_label} — кількість", "{field_label} — {option_name}"
- [x] У `client/src/views/PlaceholderReferenceView.vue`:
  - Додати відображення групи `'quantities'` з описовим заголовком "Кількість по полях (select)"
- [x] Написати тест: GET `/api/placeholder-preview` → є плейхолдери з `group: 'quantities'`
- [x] Запустити `cd server && npm test`

### Task 9: Верифікація

- [ ] Перевірити все з Overview:
  - Quantity-плейхолдери генеруються для всіх select-полів
  - Загальні шаблони мають галочку is_general
  - Загальні не відображаються в картці, а відображаються в окремій вкладці
  - Генерація загального шаблону працює без employee_id
- [ ] Запустити `cd server && npm test` — всі unit/integration тести проходять
- [ ] Запустити `npm run test:e2e` — всі E2E тести проходять
- [ ] Перевірити DocumentHistoryView — записи без employee_id відображаються коректно (без посилання на співробітника, або з позначкою "Загальний")

### Task 10: Оновлення документації

- [ ] Оновити `CLAUDE.md`:
  - Секція TEMPLATE_COLUMNS — додати `is_general`
  - Секція "Placeholder Syntax and Replacement" — додати опис quantity-плейхолдерів
  - Секція API: POST `/api/templates/:id/generate` — документувати опціональний employee_id
  - Секція "Project Structure" — додати `quantity-placeholders.js` та `GeneralTemplatesView.vue`
- [ ] Оновити `README.md` якщо потрібно (нова вкладка у документах)

*Note: ralphex automatically moves completed plans to `docs/plans/completed/`*

## Technical Details

### buildQuantityPlaceholders(schema, employees)

```javascript
// server/src/quantity-placeholders.js
export function buildQuantityPlaceholders(schema, employees) {
  const result = {};
  const selectFields = schema.filter(f => f.field_type === 'select');
  const totalCount = employees.length;

  for (const field of selectFields) {
    const fieldId = field.field_id;
    if (!fieldId) continue;

    // Total: all active employees
    result[`${fieldId}_quantity`] = String(totalCount);

    // Per-option counts
    const options = field.field_options ? field.field_options.split('|').filter(Boolean) : [];
    options.forEach((optionValue, index) => {
      const count = employees.filter(e => e[field.field_name] === optionValue).length;
      result[`${fieldId}_option${index + 1}_quantity`] = String(count);
    });
  }

  return result;
}
```

### Порядок мерджу даних при генерації

Для звичайних шаблонів:
```javascript
const data = { ...quantities, ...employee };
// employee-дані перекривають quantities якщо є конфлікт ключів (малоймовірно)
```

Для загальних шаблонів (без employee_id):
```javascript
const data = { ...quantities };
// prepareData() додасть current_date, current_datetime, case variants
```

### Оновлений TEMPLATE_COLUMNS

```javascript
export const TEMPLATE_COLUMNS = [
  "template_id", "template_name", "template_type",
  "docx_filename", "placeholder_fields", "description",
  "created_date", "active", "is_general"
];
```

### Зміни у POST /api/templates/:id/generate

```
Було:  employee_id обов'язковий завжди
Стало: employee_id обов'язковий для is_general !== 'yes'
       employee_id опціональний для is_general === 'yes'
```

### Структура GeneralTemplatesView

```
┌─────────────────────────────────────────────┐
│ [Шаблони] [Загальні шаблони] [Історія]      │
├─────────────────────────────────────────────┤
│ ID │ Назва      │ Тип  │ Файл │ Дії        │
│  3 │ Звіт       │ Інше │  ✓   │ [Створити] │
│  5 │ Статистика │ Інше │  ✓   │ [Створити] │
└─────────────────────────────────────────────┘
```

## Post-Completion

**Ручна перевірка:**
- Створити реальний DOCX з `{f_gender_option1_quantity}` → згенерувати → число замінено
- Перевірити що existing шаблони (без is_general) працюють без змін
- Перевірити DocumentHistoryView з документами без employee_id
