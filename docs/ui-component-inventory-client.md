# Інвентар UI компонентів - Client

**Дата сканування:** 2026-02-01
**Частина:** client (Frontend)
**Тип сканування:** Quick (pattern-based)

## Огляд

**Архітектура:** Monolithic Single Component
**Файл:** `client/src/App.vue` (46KB)
**Підхід:** Все в одному компоненті (немає розділення на підкомпоненти)

---

## Структура компонента

### Єдиний компонент: App.vue

**Розмір:** 46,556 bytes
**Рядків:** ~1300+ (приблизно)
**Відповідальності:** Все (UI + логіка + стан)

---

## UI Sections (Логічні блоки)

Хоча це один компонент, він містить кілька логічних UI секцій:

### 1. Header / Navigation
**Призначення:** Перемикання режимів перегляду та глобальні дії

**Елементи:**
- Логотип/Назва додатку
- Кнопки перемикання view modes:
  - Cards (картки співробітників)
  - Table (зведена таблиця)
  - Logs (аудит лог)
- Кнопка "Додати співробітника"
- Кнопка "Імпорт"

---

### 2. Employee List View (Cards Mode)
**Призначення:** Відображення списку співробітників карткам и

**Компоненти:**
- Search bar (пошук по імені)
- Employee cards grid
  - Card per employee
  - Click → відкриває деталі
- Empty state (якщо немає співробітників)

---

### 3. Employee Detail View (Card Detail)
**Призначення:** Перегляд/редагування деталей співробітника

**Секції форми (генеруються з fieldGroups):**
- Особисті дані
- Локація
- Посада та зарплата
- Контактні дані
- Документи (з завантаженням файлів)
- Відпустки
- Примітки

**Form Elements:**
- Text inputs
- Select dropdowns (з динамічними options)
- Textarea
- Date pickers
- Number inputs
- Email/Tel inputs
- File upload buttons

**Actions:**
- Кнопка "Зберегти"
- Кнопка "Видалити"
- Кнопка "Скасувати"
- Кнопка "Відкрити папку" (для файлів)

---

### 4. Summary Table View
**Призначення:** Зведена таблиця з можливістю inline редагування

**Особливості:**
- Колонки генеруються з fields_schema (show_in_table=yes)
- Inline editing (double-click на комірці)
- Multi-select фільтри (checkboxes для select полів)
- Empty value filter ("(Пусто)" checkbox)
- ID column (center-aligned, clickable → detail view)

**Фільтри:**
- Checkbox-based для кожного select поля
- Спеціальний checkbox "(Пусто)" для пустих значень
- Reactive filtering (миттєве оновлення)

**Table Features:**
- Sortable columns (можливо)
- Row highlighting (можливо)
- Responsive layout

---

### 5. Logs View (Audit Trail)
**Призначення:** Відображення audit log

**Елементи:**
- Table з логами
- Колонки:
  - Timestamp
  - Action (CREATE/UPDATE/DELETE)
  - Employee Name
  - Field Changed
  - Old Value → New Value
  - Details
- Sorted DESC (newest first)

---

### 6. Document Section
**Призначення:** Управління PDF документами співробітника

**Компоненти:**
- Dynamic document fields (field_type=file з schema)
- Для кожного document field:
  - File upload input
  - "Upload" button
  - "Open" link (якщо файл існує)
  - "Delete" button (якщо файл існує)
- "Open Folder" button (відкриває папку в ОС)

---

### 7. Import Modal/Dialog
**Призначення:** Імпорт співробітників з CSV

**Елементи:**
- File input (CSV)
- Upload button
- Results display (успішно/помилки)
- Close button

---

### 8. Vacation Notification Modal
**Призначення:** Сповіщення про відпустки

**Розділи:**
- ✈️ "Співробітники, що йдуть у відпустку сьогодні" (синій, показує end date)
- 🏢 "Співробітники, що повертаються з відпустки сьогодні" (зелений)

**Елементи:**
- Modal overlay
- List of employees
- Dates
- Close button

---

## Form Components (Динамічні)

### Генеровані з fields_schema

**Input Types:**
1. **text** - Стандартний text input
2. **select** - Dropdown з options з field_options
3. **textarea** - Multi-line text
4. **number** - Number input
5. **email** - Email input
6. **tel** - Phone input
7. **date** - Date picker (YYYY-MM-DD)
8. **file** - File upload (PDF)

**Групування:**
- Поля групуються по `field_group` з schema
- Кожна група = окрема секція в формі
- Групи відображаються у визначеному порядку

---

## Reusable Patterns (в межах компонента)

Хоча немає окремих компонентів, є переповторювані патерни:

### 1. Form Group Pattern
```vue
<div class="form-group">
  <label>{{ field.label }}</label>
  <input v-model="form[field.name]" :type="field.type">
</div>
```

### 2. Employee Card Pattern
```vue
<div class="employee-card" @click="selectEmployee(emp.id)">
  <h3>{{ emp.name }}</h3>
  <p>{{ emp.position }}</p>
</div>
```

### 3. Filter Checkbox Pattern
```vue
<label>
  <input type="checkbox" v-model="filters[option]">
  {{ option }}
</label>
```

---

## UI Framework / Design System

**CSS Framework:** Немає (custom CSS)
**Component Library:** Немає (vanilla HTML + Vue directives)
**Icons:** Emoji (✈️, 🏢) та можливо текст
**Styling:** Global CSS (`styles.css` - 18KB)

**Design Tokens:** Відсутні (hardcoded кольори/розміри)

---

## Responsive Design

**Підхід:** CSS-based (можливо media queries в styles.css)
**Breakpoints:** Unknown (треба читати styles.css)
**Mobile-friendly:** Можливо (треба перевірити)

---

## Accessibility

**Features:**
- Labels для inputs (з field_label)
- Title attribute на ID column
- Semantic HTML (можливо)

**Issues (можливі):**
- Немає ARIA labels
- Немає keyboard navigation
- Немає screen reader support

---

## Component Count

**Фізичні компоненти:**
- App.vue: 1 компонент
- main.js: Entry point
- api.js: API утиліти (не компонент)

**Логічні секції в App.vue:**
- Header: 1
- Employee List: 1
- Employee Detail: 1
- Summary Table: 1
- Logs View: 1
- Document Section: 1
- Import Modal: 1
- Vacation Modal: 1

**Всього логічних блоків:** 8

---

## State-UI Binding

**Pattern:** v-model і reactive refs

**Приклади:**
```vue
<input v-model="searchTerm">         <!-- Search -->
<select v-model="form.status">        <!-- Form field -->
<input type="checkbox" v-model="filters[key]">  <!-- Filters -->
```

**Reactivity:** Автоматичне оновлення UI при зміні стану

---

## Conditional Rendering

**v-if / v-show для:**
- View modes (cards vs table vs logs)
- Loading states (spinner)
- Empty states (немає даних)
- Modal visibility
- Document buttons (show/hide based on file existence)

---

## Lists and Iteration

**v-for використовується для:**
- Employee cards в list view
- Table rows
- Form groups
- Form fields
- Filter checkboxes
- Log entries
- Document fields

---

## Component Reusability

**Рівень:** Низький
**Причина:** Monolithic architecture
**Дублювання:** Можливе (повторювані патерни в template)

**Потенційні extracted компоненти:**
1. EmployeeCard
2. EmployeeForm
3. FormField (dynamic)
4. FilterPanel
5. DocumentUpload
6. Modal
7. NotificationBanner

---

## Styling Approach

**Method:** Global CSS + Scoped styles
**File:** `client/src/styles.css` (18KB)
**Classes:** Utility + component-specific
**CSS Variables:** Можливо (треба читати styles.css)

---

## Рекомендації для рефакторингу

**Якщо потрібно масштабувати:**

1. **Extract компоненти:**
   - EmployeeCard.vue
   - EmployeeForm.vue
   - SummaryTable.vue
   - LogsView.vue

2. **Component library:**
   - Використати готову бібліотеку (Vuetify, Element Plus)
   - Або створити власну design system

3. **Routing:**
   - Додати Vue Router
   - Окремі routes для views

4. **Accessibility:**
   - Додати ARIA attributes
   - Keyboard navigation
   - Focus management

5. **Testing:**
   - Unit tests для компонентів
   - E2E tests для flows

---

## Висновок

**Поточний стан:**
- ✅ Працює для невеликого проекту
- ✅ Швидкий розвиток
- ✅ Динамічна генерація з schema
- ❌ Важко підтримувати при зростанні
- ❌ Важко тестувати
- ❌ Дублювання коду
