# CRM Manufacturing System

![Vibe Coded](https://img.shields.io/badge/Vibe_Coded-with_Claude_Code-blueviolet?style=flat)

> **This project is vibe coded.** Most of the code was written by [Claude Code](https://claude.ai/claude-code) with human oversight and review. Use in production at your own discretion.

A comprehensive CRM system for managing employee records, documents, and templates.

## Features

- Employee management (CRUD operations)
- Document templates with DOCX file upload
- Automated document generation with placeholder replacement
- Document history tracking
- Audit logging for all operations
- File management for employee documents
- Dashboard with statistics and events
- Dark/light theme toggle with persistent preference
- Three-level search capabilities:
  - Global search across employees, templates, and documents
  - Employee list search within cards view sidebar
  - Within-card field search to filter form fields by label and value
- Organized navigation:
  - Main tabs: Dashboard, Cards, Table, Reports, Documents
  - Documents tab combines Templates and Document History in sub-tabs
  - System Settings dropdown (three dots menu) for Import and Logs

## Navigation Structure

The application uses a tabbed navigation interface with the following organization:

### Main Tabs

Located in the header tab bar:

- **Dashboard** - Statistics, notifications, and recent events
- **Cards (Картки)** - Employee card-based editing interface with sidebar list
- **Table (Таблиця)** - Employee table view with sorting and filtering
- **Reports (Звіти)** - Custom reports with dynamic filter builder
- **Documents (Документи)** - Template management and document history (combines two sub-tabs)

### Documents Tab Sub-tabs

The Documents section contains two sub-tabs for document management:

- **Templates (Шаблони)** - Manage DOCX templates, upload template files, extract placeholders
- **Document History (Історія документів)** - View all generated documents with filters and pagination

### System Settings Dropdown

Accessible via the three-dots menu (⋮) in the top-right corner:

- **System Settings (Налаштування системи)** - Contains Import and Logs sub-tabs:
  - **Import (Імпорт)** - CSV import interface for bulk employee operations
  - **Logs (Логи)** - Audit log viewer with pagination
- **Open Data Folder (Відкрити папку даних)** - Opens the data directory in file manager

## Search Capabilities

The application provides three levels of search functionality:

### Global Search

Located in the header (input field in top bar):
- Searches across employees, templates, and documents simultaneously
- Minimum 2 characters required
- Results grouped by type with counts
- Click on result to navigate to details or download
- Debounced input (300ms delay) for performance

### Employee List Search (Cards View)

Located in the employee sidebar of the Cards view:
- Filters the employee list in real-time
- Searches across: last_name, first_name, middle_name, employee_id, employment_status
- Case-insensitive substring matching

### Within-Card Field Search

Located within the employee card in Cards view (above form fields):
- Filters visible form fields within the current employee card
- Matches against both field labels (from schema) and field values (from employee data)
- Case-insensitive substring matching
- Useful for finding specific fields in large forms

## Technology Stack

**Backend:**
- Node.js with Express
- CSV-based data storage with file locks
- Multer for file uploads
- Docxtemplater for DOCX generation

**Frontend:**
- Vue.js 3
- Bootstrap for UI components
- Axios for API communication

**Testing:**
- Playwright for E2E tests
- Node.js native test runner for unit/integration tests

## Installation

### Prerequisites

- Node.js 18+ (backend and frontend)
- npm or yarn

### Setup

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd server
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd client
   npm install
   ```

### Running the Application

**Быстрый запуск (рекомендуется):**
```bash
./run.sh          # DEV режим: backend :3000, frontend :5173
./run.sh prod     # PROD режим: backend :3001, frontend :5174
```

**Остановка:**
```bash
./stop.sh         # Остановить DEV
./stop.sh prod    # Остановить PROD
```

**Особенности run.sh:**
- Порты жёстко закреплены за режимами (DEV: 3000/5173, PROD: 3001/5174)
- Если порт занят — процесс на нём автоматически останавливается перед запуском
- Vite использует `strictPort: true` — не переключается на другой порт
- Зависимости автоматически устанавливаются, если `package.json` новее `node_modules/`
- Автоматическая инициализация `config.csv` и синхронизация CSV-схемы

**Ручной запуск (для отладки):**
```bash
# Терминал 1 — backend
cd server && npm install && npm run dev

# Терминал 2 — frontend
cd client && npm install && npm run dev
```

## API Documentation

### Templates API

#### GET /api/templates
List all active templates.

**Response:**
```json
{
  "templates": [
    {
      "template_id": "1",
      "template_name": "Contract Template",
      "template_type": "Employment Contract",
      "docx_filename": "template_1_1234567890.docx",
      "placeholder_fields": "first_name, last_name, position",
      "description": "Standard employment contract",
      "created_date": "2026-02-10",
      "active": "yes"
    }
  ]
}
```

#### GET /api/templates/:id
Get single template by ID.

**Response:** Template object or 404 error

#### POST /api/templates
Create new template.

**Request:**
```json
{
  "template_name": "Contract Template",
  "template_type": "Employment Contract",
  "description": "Standard employment contract"
}
```

**Response:**
```json
{
  "template_id": "1",
  "template": { /* full template object */ }
}
```

#### PUT /api/templates/:id
Update template metadata (name, type, description).

**Request:**
```json
{
  "template_name": "Updated Name",
  "template_type": "Updated Type",
  "description": "Updated description"
}
```

#### DELETE /api/templates/:id
Soft delete template (sets active='no').

**Response:** 204 No Content

#### POST /api/templates/:id/upload
Upload DOCX file for template.

**Request:**
- Content-Type: multipart/form-data
- Field: file (DOCX file)

**Response:**
```json
{
  "filename": "template_1_1234567890.docx",
  "placeholders": ["first_name", "last_name", "position"]
}
```

**Notes:**
- Automatically extracts placeholders from DOCX
- Updates template record with filename and placeholders

#### POST /api/templates/:id/generate
Generate document from template for an employee.

**Request:**
```json
{
  "employee_id": "emp123"
}
```

**Response:**
```json
{
  "document_id": "1",
  "filename": "Contract_Петренко_123_1234567890.docx",
  "download_url": "/api/documents/1/download"
}
```

**Notes:**
- Replaces placeholders with employee data
- Stores generated document in files/documents/
- Creates record in generated_documents.csv

### Documents API

#### GET /api/documents
List generated documents with filtering and pagination.

**Query Parameters:**
- template_id (optional) - Filter by template ID
- employee_id (optional) - Filter by employee ID
- start_date (optional) - Filter by generation date >= start_date (YYYY-MM-DD)
- end_date (optional) - Filter by generation date <= end_date (YYYY-MM-DD)
- offset (optional, default: 0) - Pagination offset
- limit (optional, default: 50) - Pagination limit

**Response:**
```json
{
  "documents": [
    {
      "document_id": "1",
      "template_id": "1",
      "template_name": "Contract Template",
      "employee_id": "emp123",
      "employee_name": "Smith John",
      "docx_filename": "Contract_Петренко_123_1234567890.docx",
      "generation_date": "2026-02-11T10:30:00.000Z",
      "generated_by": "system"
    }
  ],
  "total": 42,
  "offset": 0,
  "limit": 50
}
```

#### GET /api/documents/:id/download
Download generated document file.

**Response:**
- Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
- Content-Disposition: attachment; filename="..."
- Body: DOCX file binary

### Search API

#### GET /api/search
Search across employees, templates, and documents.

**Query Parameters:**
- q (required) - Search query string (minimum 2 characters)

**Response:**
```json
{
  "employees": [{ "employee_id": "1", "full_name": "..." }],
  "templates": [{ "template_id": "1", "template_name": "..." }],
  "documents": [{ "document_id": "1", "filename": "...", "employee": {...}, "template": {...} }],
  "total": {
    "employees": 5,
    "templates": 2,
    "documents": 3
  }
}
```

**Notes:**
- Employees searched across all text fields
- Templates searched by name and description
- Documents searched by filename, employee name, and template name
- Results limited: 20 employees, 10 templates, 10 documents

### Employees API

(Additional employee endpoints documented separately)

## Placeholder Syntax

Templates use curly braces for placeholders: `{placeholder_name}`

### Employee Field Placeholders

Any employee field can be used as a placeholder:
- {first_name}, {last_name}, {middle_name}
- {position}
- {birth_date}
- {passport_series}, {passport_number}
- {inn}, {snils}
- And any other employee field defined in schema.csv

### Special Placeholders

Auto-generated placeholders available in all templates:
- {current_date} - Current date in DD.MM.YYYY format
- {current_datetime} - Current date/time in DD.MM.YYYY HH:MM format

### Case Variants (uppercase / capitalized)

For every text placeholder, two additional variants are automatically generated:

- `{key_upper}` - all characters uppercase (e.g., `{full_name_upper}` -> "ІВАН ПЕТРЕНКО")
- `{key_cap}` - first character uppercase (e.g., `{full_name_cap}` -> "Іван петренко")

Works for all placeholders: employee fields, name declensions, grade/position declensions, and special placeholders. Empty values do not get _upper/_cap variants.

### Склонение ФИО по падежам

При генерации документа система автоматически склоняет ФИО сотрудника по всем 6 падежам украинского языка (библиотека [shevchenko](https://github.com/tooleks/shevchenko-js)). Доступно 24 плейсхолдера (6 падежей × 4 поля):

| Падеж | last_name | first_name | middle_name | full_name |
|---|---|---|---|---|
| Родовий (кого?) | `{last_name_genitive}` | `{first_name_genitive}` | `{middle_name_genitive}` | `{full_name_genitive}` |
| Давальний (кому?) | `{last_name_dative}` | `{first_name_dative}` | `{middle_name_dative}` | `{full_name_dative}` |
| Знахідний (кого?) | `{last_name_accusative}` | `{first_name_accusative}` | `{middle_name_accusative}` | `{full_name_accusative}` |
| Кличний (звертання) | `{last_name_vocative}` | `{first_name_vocative}` | `{middle_name_vocative}` | `{full_name_vocative}` |
| Місцевий (на кому?) | `{last_name_locative}` | `{first_name_locative}` | `{middle_name_locative}` | `{full_name_locative}` |
| Орудний (ким?) | `{last_name_ablative}` | `{first_name_ablative}` | `{middle_name_ablative}` | `{full_name_ablative}` |

**Управление склонением:**
- Пол определяется из поля `gender` сотрудника или автоматически по имени/отчеству
- В карточке сотрудника доступны две галочки для отключения склонения:
  - **"Прізвище не склоняється"** (`indeclinable_name`) — отключает склонение только фамилии (last_name), имя и отчество продолжают склоняться
  - **"Ім'я не склоняється"** (`indeclinable_first_name`) — отключает склонение только имени (first_name), фамилия и отчество продолжают склоняться
- Если оба флага установлены — все падежи совпадают с именительным
- Плейсхолдер `{full_name_*}` собирается из частей с учётом обоих флагов: несклоняемые части остаются в именительном падеже
- Плейсхолдеры добавляются автоматически — просто используйте их в DOCX шаблоне

### Example Template

```
ТРУДОВИЙ ДОГОВІР

Прийняти на роботу {full_name_genitive} на посаду {position}.
Видано {full_name_dative}.

Працівник: {last_name} {first_name} {middle_name}
Посада: {position}
Дата початку: {employment_start_date}

Дата укладання: {current_date}
```

## Testing

### E2E Tests

Run all E2E tests:
```bash
npm run test:e2e
```

Run specific test file:
```bash
npm run test:e2e -- templates-generation.spec.js
```

### Unit Tests

Run server unit tests (no server required):
```bash
cd server
npm test
```

Run integration tests (requires running server on port 3000):
```bash
cd server
npm run test:integration
```

### CI/CD

Tests run automatically via GitHub Actions on push to `master`/`feature/*` branches and on PRs to `master`. The CI pipeline runs unit tests, integration tests, and Playwright E2E tests. See `.github/workflows/tests.yml` for details.

## Project Structure

```
.
├── client/                 # Vue.js frontend
│   ├── src/
│   │   ├── views/         # View components (one per route)
│   │   │   ├── DashboardView.vue
│   │   │   ├── EmployeeCardsView.vue
│   │   │   ├── TableView.vue
│   │   │   ├── ReportsView.vue
│   │   │   ├── TemplatesView.vue
│   │   │   ├── DocumentHistoryView.vue
│   │   │   ├── ImportView.vue
│   │   │   ├── PlaceholderReferenceView.vue
│   │   │   └── LogsView.vue
│   │   ├── composables/   # Reusable logic
│   │   │   ├── useFieldsSchema.js
│   │   │   └── useEmployeeForm.js
│   │   ├── App.vue        # Root component with navigation
│   │   ├── api.js         # API client
│   │   └── main.js        # App initialization & routing
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/        # API route modules (organized by feature)
│   │   │   ├── dashboard.js
│   │   │   ├── reports.js
│   │   │   ├── employees.js
│   │   │   ├── employee-files.js
│   │   │   ├── templates.js
│   │   │   ├── documents.js
│   │   │   ├── logs.js
│   │   │   └── misc.js
│   │   ├── index.js       # Express server setup & route registration
│   │   ├── store.js       # CSV data storage
│   │   ├── docx-generator.js  # DOCX generation
│   │   ├── utils.js       # Shared utilities
│   │   └── schema.js      # Employee field schema
│   ├── test/              # Unit & integration tests
│   └── package.json
├── tests/
│   └── e2e/               # Playwright E2E tests
├── data/                  # CSV data files
│   ├── employees.csv
│   ├── templates.csv
│   ├── generated_documents.csv
│   ├── logs.csv
│   └── config.csv
├── files/                 # Uploaded files
│   ├── templates/         # Template DOCX files
│   ├── documents/         # Generated DOCX files
│   └── employee_*/        # Employee-specific files
└── docs/                  # Documentation
    ├── plans/             # Development plans
    └── plans/completed/   # Completed plans
```

## Data Storage

This application uses CSV files for data storage with file locking to prevent concurrent write issues. This approach is suitable for small to medium deployments (< 10,000 employees).

For larger deployments, consider migrating to:
- SQLite (embedded database)
- PostgreSQL (full-featured database)
- MySQL/MariaDB

## Configuration

Configuration is stored in `data/config.csv`:

- max_file_upload_mb - Maximum file upload size in MB (default: 10)
- retirement_age_years - Retirement age for statistics (default: 60)
- max_log_entries - Maximum audit log entries to keep (default: 1000)
- max_report_preview_rows - Maximum rows in report preview (default: 100)

## Security Considerations

- Input validation on all API endpoints
- File extension validation for uploads
- File size limits enforced
- No direct access to CSV files via static routes
- Audit logging for all operations
- Soft delete for data retention

## Documentation

For detailed documentation on the templates system, see:
- [Templates System Documentation](docs/templates-system-improvements.md)

## License

Proprietary - Internal use only
