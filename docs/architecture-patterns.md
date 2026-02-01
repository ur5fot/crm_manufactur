# Архітектурні патерни

**Дата аналізу:** 2026-02-01

## Загальна архітектура проекту

**Тип:** Multi-part Client-Server Architecture
**Стиль:** Traditional Web Application (SPA + REST API)

---

## CLIENT: Frontend Architecture

### Архітектурний патерн
**Monolithic Component-based SPA**

### Характеристики

**Патерн організації:**
- Single Page Application (SPA)
- Один великий монолітний компонент (`App.vue`)
- Вся логіка в одному файлі
- Реактивний стан Vue 3 (Composition API або Options API)

**Структура компонента:**
```
App.vue (46KB)
├── Template (HTML структура)
├── Script (логіка, стан, методи)
└── Styles (CSS)
```

**State Management:**
- Локальний стан Vue (reactive data)
- Без Vuex/Pinia
- Direct component state

**Routing:**
- Без Vue Router
- View modes в межах одного компонента:
  - Cards view (картки співробітників)
  - Table view (зведена таблиця)
  - Logs view (аудит лог)

**API Communication:**
- Централізований API клієнт (`api.js`)
- HTTP fetch wrapper
- Promise-based

**Styling:**
- Global CSS (`styles.css` - 18KB)
- Utility classes
- Component-scoped styles в `<style>` блоках

### Переваги цього підходу
- Простота для невеликого проекту
- Швидкий старт
- Немає overhead від routing/state management
- Легко підтримувати для одного розробника

### Обмеження
- Складно масштабувати
- Важко розділити функціональність
- Один великий файл (46KB App.vue)

---

## SERVER: Backend Architecture

### Архітектурний патерн
**Layered REST API Backend**

### Характеристики

**Патерн організації:**
- Layered Architecture (без строгого MVC)
- Express.js middleware pipeline
- Functional modules

**Шари:**

1. **API Layer** (`index.js` - 14.8KB)
   - Express routes
   - HTTP endpoints
   - Request/response handling
   - Middleware setup

2. **Business Logic Layer** (`store.js` - 6.8KB)
   - File system operations
   - CRUD operations
   - Data validation
   - Logging logic

3. **Data Access Layer** (`csv.js` - 2.2KB)
   - CSV read/write utilities
   - Row normalization
   - UTF-8 BOM handling

4. **Schema Layer** (`schema.js` - 7.6KB)
   - Data model definitions
   - Column schemas
   - Dynamic schema loading from CSV

**Data Flow:**
```
HTTP Request
    ↓
Express Middleware
    ↓
Route Handler (index.js)
    ↓
Store Layer (store.js)
    ↓
CSV Layer (csv.js)
    ↓
File System (data/*.csv)
```

**Key Patterns:**

**Repository Pattern (неявний):**
- `store.js` діє як repository
- Абстрагує file I/O від business logic

**Factory Pattern:**
- Auto-increment ID generation
- Row normalization

**Observer Pattern:**
- Automatic logging на CRUD операціях

**Schema-Driven Development:**
- `fields_schema.csv` як single source of truth
- Runtime schema loading
- Dynamic UI generation

### Переваги
- Чітке розділення відповідальностей
- Легко тестувати (якщо додати тести)
- Простий для розуміння
- Немає ORM overhead

### Обмеження
- Ручне управління даними (no migrations)
- Все в пам'яті (не масштабується для великих датасетів)
- Відсутність транзакцій

---

## Data Architecture

### Модель зберігання даних
**CSV-based File System Database**

**Філософія:**
- Файли як таблиці
- Рядки як записи
- Колонки як поля
- Excel як DB admin tool

**Схема:**
```
data/
├── employees.csv           # Main table (40 columns)
├── fields_schema.csv       # Meta-schema (UI config)
├── logs.csv               # Audit log
└── employees_import_sample.csv  # Template

files/
└── employee_[ID]/         # Document storage
    ├── passport.pdf
    ├── driver_license.pdf
    └── ...
```

**Нормалізація:**
- Denormalized single table
- Всі дані співробітника в одному рядку
- No foreign keys
- No relations

**Consistency:**
- Row normalization при читанні
- UTF-8 BOM для Excel compatibility
- Auto-generated IDs (sequential)

---

## Integration Architecture

### Client ↔ Server Communication

**Pattern:** REST over HTTP

**Механізм:**
```
Client (Vue SPA)
    ↓ (HTTP Request)
api.js wrapper
    ↓ (fetch)
Vite Proxy (/api → :3000)
    ↓
Express Server (:3000)
    ↓
REST Endpoint Handler
    ↓
Store Layer → CSV Files
    ↓ (JSON Response)
Client receives data
```

**Request Flow:**
1. User interaction в Vue компоненті
2. Виклик методу з `api.js`
3. HTTP fetch через Vite proxy
4. Express обробляє запит
5. Store виконує операцію з CSV
6. JSON response повертається
7. Vue оновлює reactive state
8. UI автоматично re-renders

**Error Handling:**
- HTTP status codes
- JSON error messages
- Try-catch в async/await

---

## Deployment Architecture

### Development Mode

**Client:**
- Vite dev server (:5173)
- HMR enabled
- Proxy до backend

**Server:**
- Node.js --watch mode (:3000)
- Auto-restart на зміни
- Direct file serving

**Startup:**
- `./run.sh` - запускає обидві частини в parallel

### Production Considerations

**Client:**
- `npm run build` → static files
- Можна deploy на Nginx/Apache
- Або `npm run preview` (:5174)

**Server:**
- `npm start` - production mode
- Треба налаштувати process manager (PM2)
- CORS налаштування для production domain

**Data:**
- CSV files - gitignored (user data)
- Треба backup strategy
- Excel-compatible для ручного редагування

---

## Архітектурні рішення

### Ключові компроміси

1. **CSV замість БД**
   - ✅ Простота, Excel compatibility
   - ❌ Не масштабується, немає транзакцій

2. **Monolithic App.vue**
   - ✅ Швидкий розвиток для малого проекту
   - ❌ Важко масштабувати

3. **In-memory на кожен запит**
   - ✅ Простота реалізації
   - ❌ Performance для великих файлів

4. **Dynamic UI з meta-schema**
   - ✅ Flexibility без змін коду
   - ❌ Складніше дебагити

### Best Practices застосовані

- ✅ ES Modules (сучасний JS)
- ✅ REST API conventions
- ✅ CORS security
- ✅ File upload handling (multer)
- ✅ Data validation (zod)
- ✅ Audit logging
- ✅ UTF-8 encoding

### Areas for Improvement

- ❌ No tests (ні unit, ні e2e)
- ❌ No authentication/authorization
- ❌ No database (для масштабування)
- ❌ No component splitting (frontend)
- ❌ No error boundaries
- ❌ No production build process
