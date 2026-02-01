# Патерни управління станом - Client

**Дата сканування:** 2026-02-01
**Частина:** client (Frontend)
**Тип сканування:** Quick (pattern-based)

## Огляд

Використовується **Vue 3 Composition API** для управління реактивним станом без зовнішніх бібліотек (без Vuex/Pinia).

---

## State Management Strategy

**Підхід:** Local Component State
**API:** Vue 3 Composition API (`ref`, `reactive`, `computed`)
**Scope:** Single component (App.vue)
**Store:** Відсутній (немає глобального store)

---

## Виявлені патерни стану

### Reactive References (ref)

**Джерело:** `client/src/App.vue:46-68`

**Структура стану:**

```javascript
// Schema and configuration
const fieldGroups = ref([]);
const allFieldsSchema = ref([]);

// Employee data
const employees = ref([]);
const selectedId = ref("");
const searchTerm = ref("");

// UI state
const loading = ref(false);
const saving = ref(false);
```

**Категорії стану:**

1. **Data State** - Дані з API
   - `employees` - масив всіх співробітників
   - `fieldGroups` - групи полів для UI
   - `allFieldsSchema` - повна схема полів

2. **Selection State** - Вибір користувача
   - `selectedId` - ID вибраного співробітника

3. **Filter State** - Фільтрація та пошук
   - `searchTerm` - текст пошуку

4. **Loading State** - Стан завантаження
   - `loading` - глобальний loader
   - `saving` - стан збереження

---

## Computed Properties

**Виявлено:** Computed для derived state

```javascript
const documentFields = computed(() => {
  // Filter fields with type 'file'
});
```

**Використання:**
- Фільтрація полів за типом
- Derived data від schema
- Reactive оновлення при зміні schema

---

## State Flow

### Data Flow Pattern

```
User Action
    ↓
Event Handler (in App.vue)
    ↓
API Call (api.js)
    ↓
Server Response
    ↓
Update ref/reactive state
    ↓
Vue reactivity triggers re-render
    ↓
UI updates automatically
```

### Приклад циклу стану:

1. **Load:** `onMounted` → `loadEmployees()` → `employees.value = data`
2. **Create:** Click "Save" → `createEmployee()` → `employees.value.push(new)`
3. **Update:** Edit field → `updateEmployee()` → знайти і замінити в `employees.value`
4. **Delete:** Click "Delete" → `deleteEmployee()` → `employees.value.filter(id !== deleted)`

---

## State Persistence

**Persistence Strategy:** None (немає localStorage/sessionStorage)

**Data Source:** Server API
- Кожне оновлення сторінки → fresh fetch з `/api/employees`
- Немає client-side caching
- Немає optimistic updates (чекаємо на server response)

---

## State Initialization

**Lifecycle Hook:** `onMounted`

```javascript
onMounted(async () => {
  await loadFieldsSchema();  // Завантажити schema
  await loadEmployees();      // Завантажити дані
  checkVacations();           // Перевірити відпустки
});
```

**Init Sequence:**
1. Завантажити fields schema з `/api/fields-schema`
2. Завантажити employees з `/api/employees`
3. Перевірити vacation statuses
4. Показати notifications якщо є

---

## State Mutations

**Pattern:** Direct mutation через `.value`

**Приклади:**

```javascript
// Load data
employees.value = await api.getEmployees();

// Add employee
employees.value.push(newEmployee);

// Update employee
const index = employees.value.findIndex(e => e.id === id);
employees.value[index] = updatedEmployee;

// Delete employee
employees.value = employees.value.filter(e => e.id !== deletedId);
```

**Reactivity:** Vue 3 автоматично відстежує зміни

---

## Global State

**Scope:** Component-level (App.vue)
**Sharing:** Немає (немає prop drilling, немає provide/inject)
**Communication:** Немає (один компонент)

**Чому працює:**
- Весь UI в одному компоненті
- Немає потреби в глобальному store
- Прямий доступ до стану в межах компонента

---

## Asynchronous State Management

**Pattern:** async/await з loading states

```javascript
const loading = ref(false);

async function loadEmployees() {
  loading.value = true;
  try {
    employees.value = await api.getEmployees();
  } catch (error) {
    // Error handling
  } finally {
    loading.value = false;
  }
}
```

**Error Handling:** Try-catch блоки

---

## Form State Management

**Pattern:** v-model two-way binding

**Структура:**
- Окремий об'єкт `form` для редагування
- Ініціалізується з вибраного employee або empty
- v-model прив'язує inputs до `form` властивостей

**Validation:** Client-side (HTML5 + custom)
- Server-side validation через Zod

---

## State Dependencies

**Залежності стану:**

1. `fieldGroups` ← залежить від schema API
2. `employees` ← залежить від employees API
3. `documentFields` ← computed від allFieldsSchema
4. UI view mode ← залежить від selectedId (empty = list, filled = detail)

---

## Performance Considerations

**Optimization:**
- Computed properties для derived state (мемоїзація)
- Ref unwrapping автоматичний
- Reactivity overhead мінімальний для ~100 employees

**Issues:**
- Немає virtualization для великих списків
- Повне перезавантаження на кожен mount
- Немає pagination

---

## Patterns Summary

**Використані патерни:**
- ✅ Composition API (ref, reactive, computed)
- ✅ Local component state
- ✅ Async/await з loading states
- ✅ Two-way binding (v-model)
- ✅ Lifecycle hooks (onMounted)

**Відсутні патерни:**
- ❌ Глобальний store (Vuex/Pinia)
- ❌ State persistence (localStorage)
- ❌ Optimistic updates
- ❌ State machines
- ❌ Middleware/plugins

---

## Рекомендації для масштабування

**Якщо проект росте:**

1. **Додати Pinia** - для глобального стану
2. **Split components** - розділити App.vue на маленькі компоненти
3. **Add caching** - localStorage для offline support
4. **Implement pagination** - для великих списків
5. **Add optimistic updates** - для кращого UX

**Поточний підхід працює для:**
- Малі проекти (< 1000 records)
- Один розробник
- Simple CRUD operations
