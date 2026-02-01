# Технологічний стек

**Дата аналізу:** 2026-02-01
**Тип проекту:** Multi-part (Client-Server)

## Частина 1: CLIENT (Frontend)

### Основні технології

| Категорія | Технологія | Версія | Обґрунтування |
|-----------|------------|--------|---------------|
| **Framework** | Vue.js | 3.4.30 | Progressive JavaScript framework для побудови UI |
| **Build Tool** | Vite | 5.3.5 | Швидкий dev server і bundler нового покоління |
| **Language** | JavaScript | ES2015+ | Сучасний JavaScript з модулями |
| **Dev Server** | Vite Dev Server | 5.3.5 | Hot Module Replacement, швидкий старт |
| **Port** | localhost | 5173 | Стандартний порт Vite |

### Плагіни та інструменти

| Інструмент | Версія | Призначення |
|------------|--------|-------------|
| @vitejs/plugin-vue | 5.0.5 | Підтримка Vue SFC у Vite |

### Конфігурація

**Vite Proxy:**
- `/api` → `http://localhost:3000` (API запити)
- `/files` → `http://localhost:3000` (Файли документів)
- `/data` → `http://localhost:3000` (CSV дані)

### Архітектурний патерн
- **Тип:** Monolithic Component-based SPA
- **Патерн:** Single Page Application
- **Структура:** Один великий компонент App.vue з реактивним станом
- **Стиль:** Inline styles (styles.css)
- **API клієнт:** Власний HTTP wrapper (api.js)

---

## Частина 2: SERVER (Backend)

### Основні технології

| Категорія | Технологія | Версія | Обґрунтування |
|-----------|------------|--------|---------------|
| **Framework** | Express.js | 4.18.2 | Мінімалістичний веб-фреймворк для Node.js |
| **Runtime** | Node.js | Latest | JavaScript runtime для серверної частини |
| **Language** | JavaScript | ES Modules | Сучасний JavaScript з import/export |
| **Database** | CSV Files | - | Файлова система як база даних |
| **Port** | localhost | 3000 | Express сервер |

### Основні залежності

| Бібліотека | Версія | Призначення |
|------------|--------|-------------|
| **cors** | 2.8.5 | CORS middleware для крос-доменних запитів |
| **csv-parse** | 5.5.6 | Парсинг CSV файлів |
| **csv-stringify** | 6.5.1 | Генерація CSV файлів |
| **multer** | 1.4.5-lts.1 | Завантаження файлів (PDF документи) |
| **zod** | 3.23.8 | Schema validation для даних |

### Структура даних

**CSV-based Storage:**
- `data/employees.csv` - Дані співробітників (40 колонок)
- `data/fields_schema.csv` - Мета-схема полів UI
- `data/logs.csv` - Аудит лог CRUD операцій
- `data/employees_import_sample.csv` - Шаблон імпорту
- `files/employee_[ID]/` - Завантажені PDF документи

### Архітектурний патерн
- **Тип:** Layered REST API Backend
- **Патерн:** MVC-подібний (без ORM)
- **Структура:**
  - `index.js` - Express app + REST endpoints
  - `store.js` - File system operations
  - `csv.js` - CSV utilities
  - `schema.js` - Data model definitions
- **Data Access:** Direct file I/O (no database)
- **API Style:** RESTful endpoints

---

## Інтеграція між частинами

### Комунікаційний стек

| Аспект | Реалізація |
|--------|------------|
| **Протокол** | HTTP/REST |
| **Формат даних** | JSON |
| **Автентифікація** | Немає (локальна система) |
| **CORS** | Увімкнено на сервері |
| **Proxy** | Vite proxy для development |

### API Endpoints (з server/src/index.js)

Базові операції:
- `GET /api/employees` - Список співробітників
- `GET /api/employees/:id` - Деталі співробітника
- `POST /api/employees` - Створити співробітника
- `PUT /api/employees/:id` - Оновити співробітника
- `DELETE /api/employees/:id` - Видалити співробітника

Файлові операції:
- `POST /api/employees/:id/files` - Завантажити документ
- `DELETE /api/employees/:id/files/:fieldName` - Видалити документ
- `POST /api/employees/:id/open-folder` - Відкрити папку в ОС

Довідкові дані:
- `GET /api/fields-schema` - Динамічна схема UI
- `GET /api/dictionaries` - Довідники (legacy)
- `GET /api/logs` - Аудит лог

Утиліти:
- `POST /api/open-data-folder` - Відкрити data/ в ОС
- `POST /api/employees/import` - Масовий імпорт з CSV

---

## Особливості архітектури

### Унікальні рішення

1. **CSV як база даних**
   - Можна редагувати в Excel
   - UTF-8 BOM для коректного відображення кирилиці
   - Auto-reload при оновленні UI
   - Delimiter: `;` (semicolon)

2. **Динамічна UI з мета-схеми**
   - `fields_schema.csv` визначає всю структуру UI
   - Форми, таблиці, фільтри генеруються автоматично
   - Зміни в схемі застосовуються без коду

3. **Файлове сховище**
   - PDF документи в `files/employee_[ID]/`
   - Відносні шляхи в CSV
   - Інтеграція з ОС (open folder)

4. **Автоматичний аудит**
   - Всі CRUD операції логуються
   - Field-level change tracking
   - Human-readable описи

---

## Середовище розробки

### Команди запуску

**Root level:**
```bash
./run.sh          # Запустити обидві частини
./stop.sh         # Зупинити обидві частини
```

**Client:**
```bash
cd client
npm install
npm run dev       # Dev server на :5173
npm run build     # Production build
npm run preview   # Preview build
```

**Server:**
```bash
cd server
npm install
npm run dev       # Сервер з --watch на :3000
npm start         # Production запуск
```

### Ports

- **Client Dev:** 5173
- **Server:** 3000
- **Client Build Preview:** 5174

---

## Залежності та версії

**Client dependencies:**
- vue: ^3.4.30

**Client devDependencies:**
- @vitejs/plugin-vue: ^5.0.5
- vite: ^5.3.5

**Server dependencies:**
- cors: ^2.8.5
- csv-parse: ^5.5.6
- csv-stringify: ^6.5.1
- express: ^4.18.2
- multer: ^1.4.5-lts.1
- zod: ^3.23.8
