# Архітектура інтеграції

**Дата:** 2026-02-01
**Тип проекту:** Multi-part (Client-Server)

## Огляд

Традиційна двоярусна архітектура з чітким розділенням frontend та backend.

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Vue.js SPA (Client)                      │  │
│  │                 Port: 5173                            │  │
│  │                                                       │  │
│  │  App.vue  ←→  api.js (HTTP Client)                  │  │
│  └────────────────────┬──────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        │ HTTP Requests (JSON)
                        │ Vite Proxy: /api → :3000
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS SERVER                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Express.js REST API (Server)                │  │
│  │                 Port: 3000                            │  │
│  │                                                       │  │
│  │  index.js (Routes) → store.js → csv.js               │  │
│  └────────────────────┬──────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        │ File I/O
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                   FILE SYSTEM                               │
│  ┌───────────────────┐      ┌────────────────────────────┐ │
│  │   data/*.csv      │      │  files/employee_[ID]/      │ │
│  │  (Database)       │      │  (PDF Documents)           │ │
│  └───────────────────┘      └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Точки інтеграції

### Integration Point #1: Client → Server API

**Від:** client (Vue.js SPA)
**До:** server (Express.js API)
**Тип:** REST API over HTTP
**Протокол:** HTTP/1.1
**Format:** JSON

#### Комунікаційний шлях

```
User Action (App.vue)
    ↓
Method Call (app methods)
    ↓
api.js wrapper
    ↓
fetch() → HTTP Request
    ↓
Vite Dev Proxy (/api → http://localhost:3000)
    ↓
Express Middleware Chain
    ↓
Route Handler (index.js)
    ↓
Business Logic (store.js)
    ↓
CSV Operations (csv.js)
    ↓
File System (read/write)
    ↓
Response (JSON)
    ↓
fetch() Promise resolution
    ↓
Update Vue reactive state
    ↓
UI Auto-update (Vue reactivity)
```

#### Endpoints використовувані клієнтом

**CRUD Operations:**
- `GET /api/employees` - Завантажити список
- `GET /api/employees/:id` - Деталі співробітника
- `POST /api/employees` - Створити
- `PUT /api/employees/:id` - Оновити
- `DELETE /api/employees/:id` - Видалити

**File Operations:**
- `POST /api/employees/:id/files` - Завантажити PDF
- `DELETE /api/employees/:id/files/:fieldName` - Видалити PDF
- `POST /api/employees/:id/open-folder` - Відкрити папку

**Metadata:**
- `GET /api/fields-schema` - UI schema
- `GET /api/logs` - Audit log

**Utilities:**
- `POST /api/employees/import` - Імпорт CSV
- `POST /api/open-data-folder` - Відкрити data/

#### Формат даних

**Request (POST/PUT):**
```json
{
  "employee_id": "123",
  "first_name": "Іван",
  "last_name": "Петренко",
  "position": "Developer",
  ...
}
```

**Response (GET):**
```json
[
  {
    "employee_id": "123",
    "first_name": "Іван",
    ...
  }
]
```

**Error Response:**
```json
{
  "error": "Employee not found",
  "status": 404
}
```

### Integration Point #2: Server → File System

**Від:** server (Express.js)
**До:** File System (CSV + PDF files)
**Тип:** Direct File I/O
**Протокол:** Native Node.js fs module

#### Data Flow

**CSV Operations:**
```
store.js
    ↓
csv.readCsv(path)
    ↓
fs.readFileSync()
    ↓
Parse CSV → Array of Objects
    ↓
Row Normalization
    ↓
Return to caller
```

**Write Operations:**
```
store.js
    ↓
csv.writeCsv(path, data)
    ↓
Add UTF-8 BOM
    ↓
Stringify to CSV format
    ↓
fs.writeFileSync()
    ↓
Disk write
```

**File Uploads:**
```
multer middleware
    ↓
Save to temp file
    ↓
Rename based on field_name
    ↓
Move to files/employee_[ID]/
    ↓
Update CSV with relative path
```

### Integration Point #3: Vite Proxy (Dev Only)

**Від:** Vite Dev Server (:5173)
**До:** Express Server (:3000)
**Тип:** HTTP Proxy
**Configuration:** `vite.config.js`

#### Proxy Rules

```javascript
{
  "/api": "http://localhost:3000",
  "/files": "http://localhost:3000",
  "/data": "http://localhost:3000"
}
```

**Як працює:**
1. Browser запитує `http://localhost:5173/api/employees`
2. Vite перехоплює запит (matches `/api`)
3. Проксує до `http://localhost:3000/api/employees`
4. Server обробляє
5. Response повертається через Vite до browser

**Переваги:**
- ✅ Немає CORS issues в development
- ✅ Single origin для browser
- ✅ Simulates production setup

**Production:**
- ⚠️ Proxy не існує
- Потрібен proper CORS config на server
- Або reverse proxy (Nginx)

## Data Flow Scenarios

### Scenario 1: Завантаження списку співробітників

```
1. User opens app
   ↓
2. App.vue: onMounted() → loadEmployees()
   ↓
3. api.getEmployees() → fetch('/api/employees')
   ↓
4. Vite proxy → Express :3000
   ↓
5. index.js: app.get('/api/employees', handler)
   ↓
6. store.readEmployees()
   ↓
7. csv.readCsv('data/employees.csv')
   ↓
8. Parse CSV → normalize rows
   ↓
9. Return array to handler
   ↓
10. res.json(employees)
   ↓
11. fetch resolves with data
   ↓
12. employees.value = data
   ↓
13. Vue reactivity → UI updates
```

### Scenario 2: Створення нового співробітника

```
1. User fills form → clicks "Save"
   ↓
2. createEmployee() → api.createEmployee(formData)
   ↓
3. POST /api/employees with JSON body
   ↓
4. Proxy → Express
   ↓
5. index.js: POST handler
   ↓
6. Validate with Zod
   ↓
7. store.addEmployee(data)
   ↓
8. Generate auto-increment ID
   ↓
9. Read existing CSV
   ↓
10. Append new row
   ↓
11. Write CSV back
   ↓
12. Add log entry (logs.csv)
   ↓
13. Return created employee
   ↓
14. Update client state
   ↓
15. UI shows new employee
```

### Scenario 3: Завантаження PDF документу

```
1. User selects PDF → clicks "Upload"
   ↓
2. POST /api/employees/:id/files (multipart/form-data)
   ↓
3. multer middleware processes upload
   ↓
4. Save to temp file: temp_123456.pdf
   ↓
5. Rename to: {file_field}.pdf
   ↓
6. Move to: files/employee_{id}/
   ↓
7. Update employee CSV record
   ↓
8. Set field value: files/employee_{id}/{file_field}.pdf
   ↓
9. Write CSV
   ↓
10. Return updated employee
   ↓
11. UI updates → shows "Open" link
```

## Security and Authentication

### Current State

**Authentication:** ❌ Відсутня
**Authorization:** ❌ Відсутня
**CORS:** ✅ Enabled (cors middleware)

**Implications:**
- Система призначена для локального використання
- Немає user login
- Всі можуть редагувати все
- File uploads не перевіряються на malware

### CORS Configuration

**Server (index.js):**
```javascript
app.use(cors());
```

**Development:**
- Vite proxy → no CORS issues

**Production:**
- Потрібно налаштувати allowed origins
- Або використовувати reverse proxy

## Error Handling

### Client-side

**Pattern:**
```javascript
try {
  const data = await api.getEmployees();
} catch (error) {
  console.error(error);
  alert('Failed to load data');
}
```

**Issues:**
- Простий error handling
- Немає retry logic
- Немає error boundaries

### Server-side

**Pattern:**
```javascript
try {
  const employees = store.readEmployees();
  res.json(employees);
} catch (error) {
  console.error(error);
  res.status(500).json({ error: error.message });
}
```

**HTTP Status Codes:**
- 200 - Success
- 400 - Bad request
- 404 - Not found
- 500 - Server error

## Performance Characteristics

### Network

**Latency:** ~1-50ms (localhost)
**Payload:** Varies
- Employee list: ~5-50KB JSON
- Single employee: ~1-2KB JSON
- File upload: Up to 10MB

**Optimization:**
- ❌ No compression (gzip)
- ❌ No caching headers
- ❌ No pagination

### Data Loading

**Strategy:** Full reload на кожен запит
- Read entire CSV into memory
- Parse and normalize
- Return all rows

**Scalability:**
- ✅ Good for < 1000 employees
- ⚠️ Slow for > 5000 employees
- ❌ Won't work for > 10000 employees

## Monitoring and Logging

### Application Logs

**Client:**
- console.log() в browser DevTools
- Vue DevTools для debugging

**Server:**
- console.log() в terminal
- Немає structured logging
- Немає log files

### Audit Trail

**Logs CSV:**
- Всі CRUD операції логуються
- Timestamp, action, changes
- Доступно через `/api/logs`

## Deployment Considerations

### Development

**Setup:**
```bash
./run.sh
```

**URLs:**
- Client: http://localhost:5173
- Server: http://localhost:3000
- Proxy: автоматично

### Production

**Потрібно:**
1. Build client: `npm run build`
2. Serve static files (Nginx)
3. Reverse proxy до API
4. Process manager для server (PM2)
5. CORS configuration
6. Backup strategy для data/

**Nginx приклад:**
```nginx
server {
  listen 80;

  # Static files
  location / {
    root /path/to/client/dist;
  }

  # API proxy
  location /api {
    proxy_pass http://localhost:3000;
  }
}
```

## Potential Improvements

### Performance
- [ ] Add gzip compression
- [ ] Implement pagination
- [ ] Add caching (Redis)
- [ ] Use database instead of CSV

### Security
- [ ] Add authentication (JWT)
- [ ] Add authorization (roles)
- [ ] Validate file uploads (virus scan)
- [ ] Add rate limiting

### Reliability
- [ ] Add retry logic
- [ ] Implement graceful shutdown
- [ ] Add health checks
- [ ] Database transactions

### Monitoring
- [ ] Structured logging (Winston)
- [ ] APM (Application Performance Monitoring)
- [ ] Error tracking (Sentry)
- [ ] Metrics (Prometheus)
