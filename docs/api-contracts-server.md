# API Контракти - Server

**Дата сканування:** 2026-02-01
**Частина:** server (Backend)
**Тип сканування:** Quick (pattern-based)

## Огляд

REST API сервер на Express.js з 13 endpoints для управління CRM даними.

**Base URL:** `http://localhost:3000`

---

## Endpoints

### Health Check

#### `GET /api/health`
**Опис:** Перевірка стану сервера
**Response:** JSON status

---

### Схема та довідники

#### `GET /api/fields-schema`
**Опис:** Отримати динамічну схему полів UI
**Response:**
```json
{
  "groups": [...],
  "tableFields": [...],
  "allFields": [...]
}
```
**Призначення:** Генерація форм, таблиць, фільтрів на frontend

#### `GET /api/logs`
**Опис:** Отримати аудит лог
**Response:** Масив записів логу (sorted DESC)
**Джерело:** `data/logs.csv`

---

### Операції з співробітниками (CRUD)

#### `GET /api/employees`
**Опис:** Список всіх співробітників
**Response:** Array of employee objects (40 полів)
**Джерело:** `data/employees.csv`

#### `GET /api/employees/:id`
**Опис:** Деталі одного співробітника
**Parameters:**
- `id` - Employee ID (string)
**Response:** Single employee object
**Errors:** 404 якщо не знайдено

#### `POST /api/employees`
**Опис:** Створити нового співробітника
**Request Body:** Employee object
**Response:** Created employee з auto-generated ID
**Side Effects:**
- Додає запис в `employees.csv`
- Логує в `logs.csv`

#### `PUT /api/employees/:id`
**Опис:** Оновити співробітника
**Parameters:**
- `id` - Employee ID
**Request Body:** Updated employee object
**Response:** Updated employee
**Side Effects:**
- Оновлює запис в `employees.csv`
- Логує зміни для кожного поля в `logs.csv`

#### `DELETE /api/employees/:id`
**Опис:** Видалити співробітника
**Parameters:**
- `id` - Employee ID
**Response:** Success message
**Side Effects:**
- Видаляє запис з `employees.csv`
- Видаляє папку `files/employee_{id}/`
- Логує видалення в `logs.csv`

---

### Файлові операції

#### `POST /api/employees/:id/files`
**Опис:** Завантажити PDF документ
**Parameters:**
- `id` - Employee ID
**Multipart Form:**
- `file` - PDF file (до 10MB)
- `file_field` - Назва поля (e.g., "passport_file")
**Response:** Updated employee object
**Side Effects:**
- Зберігає файл в `files/employee_{id}/{file_field}.pdf`
- Оновлює employee record з relative path
**Технологія:** multer middleware

#### `DELETE /api/employees/:id/files/:fieldName`
**Опис:** Видалити документ співробітника
**Parameters:**
- `id` - Employee ID
- `fieldName` - Назва поля файлу
**Response:** Success message
**Side Effects:**
- Видаляє PDF файл
- Очищає поле в employee record

#### `POST /api/employees/:id/open-folder`
**Опис:** Відкрити папку співробітника в ОС
**Parameters:**
- `id` - Employee ID
**Response:** Success/Error message
**Side Effects:** Запускає file explorer ОС

---

### Утиліти

#### `POST /api/open-data-folder`
**Опис:** Відкрити data/ папку в ОС
**Response:** Success message
**Side Effects:** Відкриває `data/` в file explorer

#### `POST /api/employees/import`
**Опис:** Масовий імпорт співробітників з CSV
**Multipart Form:**
- `file` - CSV файл (UTF-8 with BOM, `;` delimiter)
**Response:** Import results (додано/пропущено)
**Validation:**
- Headers must match EMPLOYEE_COLUMNS
- Перевіряє наявність існуючих IDs
**Side Effects:**
- Додає нові записи в `employees.csv`
- Логує операцію

---

## Middleware та безпека

**CORS:** Увімкнено (cors middleware)
**Body Parsing:** JSON + urlencoded
**File Upload:** multer (10MB limit для PDFs)
**Static Files:** Express.static для `/files`, `/data`
**Validation:** Zod schemas (в schema.js)

---

## Формати даних

**Request:** `Content-Type: application/json`
**Response:** `Content-Type: application/json`
**File Upload:** `Content-Type: multipart/form-data`
**CSV Format:** UTF-8 with BOM, `;` delimiter

---

## Виявлені патерни

**Кількість endpoints:** 13
- GET: 4
- POST: 6
- PUT: 1
- DELETE: 2

**Категорії:**
- CRUD операції: 5 endpoints
- Файли: 3 endpoints
- Utilities: 3 endpoints
- Metadata: 2 endpoints

**Source:** `server/src/index.js` (lines 83-446)
