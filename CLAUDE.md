# CLAUDE.md - CRM Manufacturing System Internal Documentation

This document provides internal technical documentation for developers and AI assistants working on the CRM Manufacturing System. For user-facing documentation, see README.md.

---

## Project Overview

The CRM Manufacturing System is a comprehensive employee management application designed for small to medium manufacturing organizations. It provides:

- Complete employee lifecycle management (hiring, status changes, retirement)
- Document generation from templates with automatic field replacement
- Document history tracking with data snapshots
- Comprehensive audit logging for all operations
- Dashboard with real-time statistics and notifications
- Custom reporting with dynamic filters
- File management for employee documents

The system is optimized for organizations with up to 10,000 employees and emphasizes data integrity, audit trail, and ease of use.

### Design Philosophy

- Simple, proven technologies over complex frameworks
- File-based storage with strong concurrency controls
- Comprehensive audit logging for compliance
- Ukrainian language interface for end users
- Soft deletes for data retention and recovery
- Regular testing approach: write code, then tests

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ with ES modules
- **Framework**: Express.js for HTTP API
- **Storage**: CSV files with UTF-8 BOM encoding and semicolon delimiters
- **File Uploads**: Multer with configurable size limits
- **Document Generation**: Docxtemplater + PizzipJS for DOCX manipulation
- **Declension**: shevchenko (name declension) + shevchenko-ext-military (grade/position declension)
- **Validation**: Zod for input validation schemas
- **CSV Parsing**: csv-parse and csv-stringify libraries
- **Testing**: Node.js native test runner for unit/integration tests

### Frontend
- **Framework**: Vue.js 3 with Composition API
- **Build Tool**: Vite for fast development and production builds
- **Router**: Vue Router 5 for SPA navigation
- **UI Framework**: Bootstrap 5 for responsive components
- **HTTP Client**: Fetch API for API communication
- **Styling**: Custom CSS with Bootstrap customizations

### Testing
- **E2E Testing**: Playwright for cross-browser end-to-end tests
- **Unit Testing**: Node.js native test runner (node test/*.test.js)
- **Test Organization**: tests/e2e/ for E2E, server/test/ for backend unit tests
- **Coverage Target**: 80%+ for critical business logic paths
- **Critical Rule**: All tests must pass before marking tasks complete

---

## Project Structure

```
crm_manufactur/
├── .github/
│   └── workflows/
│       └── tests.yml              # GitHub Actions CI workflow
│
├── client/                      # Vue.js frontend application
│   ├── src/
│   │   ├── views/              # View components (one per route)
│   │   │   ├── DashboardView.vue         # Dashboard with statistics and notifications
│   │   │   ├── EmployeeCardsView.vue     # Employee card-based editing interface
│   │   │   ├── TableView.vue             # Employee table with sorting and filtering
│   │   │   ├── ReportsView.vue           # Custom reports with dynamic filters
│   │   │   ├── ImportView.vue            # CSV import interface
│   │   │   ├── TemplatesView.vue         # Template management
│   │   │   ├── DocumentHistoryView.vue   # Document generation history
│   │   │   ├── DocumentsView.vue         # Tabbed container for Templates + Document History
│   │   │   ├── SystemSettingsView.vue    # Tabbed container for Import + Logs
│   │   │   ├── PlaceholderReferenceView.vue # Placeholder reference guide
│   │   │   └── LogsView.vue              # Audit log viewer
│   │   ├── composables/        # Shared composable functions
│   │   │   ├── useFieldsSchema.js        # Field schema loading and utilities (singleton)
│   │   │   ├── useEmployeeForm.js        # Employee form state and dirty tracking
│   │   │   ├── useEmployeePhoto.js       # Employee photo upload, display, delete
│   │   │   ├── useEmployeeDocuments.js   # Employee document upload, dates, delete
│   │   │   ├── useStatusManagement.js    # Employment status change and history
│   │   │   ├── useDocumentGeneration.js  # Template loading and document generation
│   │   │   ├── useDismissedEvents.js     # Dashboard notification dismissal (localStorage)
│   │   │   ├── useDashboardNotifications.js # Dashboard notification checking and display
│   │   │   ├── useDashboardStats.js      # Dashboard statistics cards
│   │   │   ├── useDashboardTimeline.js   # Dashboard timeline events
│   │   │   ├── useDashboardReport.js     # Dashboard report toggle (current/month)
│   │   │   ├── useCustomReport.js        # Custom report filters, results, CSV export
│   │   │   ├── useTemplatesManagement.js # Template CRUD operations
│   │   │   ├── useTemplateUpload.js      # Template DOCX file upload
│   │   │   ├── useTableInlineEdit.js     # Table inline cell editing
│   │   │   ├── useTableColumnFilters.js  # Table column checkbox filters
│   │   │   └── useReprimands.js          # Employee reprimands/commendations CRUD popup
│   │   ├── utils/              # Utility modules
│   │   │   ├── constants.js              # Application-wide constants
│   │   │   └── employee.js               # Employee display name utility
│   │   ├── App.vue             # Root component with navigation and layout
│   │   ├── api.js              # Fetch-based API client
│   │   └── main.js             # Vue app initialization and routing
│   ├── public/                 # Static assets
│   ├── package.json            # Frontend dependencies
│   └── vite.config.js          # Vite build configuration
│
├── server/                      # Node.js backend application
│   ├── src/
│   │   ├── routes/             # API route modules (organized by feature)
│   │   │   ├── dashboard.js    # Dashboard, health, config, event routes
│   │   │   ├── reports.js      # Status and custom report routes
│   │   │   ├── employees.js    # Employee CRUD routes
│   │   │   ├── employee-files.js # Employee file management and import routes
│   │   │   ├── templates.js    # Template CRUD and generation routes
│   │   │   ├── documents.js    # Document history and download routes
│   │   │   ├── logs.js         # Audit log routes
│   │   │   └── misc.js         # Utility routes (folder, schema, search)
│   │   ├── index.js            # Express server setup and route registration
│   │   ├── store.js            # CSV data storage layer (load/save functions)
│   │   ├── csv.js              # Low-level CSV read/write utilities
│   │   ├── schema.js           # Dynamic field schema loading from fields_schema.csv
│   │   ├── docx-generator.js   # DOCX template processing and placeholder replacement
│   │   ├── declension.js       # Ukrainian name/grade/position declension (shevchenko + shevchenko-ext-military)
│   │   ├── utils.js            # Shared utility functions (getNextId, normalizeEmployeeInput, etc.)
│   │   ├── upload-config.js    # Multer configuration for file uploads
│   │   ├── sync-template.js    # CSV template synchronization utility
│   │   └── clean-invalid-dates.js # Data migration utility
│   ├── test/                   # Unit and integration tests
│   │   ├── config.test.js
│   │   ├── declension.test.js
│   │   ├── docx-generator.test.js
│   │   ├── retirement-api.test.js
│   │   ├── retirement-events.test.js
│   │   ├── templates-api.test.js
│   │   ├── upload-limit.test.js
│   │   ├── utils.test.js
│   │   ├── search-api.test.js
│   │   ├── photo-api.test.js
│   │   ├── status-history.test.js
│   │   ├── reprimands-api.test.js
│   │   ├── reprimands-store.test.js
│   │   ├── status-events-store.test.js
│   │   └── status-events-api.test.js
│   └── package.json            # Backend dependencies
│
├── tests/
│   └── e2e/                    # Playwright E2E tests
│       ├── templates-generation.spec.js
│       ├── templates-crud.spec.js
│       └── document-history.spec.js
│
├── data/                       # CSV data files (runtime state)
│   ├── fields_schema.template.csv # Field schema template (tracked in git)
│   ├── config.template.csv     # Config template (tracked in git)
│   ├── employees.csv           # Employee master records
│   ├── templates.csv           # Document template metadata (gitignored, auto-created)
│   ├── generated_documents.csv # Generated document records (gitignored, auto-created)
│   ├── logs.csv                # Audit log entries
│   ├── config.csv              # Application configuration (gitignored, from template)
│   └── fields_schema.csv       # Dynamic field schema (gitignored, from template)
│
├── files/                      # Uploaded and generated files
│   ├── templates/              # Template DOCX files (template_{id}_{timestamp}.docx)
│   ├── documents/              # Generated DOCX files (TemplateName_LastName_empXXX_{timestamp}.docx)
│   └── employee_*/             # Employee-specific document folders
│
├── docs/                       # Documentation and planning
│   ├── plans/                  # Active development plans
│   ├── plans/completed/        # Completed plans (archived)
│   └── templates-system-improvements.md
│
├── README.md                   # User-facing documentation
├── CLAUDE.md                   # Internal technical documentation (this file)
├── package.json                # Root package for E2E tests
├── playwright.config.js        # Playwright test configuration
├── run.sh                      # Start both server and client
├── stop.sh                     # Stop both server and client
└── cleanup-processes.sh        # Force-kill all orphaned node processes
```

---

## Data Storage Architecture

### CSV-Based Storage

The application uses CSV files as its primary data store. This approach was chosen for:

- **Simplicity**: No database server required, minimal dependencies
- **Portability**: Data files can be easily backed up, versioned, and inspected
- **Transparency**: Human-readable format for debugging and data recovery
- **Scalability Limit**: Suitable for up to ~10,000 employees with current implementation

### File Format Conventions

All CSV files follow these standards:

- **Encoding**: UTF-8 with BOM (Byte Order Mark: \uFEFF)
- **Delimiter**: Semicolon (;) - chosen for Ukrainian locale compatibility
- **Quoting**: Double quotes (") for fields containing delimiters or newlines
- **Headers**: First row contains column names matching field_name from fields_schema.csv
- **Auto-increment IDs**: Integer IDs managed by application (e.g., employee_id, template_id)

### Concurrency Control with File Locks

To prevent race conditions when multiple requests modify the same CSV file, the application uses in-memory promise-based locks:

- **employeeWriteLock**: Serializes all writes to employees.csv
- **templatesWriteLock**: Serializes all writes to templates.csv
- **generatedDocumentsWriteLock**: Serializes all writes to generated_documents.csv
- **logWriteLock**: Serializes all writes to logs.csv
- **statusHistoryWriteLock**: Serializes all writes to status_history.csv
- **statusEventWriteLock**: Serializes all writes to status_events.csv
- **reprimandWriteLock**: Serializes all writes to reprimands.csv

These locks ensure that only one write operation occurs at a time per file, preventing data corruption from concurrent modifications.

### Data Files Overview

**employees.csv**
- Master employee records with dynamic schema from fields_schema.csv
- Soft delete: active='yes'/'no' field
- Auto-increment employee_id

**templates.csv**
- Template metadata (name, type, description, placeholders)
- References DOCX files in files/templates/
- Soft delete: active='yes'/'no'
- Auto-increment template_id
- Gitignored — auto-created with headers by `ensureCsvFile()` on first read

**generated_documents.csv**
- Records of all generated documents
- Links to templates and employees
- Stores generation timestamp and data snapshot
- Document ID for tracking and download
- Gitignored — auto-created with headers by `ensureCsvFile()` on first read

**logs.csv**
- Audit trail for all operations (create, update, delete, import, export, generate)
- Includes timestamp, user, action type, entity type, entity ID, and details
- Automatically pruned to max_log_entries configuration limit

**fields_schema.template.csv** (tracked in git)
- Canonical field schema template, source of truth for the schema
- Copied to `fields_schema.csv` during startup (`run.sh`) and CI setup
- Must remain in git for CI pipeline to function

**config.template.csv** (tracked in git)
- Default configuration template with all settings
- Copied to `config.csv` on first launch if it does not exist
- Must remain in git for CI pipeline to function

**config.csv**
- Key-value configuration storage
- Settings: max_file_upload_mb, retirement_age_years, max_log_entries, max_report_preview_rows
- Loaded at startup and cached in memory

**fields_schema.csv**
- Dynamic field schema defining all employee fields
- Controls: field name, data type, display label (Ukrainian), validation, UI visibility
- Changes trigger automatic schema migration in employees.csv

**status_history.csv**
- Records every employment status change for audit trail
- Columns: history_id, employee_id, old_status, new_status, old_start_date, old_end_date, new_start_date, new_end_date, changed_at, changed_by
- Auto-created with headers by `ensureCsvFile()` on first read
- Entries created automatically when `employment_status` field changes via PUT
- Sorted by `changed_at` descending when queried

**status_events.csv**
- Scheduled status events (source of truth for event-based status management)
- Columns: event_id, employee_id, status, start_date, end_date, created_at, active
- Hard delete (no soft delete) — events removed directly when deleted by user
- Active events auto-activate employee status on sync; expired events auto-reset to "Працює"
- Overlap prevention: two events cannot share overlapping date ranges for same employee
- Synced on `GET /api/employees/:id` (per-employee) and `GET /api/dashboard/events` (all employees)
- Cleaned up when employee is deleted (`removeStatusEventsForEmployee`)
- Gitignored — auto-created with headers on first read

**reprimands.csv**
- Records employee reprimands and commendations (dogany/vidznaky)
- Columns: record_id, employee_id, record_date, record_type, order_number, note, created_at
- Gitignored — auto-created with headers by `ensureCsvFile()` on first read
- Hard delete (records fully removed, no soft delete)
- Sorted by `record_date` descending when queried per employee
- Cleaned up when employee is deleted (`removeReprimandsForEmployee`)
- Record types: Догана, Сувора догана, Зауваження, Попередження, Подяка, Грамота, Премія, Нагорода

---

## File Organization

### Template Files (files/templates/)

Template DOCX files uploaded by users:
- Naming convention: `template_{template_id}_{timestamp}.docx`
- Example: template_1_1707845123456.docx
- Each template can have only one active DOCX file
- Old files are replaced when new DOCX is uploaded

### Generated Documents (files/documents/)

Documents generated from templates:
- Naming convention: `{TemplateName}_{LastName}_{employee_id}_{timestamp}.docx`
- Example: Contract_Петренко_123_1707845123456.docx
- Files are never deleted, only references in generated_documents.csv
- Used for document history and compliance

### Employee Document Folders (files/employee_*/)

Per-employee folders for uploaded documents:
- Naming convention: `employee_{employee_id}/`
- Example: employee_123/
- Used for storing employee-specific files (contracts, certificates, etc.)
- Created on-demand when first document is uploaded for employee
- Employee photo stored as `photo.{ext}` (e.g., `photo.jpg`, `photo.png`) — old photo file deleted on re-upload

---

## Key Technical Decisions

This section documents important architectural and implementation decisions made in the project.

### CSV-Based Storage Rationale and Limitations

The system uses CSV files instead of a traditional relational database for several reasons:

- **Simplicity**: No database server to install, configure, or maintain - just Node.js and file system
- **Portability**: Data files can be easily backed up, transferred, and version-controlled
- **Transparency**: Human-readable format allows direct inspection and manual recovery if needed
- **Low Overhead**: No connection pooling, query parsing, or transaction log overhead
- **Target Audience**: Designed for small to medium manufacturing organizations

**Scalability Limitation**: The current implementation is suitable for organizations with up to ~10,000 employees. Beyond this, performance may degrade, and migration to a proper database (SQLite or PostgreSQL) should be considered.

### File Locking Pattern for Concurrent Writes

To prevent race conditions and data corruption when multiple HTTP requests attempt to modify the same CSV file simultaneously, the application uses in-memory promise-based locks:

```javascript
// In store.js
let employeeWriteLock = Promise.resolve();
let templatesWriteLock = Promise.resolve();
let generatedDocumentsWriteLock = Promise.resolve();
let logWriteLock = Promise.resolve();
let statusHistoryWriteLock = Promise.resolve();
```

**How It Works**:
1. Each write operation chains onto the existing lock promise
2. Operations are serialized: second write waits for first to complete
3. Lock is per-file: writes to employees.csv don't block writes to templates.csv
4. Lock is in-memory: resets on server restart (acceptable for this use case)

**Trade-offs**:
- Simple and effective for single-server deployment
- Not suitable for multi-server/cluster deployments (would need distributed locking)
- No deadlock prevention needed (single lock per resource)

### Soft Delete Pattern

The application uses soft deletes instead of hard deletes for all entities (employees, templates, generated documents):

**Implementation**:
- Each entity has an `active` field with values 'yes' or 'no'
- DELETE operations set `active='no'` instead of removing rows
- GET operations filter to return only `active='yes'` records by default

**Benefits**:
- Data retention for audit and compliance purposes
- Easy recovery from accidental deletions
- Historical data preserved for document generation snapshots
- Maintains referential integrity (no broken foreign keys)

**Considerations**:
- File space grows over time (old records never truly deleted)
- Auto-increment IDs continue to increase (gaps in visible IDs normal)
- Queries must always filter by `active='yes'` to avoid showing deleted records

### Audit Logging for All Operations

Every data modification operation is logged to `logs.csv` with full details:

**Logged Operations**:
- CREATE: New employee, template, or generated document
- UPDATE: Changes to existing records
- DELETE: Soft delete operations
- IMPORT: Bulk employee imports
- EXPORT: Data exports
- GENERATE: Document generation from templates

**Log Entry Structure** (from LOG_COLUMNS in schema.js):
- log_id: Auto-increment identifier
- timestamp: ISO 8601 timestamp
- user: Username or 'system' for automated operations
- action: Operation type (CREATE, UPDATE, DELETE, etc.)
- entity_type: What was modified (employee, template, document)
- entity_id: ID of affected entity
- details: JSON or text description of changes

**Log Pruning**:
- Logs are automatically pruned to maintain only the most recent N entries
- Limit controlled by `max_log_entries` configuration (default: 1000)
- Oldest logs removed first when limit exceeded
- Pruning occurs during write operations to avoid unbounded growth

### UTF-8 BOM and Semicolon Delimiter Conventions

**UTF-8 with BOM Encoding**:
- All CSV files use UTF-8 encoding with Byte Order Mark (\uFEFF)
- BOM ensures proper Ukrainian character rendering in Excel and other tools
- BOM is automatically stripped when reading files (see csv.js)
- BOM is automatically added when writing files

**Semicolon (;) as Delimiter**:
- Chosen for compatibility with Ukrainian Excel locale settings
- Avoids conflicts with commas in text content
- Standard practice for European CSV formats
- Ukrainian decimal separator is comma, so semicolon prevents parsing issues

**Field Quoting**:
- Fields containing delimiters or newlines are automatically quoted with double quotes (")
- Quotes within fields are escaped as double quotes ("")
- Handled automatically by csv-parse and csv-stringify libraries

### Auto-Increment ID Pattern

All entities use integer auto-increment IDs for primary keys:

**Implementation** (from getNextId function in index.js):
```javascript
function getNextId(items, idField) {
  if (items.length === 0) return "1";
  const ids = items.map(item => parseInt(item[idField], 10)).filter(id => !isNaN(id));
  if (ids.length === 0) return "1";
  const maxId = ids.reduce((max, id) => Math.max(max, id), 0);
  return String(maxId + 1);
}
```

**Characteristics**:
- IDs are always strings in CSV (to match CSV text format)
- IDs are parsed as integers for comparison
- New ID = max(existing_ids) + 1
- Gaps in IDs are normal (due to soft deletes)
- reduce() used instead of Math.max(...spread) to avoid stack overflow on large datasets

**Applied to**:
- employee_id in employees.csv
- template_id in templates.csv
- document_id in generated_documents.csv
- log_id in logs.csv

### Security Decisions

The application implements several security measures to protect against common vulnerabilities:

#### Path Traversal Protection

All file system operations validate paths to prevent directory traversal attacks:

**Pattern** (from index.js):
```javascript
const resolvedPath = path.resolve(userProvidedPath);
const allowedDir = path.resolve(FILES_DIR);

if (!resolvedPath.startsWith(allowedDir + path.sep)) {
  return res.status(403).json({ error: "Недозволений шлях" });
}
```

**Applied to**:
- File downloads (templates, documents)
- File uploads (employee folders)
- File deletion operations
- Folder opening operations

**Why**: Prevents attackers from accessing files outside FILES_DIR using paths like `../../etc/passwd`

#### Input Validation

**Required Field Validation**:
- Template name and type checked before creation/update
- Employee ID validated before document generation
- Form data validated before save operations

**File Upload Validation**:
- DOCX extension required for template uploads
- File size limits enforced (configurable via max_file_upload_mb)
- MIME type checking handled by multer
- Filenames sanitized to remove special characters

**Data Type Validation**:
- Date fields validated for YYYY-MM-DD format
- Select fields validated against allowed values from fields_schema.csv
- Numeric fields parsed and validated before storage

**Pagination Validation**:
- Limit parameter capped at 1000 to prevent DoS via large result sets
- Offset validated as non-negative integer
- Default values applied for missing parameters

#### File Size Limits

File upload limits configured via `config.csv`:
- Default: 10 MB per file
- Configurable via max_file_upload_mb setting
- Enforced by multer middleware at upload time
- Prevents denial-of-service via large file uploads

**Configuration**:
```javascript
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(appConfig.max_file_upload_mb || 10) * 1024 * 1024 }
});
```

#### Data Directory Protection

CSV data files are NOT served via static file routes:
- /files route exposes FILES_DIR only (templates, documents, employee folders)
- /data route REMOVED to prevent direct access to CSV files
- All data access must go through API endpoints
- API endpoints enforce business logic and access controls

#### Filename Sanitization

Generated filenames sanitize user input to prevent file system issues:
```javascript
const sanitizedName = template.template_name.replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/g, '_');
```

**Why**: Prevents special characters in filenames that could cause file system errors or security issues

---

## Backend Patterns

This section documents common code patterns and conventions used throughout the backend codebase.

### API Route Structure and Conventions

All API routes follow consistent patterns for clarity and maintainability.

**Route Naming**:
- Base path: `/api/`
- Resource-based routing: `/api/employees`, `/api/templates`, `/api/logs`
- ID-based routes: `/api/templates/:id`, `/api/employees/:id`
- Action routes: `/api/templates/:id/upload`, `/api/templates/:id/generate`
- Utility routes: `/api/health`, `/api/dashboard/stats`, `/api/export`

**HTTP Methods**:
- GET: Retrieve data (lists or single items)
- POST: Create new resources or trigger actions
- PUT: Update existing resources
- DELETE: Soft delete resources (set active='no')

**Route Organization** (modular structure in server/src/routes/):
- `dashboard.js` - Health check, configuration, dashboard stats, events
- `reports.js` - Status reports and custom reports with filters
- `employees.js` - Employee CRUD operations
- `employee-files.js` - Employee file management and CSV import
- `templates.js` - Template CRUD, upload, and document generation
- `documents.js` - Document history and downloads
- `logs.js` - Audit log retrieval
- `misc.js` - Utility routes (folder opening, schema, search)

**Route Module Pattern**:
Each route module exports a registration function that takes the Express app instance and registers its routes:

```javascript
// server/src/routes/templates.js
export function registerTemplateRoutes(app) {
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await loadTemplates();
      const activeTemplates = templates.filter((t) => t.active !== 'no');
      res.json({ templates: activeTemplates });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/templates", async (req, res) => { /* ... */ });
  app.put("/api/templates/:id", async (req, res) => { /* ... */ });
  // ... more routes
}
```

**Main Server File** (server/src/index.js):
The main server file imports and calls route registration functions:

```javascript
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerReportRoutes } from "./routes/reports.js";
import { registerEmployeeRoutes } from "./routes/employees.js";
import { registerEmployeeFileRoutes } from "./routes/employee-files.js";
import { registerTemplateRoutes } from "./routes/templates.js";
import { registerDocumentRoutes } from "./routes/documents.js";
import { registerLogRoutes } from "./routes/logs.js";
import { registerMiscRoutes } from "./routes/misc.js";

// ... middleware setup

// Register all routes
registerDashboardRoutes(app);
registerReportRoutes(app);
registerEmployeeRoutes(app);
registerEmployeeFileRoutes(app);
registerTemplateRoutes(app);
registerDocumentRoutes(app);
registerLogRoutes(app);
registerMiscRoutes(app);

// Start server
app.listen(port, () => { /* ... */ });
```

This modular approach:
- Separates routes by feature/resource for easier maintenance
- Keeps index.js focused on server setup and configuration
- Makes it easy to find and modify specific route handlers
- Improves testability by isolating route logic
- Reduces merge conflicts when multiple developers work on different features

### CSV Read/Write Patterns

All CSV operations follow a consistent pattern through store.js functions.

**Load Pattern** (Read Operations):
```javascript
export async function loadEmployees() {
  const columns = await getEmployeeColumns();
  return readCsv(EMPLOYEES_PATH, columns);
}

export async function loadTemplates() {
  return readCsv(TEMPLATES_PATH, TEMPLATE_COLUMNS);
}
```

**Save Pattern** (Write Operations with Locking):
```javascript
export async function saveEmployees(rows) {
  // Acquire lock: wait for previous write to complete
  const previousLock = employeeWriteLock;
  let releaseLock;
  employeeWriteLock = new Promise(resolve => { releaseLock = resolve; });

  try {
    await previousLock;
    const columns = await getEmployeeColumns();
    await writeCsv(EMPLOYEES_PATH, columns, rows);
  } finally {
    releaseLock();
  }
}
```

**Key Points**:
- All reads use readCsv() from csv.js (handles BOM, delimiter, parsing)
- All writes use writeCsv() from csv.js (handles BOM, delimiter, quoting)
- Writes always use file locks to prevent race conditions
- Schema columns loaded from fields_schema.csv for dynamic fields
- Hard-coded columns for fixed-schema files (logs, templates, config)

### Multer File Upload Pattern and Configuration

File uploads are handled using multer middleware with size limit validation.

**Basic Upload Configuration**:
```javascript
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(appConfig.max_file_upload_mb || 10) * 1024 * 1024 }
});
```

**Template Upload Configuration** (in index.js):
```javascript
const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const templateDir = path.join(FILES_DIR, 'templates');
    fs.mkdirSync(templateDir, { recursive: true });
    cb(null, templateDir);
  },
  filename: (req, file, cb) => {
    const templateId = req.params.id;
    const timestamp = Date.now();
    cb(null, `template_${templateId}_${timestamp}.docx`);
  }
});

const templateUpload = multer({
  storage: templateStorage,
  limits: { fileSize: parseInt(appConfig.max_file_upload_mb || 10) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      cb(new Error('Only DOCX files allowed'));
      return;
    }
    cb(null, true);
  }
});
```

**Usage in Routes**:
```javascript
app.post("/api/employees/import", importUpload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "File not found" });
    return;
  }
  // Process req.file.buffer for memory storage
  // or req.file.path for disk storage
});
```

**Key Features**:
- Memory storage for CSV imports (small files, temporary processing)
- Disk storage for template DOCX files (permanent storage)
- File size limits from config.csv (default 10 MB)
- File type validation via fileFilter
- Automatic directory creation for template uploads

### Error Handling and HTTP Status Codes

The application follows consistent error handling patterns across all routes.

**Standard Error Pattern**:
```javascript
app.get("/api/resource/:id", async (req, res) => {
  try {
    // Business logic here
    const item = await loadItem(req.params.id);

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    res.json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
```

**HTTP Status Code Conventions**:
- 200 OK: Successful GET request
- 201 Created: Successful POST creating new resource
- 400 Bad Request: Validation errors, missing required fields, invalid input
- 403 Forbidden: Security violations (path traversal, unauthorized access)
- 404 Not Found: Resource not found by ID
- 500 Internal Server Error: Unexpected errors, exceptions

**Error Message Conventions**:
- Ukrainian language for user-facing error messages
- English for technical/developer error messages in console.error()
- Include entity type in error messages (e.g., "Шаблон не найден")
- Return error objects with `error` field: `{ error: "message" }`

### Data Validation Patterns

Validation occurs at multiple levels throughout the backend.

**Required Field Validation**:
```javascript
if (!payload.template_name || !payload.template_name.trim()) {
  res.status(400).json({ error: "Назва шаблону обов'язкова" });
  return;
}
```

**Type Validation**:
```javascript
// Query parameter validation
const type = req.query.type;
if (type !== 'current' && type !== 'month') {
  res.status(400).json({ error: 'Query parameter "type" must be "current" or "month"' });
  return;
}
```

**JSON Parsing Validation**:
```javascript
let filters = [];
if (req.query.filters) {
  try {
    filters = JSON.parse(req.query.filters);
  } catch (err) {
    console.error('Invalid filters JSON:', err);
    res.status(400).json({ error: 'Invalid filters JSON' });
    return;
  }
}
```

**Field Schema Validation**:
- Fields_schema.csv defines allowed values for select fields
- field_options column contains pipe-delimited values (e.g., "value1|value2|value3")
- Schema loaded at startup and used for validation

**Data Normalization**:
```javascript
function normalizeEmployeeInput(payload) {
  const input = payload && typeof payload === "object" ? payload : {};
  return normalizeRows(getEmployeeColumnsSync(), [input])[0];
}
```

### Joining Data from Multiple CSV Files

Data from different CSV files is often combined in memory to create complete responses.

**Dashboard Stats Pattern** (joining employees with schema):
```javascript
export async function getDashboardStats() {
  const employees = await loadEmployees();
  const schema = await loadFieldsSchema();

  // Find employment_status field definition from schema
  const statusField = schema.find(f => f.field_name === 'employment_status');
  const options = statusField?.field_options?.split('|') || [];

  // Count employees by status
  const statusCounts = options.map(opt => ({
    label: opt,
    count: employees.filter(e => e.employment_status === opt).length
  }));

  return { total: employees.length, statusCounts };
}
```

**Document History Pattern** (joining documents with employees and templates):
```javascript
export async function loadDocumentHistory() {
  const documents = await loadGeneratedDocuments();
  const employees = await loadEmployees();
  const templates = await loadTemplates();

  // Create lookup maps for efficient joining
  const employeeMap = new Map(employees.map(e => [e.employee_id, e]));
  const templateMap = new Map(templates.map(t => [t.template_id, t]));

  // Join data
  return documents.map(doc => ({
    ...doc,
    employee: employeeMap.get(doc.employee_id),
    template: templateMap.get(doc.template_id)
  }));
}
```

**Key Patterns**:
- Load all required CSV files in parallel when possible
- Create Map objects for O(1) lookup when joining
- Filter active records (active='yes') before joining
- Preserve original data structure, add joined fields as nested objects

### DOCX Generation Pattern

Document generation uses docxtemplater to replace placeholders in DOCX templates.

**Core Functions** (from docx-generator.js):

**Generate Document**:
```javascript
export async function generateDocx(templatePath, data, outputPath) {
  // Read template file
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  // Initialize docxtemplater
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Prepare data with null handling and special placeholders
  const preparedData = prepareData(data);

  // Render document
  doc.render(preparedData);

  // Generate output buffer
  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  // Write to file
  fs.writeFileSync(outputPath, buf);
}
```

**Data Preparation**:
```javascript
function prepareData(data) {
  const prepared = {};

  // Handle user-provided data (null safety)
  for (const key in data) {
    const value = data[key];
    prepared[key] = (value === null || value === undefined) ? '' : String(value);
  }

  // Add special placeholders
  const now = new Date();
  prepared.current_date = `${day}.${month}.${year}`;  // DD.MM.YYYY
  prepared.current_datetime = `${day}.${month}.${year} ${hours}:${minutes}`;  // DD.MM.YYYY HH:MM

  return prepared;
}
```

**Usage Pattern in API Routes**:
```javascript
app.post("/api/templates/:id/generate", async (req, res) => {
  // Load template metadata
  const template = await loadTemplate(templateId);

  // Load employee data
  const employee = await loadEmployee(employeeId);

  // Generate unique filename
  const sanitizedName = template.template_name.replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/g, '_');
  const sanitizedLastName = (employee.last_name || '').replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/g, '_');
  const outputFilename = `${sanitizedName}_${sanitizedLastName}_${employeeId}_${timestamp}.docx`;
  const outputPath = path.join(FILES_DIR, 'documents', outputFilename);

  // Generate DOCX
  await generateDocx(templatePath, employee, outputPath);

  // Save generation record to generated_documents.csv
  await addGeneratedDocument({
    template_id: templateId,
    employee_id: employeeId,
    filename: outputFilename,
    generated_at: new Date().toISOString(),
    data_snapshot: JSON.stringify(employee)
  });
});
```

### Placeholder Extraction and Replacement

Placeholders are extracted from DOCX templates and validated against employee schema.

**Extract Placeholders**:
```javascript
export async function extractPlaceholders(templatePath) {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  // Use Docxtemplater's getFullText() to get merged plain text.
  // This handles cases where Word splits {placeholder} across multiple XML runs.
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  const fullText = doc.getFullText();

  // Extract placeholders using regex on merged text
  const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;
  const placeholders = new Set();
  let match;

  while ((match = placeholderRegex.exec(fullText)) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders).sort();
}
```

**Usage in Template Upload**:
```javascript
app.post("/api/templates/:id/upload", templateUpload.single('file'), async (req, res) => {
  // Extract placeholders from uploaded DOCX
  const placeholders = await extractPlaceholders(req.file.path);

  // Update template metadata with placeholder list
  template.placeholder_fields = placeholders.join(',');
  await saveTemplates(templates);

  res.json({ template, placeholders });
});
```

**Placeholder Types**:
- Employee fields: Any field from fields_schema.csv (e.g., {full_name}, {birth_date})
- Special placeholders: {current_date}, {current_datetime}
- Custom text: Any alphanumeric placeholder is allowed, replaced with empty string if not found

**Placeholder Naming Rules**:
- Must match regex: /\{([a-zA-Z0-9_]+)\}/
- Case-sensitive matching
- Underscores allowed, hyphens not
- Must be wrapped in curly braces in DOCX template

---

## Frontend Patterns

This section documents common code patterns and conventions used throughout the Vue.js frontend application.

### Vue.js 3 Composition API Usage

The application uses Vue.js 3 with the Composition API and script setup syntax for all components.

**Component Structure Pattern**:
```vue
<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { api } from "./api";

const router = useRouter();
const route = useRoute();

// Reactive state
const employees = ref([]);
const loading = ref(false);
const errorMessage = ref("");

// Computed properties
const currentView = computed(() => route.name);

// Watchers
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadEmployee(newId);
  }
});

// Lifecycle hooks
onMounted(async () => {
  await loadData();
});

// Methods
async function loadData() {
  loading.value = true;
  try {
    const response = await api.getEmployees();
    employees.value = response.employees;
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="container">
    <!-- Template content -->
  </div>
</template>
```

**Key Conventions**:
- Use `ref()` for primitive reactive state
- Use `computed()` for derived state
- Use `watch()` for side effects on state changes
- Async/await for all API calls
- Try/catch/finally for error handling with loading states
- Arrow functions for reactive dependencies in watch/computed

### Application Routing Structure

The application uses Vue Router 5 with history mode for SPA navigation. Each route maps to a dedicated view component in `client/src/views/`.

**Routes Configuration** (from main.js):
```javascript
import DashboardView from "./views/DashboardView.vue";
import EmployeeCardsView from "./views/EmployeeCardsView.vue";
import TableView from "./views/TableView.vue";
import ReportsView from "./views/ReportsView.vue";
import ImportView from "./views/ImportView.vue";
import TemplatesView from "./views/TemplatesView.vue";
import DocumentHistoryView from "./views/DocumentHistoryView.vue";
import DocumentsView from "./views/DocumentsView.vue";
import SystemSettingsView from "./views/SystemSettingsView.vue";
import PlaceholderReferenceView from "./views/PlaceholderReferenceView.vue";
import LogsView from "./views/LogsView.vue";

const routes = [
  { path: "/", name: "dashboard", component: DashboardView },
  { path: "/cards/:id?", name: "cards", component: EmployeeCardsView },
  { path: "/table", name: "table", component: TableView },
  { path: "/reports", name: "reports", component: ReportsView },
  { path: "/documents", name: "documents", component: DocumentsView },
  { path: "/system-settings", name: "system-settings", component: SystemSettingsView },
  { path: "/placeholder-reference/:employeeId?", name: "placeholder-reference", component: PlaceholderReferenceView },
  // Legacy routes for backwards compatibility:
  { path: "/import", name: "import", component: ImportView },
  { path: "/templates", name: "templates", component: TemplatesView },
  { path: "/document-history", name: "document-history", component: DocumentHistoryView },
  { path: "/logs", name: "logs", component: LogsView }
];
```

**View Components**:
Each view is a standalone Vue component with its own state and methods:
- `DashboardView.vue` - Dashboard with statistics and notifications
- `EmployeeCardsView.vue` - Employee card-based editing interface with optional employee ID parameter, includes employee list search and within-card field search
- `TableView.vue` - Employee list in table format with sorting and filtering
- `ReportsView.vue` - Custom reports with dynamic filters
- `ImportView.vue` - CSV import interface for bulk employee operations
- `TemplatesView.vue` - Document template management (also embedded in DocumentsView)
- `DocumentHistoryView.vue` - History of all generated documents with pagination (also embedded in DocumentsView)
- `DocumentsView.vue` - Tabbed container combining TemplatesView and DocumentHistoryView (main navigation tab)
- `SystemSettingsView.vue` - Tabbed container combining ImportView and LogsView (accessed via dropdown menu)
- `PlaceholderReferenceView.vue` - Placeholder reference guide with preview values
- `LogsView.vue` - Audit log viewer with pagination (also embedded in SystemSettingsView)

**View Component Pattern**:
```vue
// client/src/views/LogsView.vue
<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api";

// View-specific state
const logs = ref([]);
const logsLoading = ref(false);
const logsOffset = ref(0);
const logsLimit = ref(100);
const logsTotal = ref(0);

// View-specific methods
async function loadLogs() {
  logsLoading.value = true;
  try {
    const response = await api.getLogs({ offset: logsOffset.value, limit: logsLimit.value });
    logs.value = response.logs;
    logsTotal.value = response.total;
  } catch (err) {
    console.error('Failed to load logs:', err);
  } finally {
    logsLoading.value = false;
  }
}

onMounted(() => {
  loadLogs();
});
</script>

<template>
  <div class="logs-view">
    <!-- View-specific template -->
  </div>
</template>
```

**Navigation Patterns**:
```javascript
// Programmatic navigation
router.push({ name: 'cards', params: { id: employeeId } });

// Route parameter access
const employeeId = route.params.id;

// Route name access
const currentView = computed(() => route.name);

// Navigation with query parameters
router.push({ name: 'document-history', query: { employee_id: id } });
```

**Navigation Guards**:
- Navigation guards are handled within individual view components (see EmployeeCardsView.vue)
- beforeRouteLeave checks for unsaved changes when leaving cards view
- Prompts user confirmation before discarding unsaved data
- Supports pending navigation that executes after user confirms

### API Client Pattern

The application uses a centralized API client module (api.js) with fetch-based requests.

**API Client Structure**:
```javascript
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  if (!response.ok) {
    let text = '';
    try {
      text = await response.text();
    } catch (err) {
      // Ignore text extraction errors
    }
    throw new Error(text || `Request failed: ${response.status}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export const api = {
  getEmployees() {
    return request("/employees");
  },
  createEmployee(payload) {
    return request("/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  },
  // ... more methods
};
```

**Usage Pattern in Components**:
```javascript
import { api } from "./api";

async function saveEmployee() {
  saving.value = true;
  try {
    if (selectedId.value) {
      await api.updateEmployee(selectedId.value, form);
    } else {
      const response = await api.createEmployee(form);
      selectedId.value = response.employee.employee_id;
    }
    await loadEmployees();
    errorMessage.value = "";
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    saving.value = false;
  }
}
```

**Key Features**:
- Centralized error handling in request() function
- Automatic JSON parsing for successful responses
- 204 No Content handled explicitly
- Environment-based BASE_URL configuration
- Consistent error throwing with response text

### Composables for Shared Logic

The application uses composables (reusable functions following the Composition API pattern) to share logic between multiple view components.

**Composable Location**: `client/src/composables/`

**useFieldsSchema.js** - Field schema loading and utilities:
```javascript
// client/src/composables/useFieldsSchema.js
import { ref } from "vue";
import { api } from "../api";

export function useFieldsSchema() {
  const allFieldsSchema = ref([]);
  const fieldGroups = ref([]);

  async function loadSchema() {
    const response = await api.getFieldsSchema();
    allFieldsSchema.value = response.fields.map(field => ({
      key: field.field_name,
      label: field.field_label,
      type: field.field_type,
      options: field.field_options?.split('|') || [],
      group: field.field_group,
      required: field.required === 'yes'
    }));

    fieldGroups.value = response.groups;
  }

  function getFieldType(fieldName) {
    const field = allFieldsSchema.value.find(f => f.key === fieldName);
    return field?.type || 'text';
  }

  function getFieldLabel(fieldName) {
    const field = allFieldsSchema.value.find(f => f.key === fieldName);
    return field?.label || fieldName;
  }

  return {
    allFieldsSchema,
    fieldGroups,
    loadSchema,
    getFieldType,
    getFieldLabel
  };
}
```

**Used by**: ReportsView, EmployeeCardsView, TableView, PlaceholderReferenceView

**useEmployeeForm.js** - Employee form state and dirty tracking:
```javascript
// client/src/composables/useEmployeeForm.js
import { ref, computed } from "vue";

export function useEmployeeForm(allFieldsSchema, employeeFields, fieldLabels) {
  const form = ref({});
  const savedFormSnapshot = ref(null);

  const isFormDirty = computed(() => {
    if (!savedFormSnapshot.value) return false;

    for (const key of employeeFields) {
      const currentValue = form.value[key] || '';
      const savedValue = savedFormSnapshot.value[key] || '';
      if (currentValue !== savedValue) {
        return true;
      }
    }
    return false;
  });

  const changedFields = computed(() => {
    if (!savedFormSnapshot.value || !isFormDirty.value) return [];

    const changes = [];
    for (const key of employeeFields) {
      const currentValue = form.value[key] || '';
      const savedValue = savedFormSnapshot.value[key] || '';
      if (currentValue !== savedValue) {
        changes.push({
          key,
          oldValue: savedValue,
          newValue: currentValue
        });
      }
    }
    return changes;
  });

  function updateFormSnapshot() {
    savedFormSnapshot.value = { ...form.value };
  }

  function resetForm() {
    form.value = { ...savedFormSnapshot.value };
  }

  return {
    form,
    savedFormSnapshot,
    isFormDirty,
    changedFields,
    updateFormSnapshot,
    resetForm
  };
}
```

**Used by**: EmployeeCardsView (for unsaved changes warning and dirty state tracking)

**Additional Composables** (extracted from view components):

| Composable | Extracted From | Purpose |
|------------|---------------|---------|
| `useEmployeePhoto.js` | EmployeeCardsView | Photo upload, display with cache-busting, delete |
| `useEmployeeDocuments.js` | EmployeeCardsView | Document upload/delete, date editing, expiry checking |
| `useStatusManagement.js` | EmployeeCardsView | Status event scheduling (add/edit/delete events), inline row editing state, status history popup |
| `useDocumentGeneration.js` | EmployeeCardsView | Template list loading, document generation trigger |
| `useDismissedEvents.js` | DashboardView | localStorage-based notification dismissal |
| `useDashboardNotifications.js` | DashboardView | All 4 notification types (status, birthday, retirement, doc expiry) |
| `useDashboardStats.js` | DashboardView | Dashboard stat cards, employee count by status |
| `useDashboardTimeline.js` | DashboardView | Timeline events loading and formatting |
| `useDashboardReport.js` | DashboardView | Report toggle (current/month), absent/status-change counts |
| `useCustomReport.js` | ReportsView | Filter builder, report execution, sorting, CSV export |
| `useTemplatesManagement.js` | TemplatesView | Template CRUD operations (list, create, edit, delete) |
| `useTemplateUpload.js` | TemplatesView | DOCX file upload modal and file handling |
| `useTableInlineEdit.js` | TableView | Inline cell editing (start, save, cancel) |
| `useTableColumnFilters.js` | TableView | Column checkbox filters (toggle, clear, count) |
| `useReprimands.js` | EmployeeCardsView | Reprimands/commendations CRUD popup (add, edit, delete records) |

**Dependency Injection Pattern**:
Composables receive external dependencies via function parameters rather than importing them internally. This keeps composables testable and decoupled. The parent view wires composables together:
```javascript
// View wires composables together
const { allFieldsSchema, getFieldType } = useFieldsSchema();
const { customFilters, runCustomReport } = useCustomReport(allFieldsSchema, documentFields, getFieldType);
```

**Composable Pattern Benefits**:
- Reusable logic across multiple views
- Testable in isolation
- Follows Vue 3 Composition API conventions
- Clear separation of concerns (data fetching, state management, business logic)
- Type-safe with proper return signatures
- Dependencies injected via parameters for decoupling

### Form Validation and Unsaved Changes Warning

The application implements comprehensive form change tracking and user warnings.

**Form State Tracking**:
```javascript
// Form snapshot for dirty checking
const savedFormSnapshot = ref(null);

// Computed dirty state
const isFormDirty = computed(() => {
  if (!savedFormSnapshot.value) return false;

  // Compare current form with saved snapshot
  for (const key of employeeFields) {
    const currentValue = form[key] || '';
    const savedValue = savedFormSnapshot.value[key] || '';
    if (currentValue !== savedValue) {
      return true;
    }
  }
  return false;
});

// Track which fields changed
const changedFields = computed(() => {
  if (!savedFormSnapshot.value || !isFormDirty.value) return [];

  const changes = [];
  for (const key of employeeFields) {
    const currentValue = form[key] || '';
    const savedValue = savedFormSnapshot.value[key] || '';
    if (currentValue !== savedValue) {
      const field = allFieldsSchema.value.find(f => f.key === key);
      changes.push({
        key,
        label: field?.label || key,
        oldValue: savedValue,
        newValue: currentValue
      });
    }
  }
  return changes;
});
```

**Unsaved Changes Protection**:
```javascript
// Navigation guard (in router.beforeEach)
router.beforeEach((to, from, next) => {
  if (from.name === 'cards' && to.name !== 'cards' && isFormDirty.value) {
    pendingNavigation.value = to;
    showUnsavedChangesPopup.value = true;
    next(false); // Block navigation
  } else {
    next(); // Allow navigation
  }
});

// Browser refresh/close warning
window.addEventListener('beforeunload', (e) => {
  if (isFormDirty.value && route.name === 'cards') {
    e.preventDefault();
    e.returnValue = ''; // Chrome requires returnValue to be set
  }
});

// Watch route params for employee switching
watch(() => route.params.id, (newId) => {
  if (route.name === 'cards' && newId && newId !== selectedId.value) {
    if (isFormDirty.value) {
      pendingNavigation.value = { name: 'cards', params: { id: newId } };
      showUnsavedChangesPopup.value = true;
      return;
    }
    loadEmployee(newId);
  }
});
```

**Snapshot Management**:
```javascript
// Save snapshot after successful save or load
function updateFormSnapshot() {
  savedFormSnapshot.value = { ...form };
}

// Called after:
// - Employee loaded from server
// - Employee successfully saved
// - User discards changes
```

### Modal/Popup Patterns

The application uses custom modal overlays for dialogs and confirmations.

**Modal Structure Pattern**:
```vue
<template>
  <!-- Modal trigger -->
  <button @click="showUploadTemplateModal = true">Upload Template</button>

  <!-- Modal overlay -->
  <div v-if="showUploadTemplateModal" class="vacation-notification-overlay" @click="closeUploadTemplateModal">
    <div class="vacation-notification-modal" @click.stop>
      <div class="vacation-notification-header">
        <h3>Upload Template File</h3>
        <button class="close-btn" @click="closeUploadTemplateModal">&times;</button>
      </div>

      <form @submit.prevent="handleUploadTemplate">
        <div class="form-group">
          <label>DOCX File:</label>
          <input type="file" accept=".docx" required />
        </div>

        <div class="button-group">
          <button type="submit" class="primary">Upload</button>
          <button type="button" class="secondary" @click="closeUploadTemplateModal">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
const showUploadTemplateModal = ref(false);

function closeUploadTemplateModal() {
  showUploadTemplateModal.value = false;
}

async function handleUploadTemplate(event) {
  // Process upload
  await uploadTemplate(formData);
  closeUploadTemplateModal();
}
</script>
```

**Common Modal Types**:
- Template upload modal: File upload for DOCX templates
- Document generation modal: Employee selection and custom data input
- Unsaved changes confirmation: Warning before discarding form changes
- Delete confirmation: Confirmation before soft delete operations

**Modal Patterns**:
- Overlay with click-to-close background (vacation-notification-overlay)
- Card with click.stop to prevent close (vacation-notification-modal)
- Close button in header (&times; character)
- Form submission with @submit.prevent
- Cancel button to close without action
- Modal state tracked with ref boolean

### Tabbed Container Pattern

The application uses tabbed container components to organize related views into sub-sections. This pattern is used for DocumentsView and SystemSettingsView.

**Container Component Structure**:
```vue
<script setup>
import { ref } from "vue";
import ChildViewA from "./ChildViewA.vue";
import ChildViewB from "./ChildViewB.vue";

const activeTab = ref('tab-a');

function switchTab(tab) {
  activeTab.value = tab;
}
</script>

<template>
  <div class="container-view">
    <div class="tabs-header">
      <button
        :class="['tab-btn', { active: activeTab === 'tab-a' }]"
        @click="switchTab('tab-a')"
      >
        Tab A Label
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'tab-b' }]"
        @click="switchTab('tab-b')"
      >
        Tab B Label
      </button>
    </div>

    <ChildViewA v-if="activeTab === 'tab-a'" />
    <ChildViewB v-else-if="activeTab === 'tab-b'" />
  </div>
</template>
```

**Usage Examples**:

**DocumentsView** (main tab in navigation):
- Combines TemplatesView and DocumentHistoryView
- Two sub-tabs: "Шаблони" and "Історія документів"
- Accessible via Documents tab in main navigation

**SystemSettingsView** (dropdown menu):
- Combines ImportView and LogsView
- Two sub-tabs: "Імпорт" and "Логи"
- Accessible via three-dots dropdown menu in top-right corner

**Benefits**:
- Reduces main navigation clutter
- Groups related functionality logically
- Reuses existing view components without modification
- Maintains component isolation and testability

### Table Filtering and Pagination Patterns

The application implements client-side and server-side filtering with pagination.

**Client-Side Filtering** (for small datasets):
```javascript
// Search term filter
const searchTerm = ref("");

const filteredEmployees = computed(() => {
  if (!searchTerm.value) return employees.value;

  const term = searchTerm.value.toLowerCase();
  return employees.value.filter(emp => {
    return employeeFields.some(field => {
      const value = emp[field] || '';
      return String(value).toLowerCase().includes(term);
    });
  });
});
```

**Advanced Filter Builder** (for reports):
```javascript
// Filter structure
const customFilters = ref([
  {
    field: 'employment_status',
    condition: 'contains',
    value: 'Працює',
    value2: '' // For date_range condition
  }
]);

// Dynamic condition options based on field type
const filterConditionOptions = (filter) => {
  const fieldType = getFieldType(filter.field);

  if (fieldType === 'number') {
    return [
      { value: 'greater_than', label: 'Більше ніж' },
      { value: 'less_than', label: 'Менше ніж' },
      { value: 'equals', label: 'Дорівнює' }
    ];
  }

  if (fieldType === 'date') {
    return [
      { value: 'date_range', label: 'Період від-до' },
      { value: 'empty', label: 'Порожнє' }
    ];
  }

  // Default text filters
  return [
    { value: 'contains', label: 'Містить' },
    { value: 'not_contains', label: 'Не містить' },
    { value: 'empty', label: 'Порожнє' }
  ];
};
```

**Pagination Pattern** (document history):
```javascript
const documentHistoryOffset = ref(0);
const documentHistoryLimit = ref(50);
const documentHistoryTotal = ref(0);

async function loadDocumentHistory() {
  const response = await api.getGeneratedDocuments({
    template_id: templateIdFilter.value,
    employee_id: employeeIdFilter.value,
    start_date: startDateFilter.value,
    end_date: endDateFilter.value,
    offset: documentHistoryOffset.value,
    limit: documentHistoryLimit.value
  });

  generatedDocuments.value = response.documents;
  documentHistoryTotal.value = response.total;
}

// Pagination controls
function nextPage() {
  if (documentHistoryOffset.value + documentHistoryLimit.value < documentHistoryTotal.value) {
    documentHistoryOffset.value += documentHistoryLimit.value;
    loadDocumentHistory();
  }
}

function prevPage() {
  if (documentHistoryOffset.value > 0) {
    documentHistoryOffset.value = Math.max(0, documentHistoryOffset.value - documentHistoryLimit.value);
    loadDocumentHistory();
  }
}
```

**Server-Side Filtering**:
- Filters serialized to JSON and sent as query parameters
- Server applies filters and returns matching subset
- Total count returned for pagination UI
- Offset/limit parameters for pagination

### Dynamic Field Schema Loading

The application loads field schema from the backend to dynamically render forms and filters.

**Schema Loading Pattern**:
```javascript
const allFieldsSchema = ref([]);
const fieldGroups = ref([]);

async function loadSchema() {
  const response = await api.getFieldsSchema();

  // Store all fields
  allFieldsSchema.value = response.fields.map(field => ({
    key: field.field_name,
    label: field.field_label,
    type: field.field_type,
    options: field.field_options?.split('|') || [],
    group: field.field_group,
    required: field.required === 'yes'
  }));

  // Group fields for form layout
  fieldGroups.value = response.groups;
}
```

**Dynamic Form Rendering**:
```vue
<template>
  <div v-for="group in fieldGroups" :key="group.name" class="form-section">
    <h4>{{ group.label }}</h4>

    <div class="form-grid">
      <div v-for="field in group.fields" :key="field.key" class="form-group">
        <label>{{ field.label }}</label>

        <!-- Text input -->
        <input v-if="field.type === 'text'" v-model="form[field.key]" type="text" />

        <!-- Select dropdown -->
        <select v-else-if="field.type === 'select'" v-model="form[field.key]">
          <option value="">— Виберіть —</option>
          <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
        </select>

        <!-- Date input -->
        <input v-else-if="field.type === 'date'" v-model="form[field.key]" type="date" />

        <!-- File upload -->
        <div v-else-if="field.type === 'file'">
          <input type="file" @change="handleFileUpload($event, field.key)" />
          <a v-if="form[field.key]" :href="getFileUrl(field.key)" target="_blank">View</a>
        </div>
      </div>
    </div>
  </div>
</template>
```

**Schema-Based Utilities**:
```javascript
// Get field type by name
const getFieldType = (fieldName) => {
  const field = allFieldsSchema.value.find(f => f.key === fieldName);
  return field?.type || 'text';
};

// Get field label by name
const getFieldLabel = (fieldName) => {
  const field = allFieldsSchema.value.find(f => f.key === fieldName);
  return field?.label || fieldName;
};

// Get select options by field name
const getFieldOptions = (fieldName) => {
  const field = allFieldsSchema.value.find(f => f.key === fieldName);
  return field?.options || [];
};
```

**Benefits**:
- Single source of truth for field definitions (fields_schema.csv)
- No hardcoded field lists in frontend (except fallback)
- Automatic UI updates when schema changes
- Type-aware filtering and validation

### Theme Management (Dark/Light Mode)

The application supports dark and light themes with persistent user preference via localStorage.

**State Management**:
```javascript
// Theme state loaded from localStorage with fallback to 'light'
const currentTheme = ref(localStorage.getItem('theme') || 'light');

// Apply theme on mount
onMounted(() => {
  document.documentElement.setAttribute('data-theme', currentTheme.value);
});

// Toggle function
function toggleTheme() {
  const newTheme = currentTheme.value === 'light' ? 'dark' : 'light';
  currentTheme.value = newTheme;
  localStorage.setItem('theme', newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
}
```

**CSS Variables Pattern** (in styles.css):
- Light theme: default CSS custom properties in `:root` (--bg, --text, --accent, etc.)
- Dark theme: overrides via `[data-theme="dark"]` selector
- All components reference CSS variables for colors, backgrounds, borders
- CSS transitions on `background-color` and `color` for smooth theme switching

**Theme Toggle Button**: Located in topbar, uses sun/moon emoji icons to indicate current state.

### Search Capabilities

The application provides three levels of search functionality to help users find information quickly.

#### Global Search

Searches across employees, templates, and documents simultaneously from the header.

**Frontend Pattern**:
```javascript
const globalSearchTerm = ref("");
const globalSearchResults = ref({ employees: [], templates: [], documents: [] });
const showGlobalSearchResults = ref(false);

// Debounced search via watch
watch(() => globalSearchTerm.value, (newTerm) => {
  if (newTerm.trim().length < SEARCH_MIN_LENGTH) {
    showGlobalSearchResults.value = false;
    return;
  }
  globalSearchTimeout = setTimeout(() => {
    performGlobalSearch(newTerm);
  }, SEARCH_DEBOUNCE_MS);
});

async function performGlobalSearch(query) {
  const result = await api.globalSearch(query);
  globalSearchResults.value = result;
  showGlobalSearchResults.value = true;
}
```

**UI Components**:
- Search input in topbar (after brand, before tab-bar)
- Dropdown results panel positioned absolutely below input
- Results grouped by type: Співробітники, Шаблони, Документи
- Click handlers: employees navigate to cards view, templates to documents view, documents download
- Outside click handler closes dropdown
- Minimum 2 characters required (SEARCH_MIN_LENGTH constant)
- 300ms debounce delay (SEARCH_DEBOUNCE_MS constant)

#### Employee List Search (Cards View)

Filters the employee list in the sidebar of the Cards view.

**Pattern**:
```javascript
const cardSearchTerm = ref("");

const filteredEmployeesForCards = computed(() => {
  if (!cardSearchTerm.value) return employees.value;

  const term = cardSearchTerm.value.toLowerCase();
  return employees.value.filter(emp => {
    // Search across key fields
    return [
      emp.last_name,
      emp.first_name,
      emp.middle_name,
      emp.employee_id,
      emp.employment_status
    ].some(field => String(field || '').toLowerCase().includes(term));
  });
});
```

**UI**:
- Search input at top of employee list sidebar
- Real-time filtering (no debounce needed for client-side search)
- Case-insensitive substring matching
- Searches: last_name, first_name, middle_name, employee_id, employment_status

#### Within-Card Field Search

Filters visible form fields within the current employee card based on field labels and values.

**Pattern**:
```javascript
const cardFieldSearchTerm = ref("");

const filteredFieldGroups = computed(() => {
  if (!cardFieldSearchTerm.value) return fieldGroups.value;

  const term = cardFieldSearchTerm.value.toLowerCase();
  return fieldGroups.value.map(group => ({
    ...group,
    fields: group.fields.filter(field => {
      const labelMatch = field.label.toLowerCase().includes(term);
      const valueMatch = String(form.value[field.key] || '').toLowerCase().includes(term);
      return labelMatch || valueMatch;
    })
  })).filter(group => group.fields.length > 0);
});
```

**UI**:
- Search input in employee card section (above field groups)
- Filters fields by both label (from schema) and current value (from form)
- Useful for finding specific fields in large employee forms
- Clear button to reset filter

### Bootstrap UI Components Usage

The application uses Bootstrap 5 utility classes and custom CSS for styling.

**Common Bootstrap Patterns**:

**Buttons**:
```vue
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary">Secondary Action</button>
<button class="btn btn-danger">Delete</button>
```

**Cards**:
```vue
<div class="card">
  <div class="card-header">
    <h3>Card Title</h3>
  </div>
  <div class="card-body">
    <p>Card content</p>
  </div>
</div>
```

**Forms**:
```vue
<div class="form-group">
  <label for="field">Field Label</label>
  <input id="field" class="form-control" type="text" v-model="form.field" />
</div>

<div class="form-grid">
  <!-- Multiple form-group elements in grid layout -->
</div>
```

**Tables**:
```vue
<table class="table table-striped table-hover">
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="item in items" :key="item.id">
      <td>{{ item.col1 }}</td>
      <td>{{ item.col2 }}</td>
    </tr>
  </tbody>
</table>
```

**Custom CSS Extensions**:
- `vacation-notification-overlay`: Full-screen modal overlay with semi-transparent background
- `vacation-notification-modal`: Centered modal card with white background and shadow
- `form-grid`: Responsive grid layout for form fields (2-3 columns)
- `button-group`: Horizontal button layout with spacing
- `card-header`: Custom header styling with flex layout

**Responsive Design**:
- Bootstrap grid system used for layout
- Custom media queries for mobile-specific adjustments
- Form grids collapse to single column on mobile
- Tables use horizontal scroll on small screens

---

## Testing

The application uses a two-tier testing strategy: E2E tests with Playwright for user-facing workflows, and unit/integration tests with Node.js native test runner for backend business logic.

### Testing Approach

The project follows a regular testing approach:

1. **Write Code First**: Implement the feature or fix the bug
2. **Write Tests**: Create tests to verify the implementation
3. **Validate**: Run all tests to ensure nothing is broken
4. **Commit**: Only commit when all tests pass

**Critical Rule**: All tests must pass before marking a task as complete or moving to the next task. If tests fail, fix the issues before proceeding.

### E2E Testing with Playwright

End-to-end tests validate complete user workflows across the full stack (database, backend API, frontend UI).

**Location**: `tests/e2e/`

**Test Files**:
- `setup.spec.js`: Server connectivity and basic API response tests
- `employee-crud.spec.js`: Employee create, read, update operations
- `table-filters.spec.js`: Table search and filtering functionality
- `reports.spec.js`: Custom report generation with filters
- `import.spec.js`: CSV import workflow
- `dashboard.spec.js`: Dashboard statistics and notifications
- `status-retirement.spec.js`: Employment status changes and retirement processing
- `logs.spec.js`: Audit log viewing and filtering
- `birth-date-validation.spec.js`: Form validation for birth dates
- `documents.spec.js`: Employee document upload and viewing
- `templates-crud.spec.js`: Template create, read, update, delete operations
- `templates-upload.spec.js`: Template DOCX file upload and placeholder extraction
- `templates-generation.spec.js`: Document generation from templates
- `document-history.spec.js`: Document history viewing with filters
- `templates-modal-simple.spec.js`: Template modal UI interactions
- `theme-toggle.spec.js`: Dark/light theme toggle and persistence
- `card-search.spec.js`: Employee card search filtering
- `global-search.spec.js`: Global search UI and navigation
- `employee-photo.spec.js`: Employee photo upload, display, and delete
- `status-history.spec.js`: Status history popup open, display, and close
- `reprimands.spec.js`: Reprimands and commendations popup UI interactions, CRUD operations
- `status-events.spec.js`: Status event scheduling: add immediate/future events, overlap error, delete event, status revert

**Configuration** (`playwright.config.js`):
- Test directory: `./tests/e2e`
- Sequential execution (workers: 1) for data consistency
- Browser: Chromium (Desktop Chrome)
- Base URL: http://localhost:5173 (client)
- Timeout: 30 seconds per test
- Screenshots on failure
- Trace on first retry
- HTML reporter

**Test Structure Pattern**:
```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
  test('should perform specific action', async ({ page, request }) => {
    // Navigate to page
    await page.goto('http://localhost:5173/route');

    // Interact with UI
    await page.click('button:has-text("Action")');
    await page.fill('input[name="field"]', 'value');

    // Make assertions
    const element = await page.locator('.result');
    await expect(element).toBeVisible();
    await expect(element).toHaveText('Expected Text');
  });

  test('should validate API response', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/endpoint');
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('field');
  });
});
```

**Test Commands**:
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run with browser visible (headed mode)
npm run test:e2e:headed
```

**Prerequisites**:
- Server must be running on http://localhost:3000
- Client must be running on http://localhost:5173
- Use `./run.sh` to start both before running tests

### Unit and Integration Testing

Unit and integration tests focus on backend business logic, API endpoints, and data processing functions.

**Location**: `server/test/`

**Test Files**:
- `config.test.js`: Configuration loading and validation
- `upload-limit.test.js`: File upload size limit enforcement
- `docx-generator.test.js`: DOCX template processing and placeholder replacement
- `declension.test.js`: Ukrainian name and grade/position declension with per-field indeclinable flags
- `templates-api.test.js`: Template API endpoint validation
- `retirement-events.test.js`: Retirement event processing logic
- `retirement-api.test.js`: Retirement API endpoint validation
- `search-api.test.js`: Global search API endpoint validation
- `photo-api.test.js`: Employee photo upload and delete API validation
- `status-history.test.js`: Status history recording and retrieval API validation
- `reprimands-api.test.js`: Reprimands API endpoint validation (GET, POST, PUT, DELETE)
- `reprimands-store.test.js`: Reprimands store functions unit test (loadReprimands, addReprimand, updateReprimand, deleteReprimand, removeReprimandsForEmployee)
- `status-events-store.test.js`: Status events store functions unit test (addStatusEvent, updateStatusEvent, deleteStatusEvent, getActiveEventForEmployee, validateNoOverlap, syncStatusEventsForEmployee)
- `status-events-api.test.js`: Status event API endpoint validation (GET, POST with overlap/400/409, DELETE, auto-sync behavior, PUT with 200/400/403/404/409 and self-overlap exclusion)
- `utils.test.js`: Shared utility function tests

**Test Framework**: Node.js native test runner (no external dependencies)

**Test Structure Pattern**:
```javascript
/**
 * Unit tests for Module Name
 * Run with: node server/test/module.test.js
 */

import { functionToTest } from '../src/module.js';

let testsPassed = 0;
let testsFailed = 0;

// Helper function to run a test
async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`✓ ${name}`);
    testsPassed++;
    return true;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

// Test case
async function testFeatureWorks() {
  const result = await functionToTest(input);

  if (result !== expected) {
    throw new Error(`Expected ${expected}, got ${result}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('Starting tests...\n');

  await runTest('Feature works correctly', testFeatureWorks);
  // ... more tests

  console.log(`\nTests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);

  return testsFailed === 0;
}

// Run tests
runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
```

**Test Commands**:
```bash
# Run unit tests only (no server required)
cd server && npm test

# Run integration tests (requires server on port 3000)
cd server && npm run test:integration

# Run specific test file
node server/test/config.test.js
node server/test/docx-generator.test.js
```

**Unit vs. Integration Test Distinction**:
- **Unit tests** (no server required): config.test.js, upload-limit.test.js, docx-generator.test.js, declension.test.js, retirement-events.test.js, utils.test.js, reprimands-store.test.js, status-events-store.test.js
- **Integration tests** (require running server on port 3000): templates-api.test.js, retirement-api.test.js, search-api.test.js, photo-api.test.js, status-history.test.js, reprimands-api.test.js, status-events-api.test.js
- `npm test` runs only unit tests; `npm run test:integration` runs integration tests
- CI runs unit tests before starting servers, and integration tests after servers are ready

### Test Data Fixtures

**E2E Test Data**:
- E2E tests use the actual `data/` CSV files
- Tests run sequentially (workers: 1) to avoid data conflicts
- Some tests create temporary employees/templates and clean up afterward
- Data state persists between test runs (no automatic cleanup)

**Unit Test Data**:
- Unit tests create temporary fixtures in `server/fixtures/` or `temp/test-output/`
- Fixtures are generated programmatically (e.g., createTestDocx in docx-generator.test.js)
- Cleanup functions remove fixtures after test completion
- Tests are isolated and do not modify production data files

**Fixture Pattern** (from docx-generator.test.js):
```javascript
const TEST_FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

function setup() {
  fs.mkdirSync(TEST_FIXTURES_DIR, { recursive: true });
}

function cleanup() {
  if (fs.existsSync(TEST_FIXTURES_DIR)) {
    fs.rmSync(TEST_FIXTURES_DIR, { recursive: true, force: true });
  }
}

// Create test fixture
function createTestDocx(filePath, placeholders) {
  // Generate minimal valid DOCX file with placeholders
  // ...
}
```

### Test Naming Conventions

**E2E Test Files**:
- Pattern: `feature-name.spec.js`
- Examples: `employee-crud.spec.js`, `templates-generation.spec.js`
- Location: `tests/e2e/`

**Unit Test Files**:
- Pattern: `module-name.test.js`
- Examples: `config.test.js`, `docx-generator.test.js`
- Location: `server/test/`

**Test Case Naming**:
- E2E: Descriptive sentences with "should" (e.g., "should create new employee")
- Unit: Descriptive function names (e.g., "testExtractPlaceholdersSuccess")
- Use clear, specific descriptions that explain what is being tested

### Test Coverage Expectations

**Coverage Target**: 80%+ for critical business logic paths

**Critical Paths** (must be tested):
- Employee CRUD operations
- Template CRUD operations
- Document generation from templates
- Placeholder extraction and replacement
- CSV import and export
- Status change workflows
- Audit logging
- Configuration loading
- File upload limits
- Data validation

**Lower Priority** (optional coverage):
- UI styling and layout
- Error message text
- Console logging
- Static file serving

**Coverage Validation**:
- No automated coverage reports (manual review)
- Test all happy paths and critical error paths
- Test edge cases (null values, empty inputs, invalid data)
- Test security validations (path traversal, file size limits)

---

## API Structure

This section documents the REST API endpoints provided by the Express.js backend. For detailed request/response schemas and examples, see the API Documentation section in README.md.

### API Base URL and Configuration

All API endpoints are served under the `/api` prefix:
- Base URL: `http://localhost:3000/api`
- Configurable port via PORT environment variable (default: 3000)
- CORS enabled for cross-origin requests
- JSON body parser with 10MB limit

### Health Check and Configuration Endpoints

**GET /api/health**
- Health check endpoint for server status
- Returns: `{ status: "ok" }`
- Used by monitoring tools and E2E tests

**GET /api/config**
- Retrieve application configuration settings
- Returns: Configuration object from config.csv
- Fields: max_file_upload_mb, retirement_age_years, max_log_entries, max_report_preview_rows

### Dashboard and Statistics Endpoints

**GET /api/dashboard/stats**
- Get dashboard statistics and metrics
- Returns: Total employees count, status breakdown (Працює, На лікарняному, etc.)
- Used by dashboard view for real-time statistics

**GET /api/dashboard/events**
- Get all dashboard notification events (combined)
- Returns: Array of events with types: birthday, retirement, status_change
- Each event includes: type, employee data, date, days_until (for future events)
- Used by dashboard notifications section

**GET /api/birthday-events**
- Get birthday notification events
- Query parameters:
  - type: 'current' (this month) or 'month' (specific month)
  - month: Month number (1-12, required if type='month')
- Returns: Array of employees with birthdays in specified period
- Each employee includes: birth_date, full_name, days_until

**GET /api/retirement-events**
- Get retirement notification events
- Query parameters: Same as birthday-events
- Returns: Array of employees approaching retirement age
- Each employee includes: retirement_date, full_name, days_until

**GET /api/document-expiry**
- Get document expiry notification events
- Returns: Array of employees with documents expiring soon
- Each employee includes: document field, expiry date, days_until

**GET /api/document-overdue**
- Get overdue document notification events
- Returns: Array of employees with expired documents
- Each employee includes: document field, expiry date, days_overdue

### Reporting Endpoints

**GET /api/reports/statuses**
- Get employment status report
- Returns: Count of employees by employment_status
- Fields: status name, count
- Used by reports view status breakdown

**GET /api/reports/custom**
- Generate custom report with dynamic filters
- Query parameters:
  - filters: JSON array of filter objects
  - limit: Max rows to return (default: 100, max: 1000)
  - preview: Boolean, if true returns limited rows for preview
- Filter object structure:
  - field: Field name from fields_schema.csv
  - condition: 'contains', 'not_contains', 'empty', 'greater_than', 'less_than', 'equals', 'date_range'
  - value: Filter value (string, number, or date)
  - value2: Second value for date_range condition
- Returns: Filtered employee list
- Used by reports view with custom filter builder

### Global Search Endpoint

**GET /api/search**
- Cross-entity search across employees, templates, and documents
- Query parameters:
  - q (required): Search query string (minimum 2 characters)
- Search logic:
  - Employees: searched across all non-file, non-photo text fields from fields_schema.csv
  - Templates: searched by template_name and description
  - Documents: searched by filename, associated employee name, and template name
- Results limited per type: 20 employees, 10 templates, 10 documents
- Returns: Object with:
  - employees: Array of matching employee objects
  - templates: Array of matching template objects
  - documents: Array of matching document objects (with joined employee and template data)
  - total: Object with counts per type { employees, templates, documents }
- 400 if q parameter missing or less than 2 characters
- Used by global search input in header

### Employee CRUD Endpoints

**GET /api/employees**
- List all active employees (active='yes')
- Returns: Array of employee objects with all fields
- Used by table view and employee lists

**GET /api/employees/:id**
- Get single employee by ID
- Returns: Employee object with all fields
- 404 if not found

**POST /api/employees**
- Create new employee
- Request body: Employee object with required fields
- Response: Created employee object with assigned employee_id
- Auto-generates employee_id, creates audit log entry

**PUT /api/employees/:id**
- Update existing employee
- Request body: Employee object with updated fields
- Response: Updated employee object
- Creates audit log entry with field changes
- 404 if not found

**DELETE /api/employees/:id**
- Soft delete employee (set active='no')
- Response: 204 No Content
- Creates audit log entry
- 404 if not found

### Employee File Management Endpoints

**POST /api/employees/:id/files**
- Upload file for specific employee document field
- Request: Multipart form with file and fieldName
- File saved to: `files/employee_{id}/` directory
- Updates employee record with file path
- Creates audit log entry
- Security: Path traversal validation, file size limits
- Returns: Updated employee object

**DELETE /api/employees/:id/files/:fieldName**
- Delete file for specific employee document field
- Removes physical file from disk
- Updates employee record (clears field value)
- Creates audit log entry
- Security: Path traversal validation
- Returns: 204 No Content

**POST /api/employees/:id/photo**
- Upload employee photo (JPG, PNG, GIF, WebP)
- Request: Multipart form with `photo` field
- Saves as `files/employee_{id}/photo.{ext}` (old photo deleted on re-upload)
- Updates employee `photo` field with relative path
- Creates audit log entry
- 404 if employee not found, 400 if no file or invalid type

**DELETE /api/employees/:id/photo**
- Delete employee photo file and clear `photo` field
- 404 if employee not found or no photo exists
- Creates audit log entry

**GET /api/employees/:id/status-history**
- Get employment status change history for employee
- Returns: `{ history: [...] }` sorted by `changed_at` descending (newest first)
- Each entry: history_id, employee_id, old_status, new_status, old_start_date, old_end_date, new_start_date, new_end_date, changed_at, changed_by
- 404 if employee not found

**GET /api/employees/:id/status-events**
- Get scheduled status events for employee
- Returns: `{ events: [...] }` sorted by `start_date` ascending
- Each entry: event_id, employee_id, status, start_date, end_date, created_at, active
- 404 if employee not found

**POST /api/employees/:id/status-events**
- Create a new scheduled status event for employee
- Required fields: status, start_date
- Optional fields: end_date (empty = indefinite)
- Validates no overlap with existing events (409 Conflict if overlap detected)
- If the new event is currently active (today within start_date–end_date range), immediately updates employee status
- Creates audit log entry
- Returns: `{ event: {...}, employee: {...} }` — employee reflects synced status
- 400 if status or start_date missing; 404 if employee not found; 409 if overlap

**PUT /api/employees/:id/status-events/:eventId**
- Update an existing scheduled status event for employee
- Required fields: status, start_date
- Optional fields: end_date (empty = indefinite)
- Validates no overlap with existing events, excluding the event being edited (409 Conflict if overlap detected)
- After update, syncs employee status via syncStatusEventsForEmployee
- Creates audit log entry
- Returns: `{ event: {...}, employee: {...} }` — employee reflects synced status
- 400 if status or start_date missing or invalid; 403 if event belongs to different employee; 404 if employee or event not found; 409 if overlap

**DELETE /api/employees/:id/status-events/:eventId**
- Hard delete a status event
- Syncs employee status after deletion (with forceReset: true — resets to Працює if no remaining events)
- Creates audit log entry
- Returns: 204 No Content
- 404 if employee or event not found; 403 if event belongs to a different employee

**GET /api/employees/:id/reprimands**
- Get reprimands and commendations for employee
- Returns: `{ reprimands: [...] }` sorted by `record_date` descending (newest first)
- Each entry: record_id, employee_id, record_date, record_type, order_number, note, created_at
- 404 if employee not found

**POST /api/employees/:id/reprimands**
- Create new reprimand or commendation record
- Required fields: record_date, record_type
- Optional fields: order_number, note
- Creates audit log entry
- Returns: `{ reprimand: {...} }` with assigned record_id and created_at
- 400 if record_date or record_type missing; 404 if employee not found

**PUT /api/employees/:id/reprimands/:recordId**
- Update existing reprimand or commendation record
- Required fields: record_date, record_type
- Optional fields: order_number, note
- Creates audit log entry
- Returns: `{ reprimand: {...} }` with updated fields
- 400 if validation fails; 404 if employee or record not found; 403 if record belongs to a different employee

**DELETE /api/employees/:id/reprimands/:recordId**
- Hard delete single reprimand or commendation record
- Creates audit log entry
- Returns: 204 No Content
- 404 if employee or record not found; 403 if record belongs to a different employee

**POST /api/employees/:id/open-folder**
- Open employee folder in system file manager
- Creates folder if not exists
- Uses platform-specific command (open/explorer/xdg-open)
- Graceful degradation in headless environments
- Security: Path traversal validation

### Data Import and Export Endpoints

**GET /api/export**
- Export filtered employees to CSV
- Query parameters:
  - filters: JSON array of filter objects (same as /api/reports/custom)
  - format: Export format (currently only 'csv')
- Returns: CSV file download with UTF-8 BOM and semicolon delimiter
- Filename: employees_export_YYYYMMDD_HHMMSS.csv
- Creates audit log entry

**POST /api/employees/import**
- Import employees from CSV file
- Request: Multipart form with CSV file
- Validates CSV structure matches fields_schema.csv
- Creates or updates employees based on employee_id presence
- Creates audit log entries for each operation
- Returns: Summary with created/updated counts
- File size limit from config.csv (max_file_upload_mb)

**GET /api/download/import-template**
- Download CSV template for import
- Returns: CSV file with headers from fields_schema.csv
- Filename: employee_import_template.csv
- Used to ensure correct format for imports

### Field Schema Endpoint

**GET /api/fields-schema**
- Get dynamic field schema for employees
- Returns: Array of field definitions from fields_schema.csv
- Fields grouped by field_group for UI rendering
- Each field includes:
  - field_name: Database column name
  - field_label: Ukrainian display label
  - field_type: Data type (text, select, date, file, photo, textarea, number)
  - field_options: Pipe-delimited options for select fields
  - field_group: Group name for form sections
  - required: 'yes' or 'no'
  - visible_in_card: 'yes' or 'no'
  - visible_in_table: 'yes' or 'no'
- Used by frontend to dynamically render forms and tables

### Template CRUD Endpoints

**GET /api/templates**
- List all active templates (active='yes')
- Returns: Array of template objects
- Fields: template_id, template_name, template_type, description, placeholder_fields, active

**GET /api/templates/:id**
- Get single template by ID
- Returns: Template object with metadata
- 404 if not found

**POST /api/templates**
- Create new template
- Request body: Template object
- Required fields: template_name, template_type
- Auto-generates template_id
- Creates audit log entry
- Returns: Created template object

**PUT /api/templates/:id**
- Update existing template metadata
- Request body: Template object with updated fields
- Creates audit log entry
- Returns: Updated template object
- 404 if not found

**DELETE /api/templates/:id**
- Soft delete template (set active='no')
- Response: 204 No Content
- Creates audit log entry
- 404 if not found

### Template File Management Endpoints

**POST /api/templates/:id/upload**
- Upload DOCX template file
- Request: Multipart form with .docx file
- Validates file extension (.docx only)
- Extracts placeholders from DOCX using docxtemplater
- Saves file as: `files/templates/template_{id}_{timestamp}.docx`
- Updates template metadata with placeholder_fields
- Deletes old template file if exists
- Creates audit log entry
- File size limit from config.csv
- Security: File type validation, path traversal protection
- Returns: Template object with extracted placeholders array

**POST /api/templates/:id/generate**
- Generate DOCX document from template for employee
- Request body:
  - employee_id: Target employee ID
  - custom_data: Optional object with additional placeholder values
- Merges employee data with custom_data
- Replaces placeholders in template DOCX
- Adds special placeholders: {current_date}, {current_datetime}
- Saves generated document to: `files/documents/{TemplateName}_{LastName}_{id}_{timestamp}.docx`
- Records generation in generated_documents.csv with data snapshot
- Creates audit log entry
- Returns: Document object with download URL
- 404 if template or employee not found

### Placeholder Reference Endpoint

**GET /api/placeholder-preview/:employeeId?**
- Get all available placeholders with preview values for a specific employee
- Optional path parameter: employeeId (uses first active employee if omitted)
- Returns: Object with:
  - employee_name: Full name of the selected employee
  - employee_id: ID of the selected employee
  - placeholders: Array of placeholder objects, each with:
    - placeholder: Placeholder syntax (e.g., `{full_name}`)
    - label: Ukrainian display label
    - value: Preview value from the selected employee's data
    - group: Category ('fields', 'declension', 'declension_fields', 'special')
- Groups:
  - 'fields': All fields from fields_schema.csv
  - 'declension': Name declension placeholders (24 items)
  - 'declension_fields': Grade/position declension placeholders (12 items)
  - 'special': Auto-generated placeholders (current_date, current_datetime)
- 404 if specific employeeId not found or no active employees exist
- Used by placeholder reference page

### Document History Endpoints

**GET /api/documents**
- List generated documents with filters and pagination
- Query parameters:
  - template_id: Filter by template ID
  - employee_id: Filter by employee ID
  - start_date: Filter by generation date (from)
  - end_date: Filter by generation date (to)
  - offset: Pagination offset (default: 0)
  - limit: Pagination limit (default: 50, max: 1000)
- Returns: Object with:
  - documents: Array of document objects with joined employee/template data
  - total: Total count of matching documents
- Each document includes:
  - document_id, template_id, employee_id, filename, generated_at
  - data_snapshot: JSON string of employee data at generation time
  - employee: Joined employee object (current data)
  - template: Joined template object
- Used by document history view with pagination

**GET /api/documents/:id/download**
- Download generated document by ID
- Returns: DOCX file download
- Filename from generated_documents.csv record
- Security: Path traversal validation
- 404 if document not found or file missing

### Audit Log Endpoint

**GET /api/logs**
- List audit log entries
- Query parameters:
  - offset: Pagination offset (default: 0)
  - limit: Pagination limit (default: 100, max: 1000)
- Returns: Object with:
  - logs: Array of log entries (newest first)
  - total: Total count of log entries
- Each log entry includes:
  - log_id, timestamp, user, action, entity_type, entity_id, details
- Action types: CREATE, UPDATE, DELETE, IMPORT, EXPORT, GENERATE
- Entity types: employee, template, document, status
- Used by logs view with pagination

### File Management Utility Endpoint

**POST /api/open-data-folder**
- Open data directory in system file manager
- Opens: data/ directory containing CSV files
- Uses platform-specific command (open/explorer/xdg-open)
- Graceful degradation in headless environments
- Security: Path validation to prevent command injection
- Returns: { success: true }

### API Error Handling

All endpoints follow consistent error handling patterns:

**Error Response Format**:
```json
{
  "error": "Error message in Ukrainian for user-facing errors"
}
```

**HTTP Status Codes**:
- 200 OK: Successful GET request
- 201 Created: Successful POST creating new resource
- 204 No Content: Successful DELETE or update with no response body
- 400 Bad Request: Validation errors, missing required fields, invalid input
- 403 Forbidden: Security violations (path traversal, unauthorized access)
- 404 Not Found: Resource not found by ID
- 500 Internal Server Error: Unexpected errors, exceptions

**Validation Patterns**:
- Required field validation (template_name, employee_id, etc.)
- Type validation (date format, numeric fields)
- File type validation (DOCX extension for templates)
- JSON parsing validation (filters parameter)
- Pagination limits enforced (max 1000 rows)
- Path traversal protection on all file operations

### API Documentation Reference

For detailed API endpoint documentation with request/response examples, query parameters, and usage scenarios, see the "API Documentation" section in README.md. The README provides user-facing documentation while this section focuses on internal implementation patterns and route organization.

---

## Development Workflow

This section documents the standard development workflow and practices for working on the CRM Manufacturing System project.

### Running the Application

The application provides scripts for easy startup and shutdown of both server and client components.

**Quick Start** (recommended for development):
```bash
./run.sh
```

This script:
1. Checks for npm installation
2. **Kills processes occupying required ports** (if ports are busy)
3. Installs dependencies if node_modules/ is missing **or if package.json is newer** (new packages added)
4. Initializes config.csv from config.template.csv if not exists
5. Runs CSV template synchronization (sync-template.js)
6. Starts server in watch mode (port 3000)
7. Starts client in development mode (port 5173, strictPort)
8. Runs both services in parallel
9. Handles cleanup on exit (Ctrl+C)

**Production Mode**:
```bash
./run.sh prod
```

**Fixed ports per mode** (no automatic port switching):
- DEV: backend 3000, frontend 5173
- PROD: backend 3001, frontend 5174
- If a port is occupied, the existing process is killed before startup
- Vite uses `strictPort: true` — fails instead of silently switching ports

**Manual Start** (alternative for debugging):
```bash
# Terminal 1 - Start server
cd server
npm install
npm run dev

# Terminal 2 - Start client
cd client
npm install
npm run dev
```

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration, defined in `.github/workflows/tests.yml`.

**Trigger Conditions**:
- Push to `master` or `feature/*` branches
- Pull requests to `master`
- Manual dispatch (workflow_dispatch)

**CI Pipeline Steps**:
1. Checkout code and setup Node.js 18
2. Install dependencies (root, server, client) and Playwright browsers
3. Setup test data: copy template CSVs to working CSVs, create directories
4. Run `sync-template.js` to generate `employees_import_sample.csv`
5. Run unit tests (no server needed)
6. Start backend and frontend servers
7. Wait for servers (with failure detection if servers don't start)
8. Run integration tests (require running server)
9. Run Playwright E2E tests
10. Upload artifacts and server logs on failure; stop servers

**Important**: Template CSV files (`fields_schema.template.csv`, `config.template.csv`) must be tracked in git because CI depends on them to bootstrap test data.

### Stopping the Application

**Quick Stop**:
```bash
./stop.sh
```

This script:
1. Finds processes using ports 3000 (server) and 5173 (client)
2. Terminates both processes
3. Kills orphaned node processes (index.js, vite, node --watch)
4. Provides confirmation messages

**Production Mode Stop**:
```bash
./stop.sh prod
```

Stops services running on production ports (3001, 5174).

**Manual Stop**:
- Ctrl+C in each terminal running server/client
- Or use `lsof -ti:3000 | xargs kill -9` for manual port cleanup

**Cleanup Orphaned Processes**:
If orphaned Node.js processes persist after stop.sh (e.g., from interrupted runs):
```bash
./cleanup-processes.sh
```

This script force-kills all node processes (use with caution - kills ALL node processes on system)

### Development Mode Details

**Server Development Mode**:
- Command: `npm run dev` (runs `node --watch src/index.js`)
- Port: 3000 (configurable via PORT environment variable)
- Features:
  - Automatic restart on file changes (--watch flag)
  - Logs all requests to console
  - CORS enabled for cross-origin requests from client
  - No build step required (ES modules directly executed)

**Client Development Mode**:
- Command: `npm run dev` (runs Vite dev server)
- Port: 5173 (configurable via VITE_PORT environment variable)
- Features:
  - Hot module replacement (instant updates on save)
  - Fast cold start (Vite's native ESM approach)
  - Source maps for debugging
  - Proxy API requests to backend server
  - Accessible at: http://localhost:5173

**Production Build** (client):
```bash
cd client
npm run build
```

Generates optimized production bundle in `client/dist/`.

### Port Configuration

Ports are fixed per mode and cannot be auto-switched:

**Development Ports** (default):
- Server: 3000
- Client: 5173

**Production Ports** (with `./run.sh prod`):
- Server: 3001
- Client: 5174

**Port Conflict Resolution**:
- `run.sh` automatically kills processes occupying required ports before starting
- Vite uses `strictPort: true` — exits with error instead of switching to next port
- Manual cleanup: `./stop.sh` or `lsof -ti:PORT | xargs kill -9`

### Plan-Based Development Approach

This project uses a structured plan-based development workflow:

**Plan Location**:
- Active plans: `docs/plans/`
- Completed plans: `docs/plans/completed/`

**Plan Structure**:

Each plan file follows this structure:

1. **Header**: Title and brief description
2. **Metadata**:
   - Files involved (create/modify/delete)
   - Related patterns (existing code patterns to follow)
   - Dependencies (other plans or features required)
3. **Implementation Approach**:
   - Testing approach (Regular: code first, then tests)
   - High-level strategy
   - Critical constraints or requirements
4. **Tasks**: Broken down into numbered task sections
   - Each task has specific files and steps
   - Steps are checkboxes ([ ] uncompleted, [x] completed)
   - One task section implemented per iteration
5. **Validation**: Manual or automated tests to verify implementation
6. **Completion**: Post-completion checklist (documentation, plan archival)

**Task Completion Workflow**:

1. **Select Plan**: Choose active plan from docs/plans/
2. **Find First Uncompleted Task**: Locate first task section with [ ] checkboxes
3. **Implement Task**:
   - Read plan overview and context
   - Implement ALL checkboxes in current task section
   - Write tests if testing approach requires
4. **Validate**:
   - Run test commands (e.g., npm run test:e2e, cd server && npm test)
   - Fix failures until all tests pass
   - CRITICAL: All tests must pass before proceeding
5. **Complete Task**:
   - Edit plan file: change [ ] to [x] for implemented checkboxes
   - Commit changes with message: `feat: <task description>`
   - If all tasks complete, move plan to docs/plans/completed/
6. **Next Task**: Repeat for next task section with [ ] checkboxes

**Plan Naming Convention**:
- Format: `YYYY-MM-DD-short-description.md`
- Example: `2026-02-10-move-new-employee-button-to-cards-sidebar.md`

**Critical Rules**:
- ONE task section per iteration (do not skip ahead)
- ALL checkboxes in a task must be completed before moving to next task
- ALL tests must pass before marking task complete
- Commit after each task completion (not after each checkbox)
- Mark checkboxes [x] in plan file before committing

### When to Update Documentation

**Update CLAUDE.md** (this file):
- When internal architecture changes (new patterns, data structures)
- When adding new backend code patterns (store functions, API routes)
- When adding new frontend code patterns (Vue components, routing)
- When technical decisions change (e.g., switch from CSV to database)
- When testing approach changes
- When development workflow changes

**Update README.md**:
- When user-facing features change (new views, functionality)
- When API endpoints change (new endpoints, parameter changes)
- When installation or setup steps change
- When configuration options change (config.csv fields)
- When user workflow changes (how to use the system)
- When screenshots or UI examples need updates

**Update Plan Files**:
- Mark checkboxes [x] as tasks are completed
- Move to completed/ when all tasks done
- NEVER modify plan structure mid-implementation (breaks iteration tracking)

**Documentation Best Practices**:
- Document WHILE implementing, not after (fresher context)
- Keep CLAUDE.md focused on patterns and technical decisions
- Keep README.md focused on user perspective and usage
- Include code examples in CLAUDE.md for complex patterns
- Link between CLAUDE.md and README.md when topics overlap
- Update documentation in same commit as code changes when possible

---

## Special Features

This section documents the specialized functionality that makes the CRM Manufacturing System unique and powerful for employee management workflows.

### Document Templates System

The templates system allows users to create standardized documents (contracts, certificates, notices) that automatically populate with employee data.

**DOCX Template Upload**:
- Users upload DOCX files with placeholder syntax
- Placeholders are automatically extracted during upload
- Template metadata stored in templates.csv
- DOCX files stored in files/templates/

**Template Management**:
- Template metadata: name, type, description
- Placeholder fields stored as comma-separated list
- Soft delete support (active='yes'/'no')
- One DOCX file per template (old file replaced on re-upload)

**DOCX File Storage**:
```
files/templates/template_{template_id}_{timestamp}.docx
```

### Placeholder Syntax and Replacement

Placeholders in DOCX templates follow a simple, consistent syntax that gets replaced with real data during document generation.

**Placeholder Format**:
- Syntax: `{field_name}` (curly braces around field name)
- Field names must match fields from fields_schema.csv
- Case-sensitive matching
- Alphanumeric and underscores only (no hyphens)

**Standard Placeholders** (from employee data):
- `{full_name}` - Employee full name
- `{birth_date}` - Birth date in YYYY-MM-DD format
- `{employment_status}` - Current employment status
- `{hire_date}` - Date of hire
- Any field from fields_schema.csv can be used as placeholder

**Special Placeholders** (auto-generated):
- `{current_date}` - Current date in DD.MM.YYYY format
- `{current_datetime}` - Current date and time in DD.MM.YYYY HH:MM format

**Placeholder Extraction** (from docx-generator.js):
```javascript
export async function extractPlaceholders(templatePath) {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  // Use Docxtemplater's getFullText() to get merged plain text.
  // This handles cases where Word splits {placeholder} across multiple XML runs.
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  const fullText = doc.getFullText();

  const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;
  const placeholders = new Set();
  let match;

  while ((match = placeholderRegex.exec(fullText)) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders).sort();
}
```

**Placeholder Replacement**:
- All employee fields merged with custom data (if provided)
- Null/undefined values replaced with empty strings
- Special placeholders added with current timestamp
- Unknown placeholders replaced with empty strings (no error)

**Name Declension Placeholders** (from declension.js):

The system automatically generates 24 declined name placeholders (6 grammatical cases × 4 name fields) using the [shevchenko](https://github.com/tooleks/shevchenko-js) library:

- Fields: `last_name`, `first_name`, `middle_name`, `full_name`
- Suffixes: `_genitive`, `_dative`, `_accusative`, `_vocative`, `_locative`, `_ablative`
- Example: `{full_name_genitive}`, `{last_name_dative}`

**Indeclinable Name Flags** (per-field control):
- `indeclinable_name` — affects only `last_name` (surname stays in nominative)
- `indeclinable_first_name` — affects only `first_name` (first name stays in nominative)
- Middle name (patronymic) is always declined
- `full_name_*` is assembled from parts respecting individual flags
- If both flags are set, all parts stay in nominative (early return optimization)
- Gender is detected from the `gender` field or auto-detected via shevchenko

**Grade/Position Declension Placeholders** (from declension.js):

The system generates 12 additional declined placeholders (6 cases × 2 fields) for military grade and position using the [shevchenko-ext-military](https://github.com/tooleks/shevchenko-ext-military) extension:

- `grade` field (Посада) → mapped to `militaryAppointment` in shevchenko-ext-military
  - Placeholders: `{grade_genitive}`, `{grade_dative}`, `{grade_accusative}`, `{grade_vocative}`, `{grade_locative}`, `{grade_ablative}`
- `position` field (Звання) → mapped to `militaryRank` in shevchenko-ext-military
  - Placeholders: `{position_genitive}`, `{position_dative}`, `{position_accusative}`, `{position_vocative}`, `{position_locative}`, `{position_ablative}`

**Indeclinable Grade/Position Flags**:
- `indeclinable_grade` — when 'yes', grade stays in nominative for all cases
- `indeclinable_position` — when 'yes', position stays in nominative for all cases
- These are checkbox fields in fields_schema.csv (same pattern as indeclinable_name/indeclinable_first_name)

**Placeholder Reference Page Groups**:
- Name declension placeholders displayed under "Відмінювання імен" group
- Grade/position declension placeholders displayed under "Відмінювання посади та звання" group (separate section)
- Case variant placeholders displayed under "case_variants" group

**Uppercase and Capitalized Case Variants** (from docx-generator.js):

The system automatically generates two case variants for every non-empty text placeholder:

- `{key_upper}` — all characters uppercase via `.toUpperCase()` (e.g., `{full_name_upper}` → "ІВАН ПЕТРЕНКО")
- `{key_cap}` — first character uppercase via `.charAt(0).toUpperCase() + .slice(1)` (e.g., `{full_name_cap}` → "Іван петренко")

Variants are generated for all prepared placeholders including employee fields, declension placeholders, and special placeholders (current_date, current_datetime). Empty values are skipped (no _upper/_cap variant created for empty strings). The variants are added last in prepareData(), after all other placeholders (employee data, declension, special) are assembled.

**Data Preparation Pattern** (from docx-generator.js):
```javascript
function prepareData(data) {
  const prepared = {};

  // Handle user-provided data (null safety)
  for (const key in data) {
    const value = data[key];
    prepared[key] = (value === null || value === undefined) ? '' : String(value);
  }

  // Add special placeholders
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  prepared.current_date = `${day}.${month}.${year}`;

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  prepared.current_datetime = `${day}.${month}.${year} ${hours}:${minutes}`;

  return prepared;
}
```

### Document Generation Workflow

The document generation workflow combines templates, employee data, and optional custom data to create final DOCX documents.

**Generation Process**:
1. User selects template and employee from UI
2. Optionally provides custom data in modal form (overrides employee fields)
3. Frontend sends POST request to /api/templates/:id/generate
4. Backend loads template DOCX and employee data
5. Merges employee data with custom data (custom data takes precedence)
6. Replaces placeholders in DOCX using docxtemplater
7. Generates output DOCX with unique filename
8. Records generation in generated_documents.csv with data snapshot
9. Creates audit log entry
10. Returns document metadata with download URL

**Generated Document Filename**:
```
{TemplateName}_{LastName}_{employee_id}_{timestamp}.docx
```
Example: `Contract_Петренко_123_1707845123456.docx`

**Custom Data Pattern**:
- User can override any employee field during generation
- Useful for document-specific variations (e.g., custom salary, position)
- Custom data not saved to employee record (one-time use)
- Original employee data preserved in data snapshot

**Generation API Route** (from index.js):
```javascript
app.post("/api/templates/:id/generate", async (req, res) => {
  const { employee_id, custom_data } = req.body;

  // Load template and employee
  const template = await loadTemplate(templateId);
  const employee = await loadEmployee(employee_id);

  // Merge employee data with custom overrides
  const mergedData = { ...employee, ...custom_data };

  // Generate DOCX
  const outputPath = path.join(FILES_DIR, 'documents', outputFilename);
  await generateDocx(templatePath, mergedData, outputPath);

  // Record generation
  await addGeneratedDocument({
    template_id: templateId,
    employee_id: employee_id,
    filename: outputFilename,
    generated_at: new Date().toISOString(),
    data_snapshot: JSON.stringify(mergedData)
  });

  res.json({ document, download_url: `/files/documents/${outputFilename}` });
});
```

### Document History Tracking with Data Snapshots

Every generated document is recorded in generated_documents.csv with a complete snapshot of the data used for generation.

**Why Data Snapshots**:
- Employee data changes over time (name changes, position updates, etc.)
- Generated documents must reflect data at time of generation
- Snapshots enable document audit trail and compliance
- Snapshots allow document regeneration with original data if needed

**Document History Record Structure** (from schema.js):
```javascript
export const GENERATED_DOCUMENT_COLUMNS = [
  "document_id",        // Auto-increment ID
  "template_id",        // Link to template
  "employee_id",        // Link to employee
  "filename",           // Generated DOCX filename
  "generated_at",       // ISO 8601 timestamp
  "data_snapshot",      // JSON string of merged data used
  "active"              // Soft delete flag
];
```

**Data Snapshot Content**:
- All employee fields at time of generation
- Custom data overrides (if provided)
- Stored as JSON string in CSV field
- Can be parsed to reconstruct exact document content

**Document History Viewing**:
- Frontend displays all generated documents in table
- Filters available: template, employee, date range
- Pagination support (offset/limit)
- Each row shows: template name, employee name, generation date
- Download button for each document
- Data snapshot viewable on click (shows what data was used)

**Document History API Pattern**:
```javascript
app.get("/api/documents", async (req, res) => {
  const { template_id, employee_id, start_date, end_date, offset, limit } = req.query;

  // Load and filter documents
  let documents = await loadGeneratedDocuments();

  // Apply filters
  if (template_id) {
    documents = documents.filter(d => d.template_id === template_id);
  }
  if (employee_id) {
    documents = documents.filter(d => d.employee_id === employee_id);
  }
  if (start_date || end_date) {
    documents = documents.filter(d => {
      const genDate = new Date(d.generated_at);
      if (start_date && genDate < new Date(start_date)) return false;
      if (end_date && genDate > new Date(end_date)) return false;
      return true;
    });
  }

  // Join with employees and templates for display
  const employees = await loadEmployees();
  const templates = await loadTemplates();
  const employeeMap = new Map(employees.map(e => [e.employee_id, e]));
  const templateMap = new Map(templates.map(t => [t.template_id, t]));

  const enriched = documents.map(doc => ({
    ...doc,
    employee: employeeMap.get(doc.employee_id),
    template: templateMap.get(doc.template_id)
  }));

  // Apply pagination
  const total = enriched.length;
  const paginated = enriched.slice(offset, offset + limit);

  res.json({ documents: paginated, total });
});
```

### Employment Status Change System

The application manages employment status changes via an **event-based scheduling system**. Status events are the source of truth; the `employment_status`, `status_start_date`, and `status_end_date` fields on the employee record are a cached mirror of the currently active event.

**Data model**:
- `status_events.csv` — source of truth; each row is a scheduled status event with `start_date` (required) and optional `end_date`
- `employees.csv` fields `employment_status`, `status_start_date`, `status_end_date` — mirror of the active event, updated by the sync function
- `status_history.csv` — audit log of every status change (manual and automatic)

**Status Change Fields** (from fields_schema.csv):
- `employment_status` - Current status (select field: Працює, Звільнений, Відпустка, Лікарняний, Відкомандирований)
- `status_start_date` - When the current status began (date field)
- `status_end_date` - When the status will end (optional, date field)

**Status Event Workflow**:
1. User opens the status change popup in the employee card
2. Adds a new event: selects status, sets start_date (required, defaults to today), optional end_date
3. Backend validates no overlap with existing events; returns 409 if overlap detected
4. If the new event is currently active (today is within its date range), employee status is immediately updated via `syncStatusEventsForEmployee`
5. Future events activate automatically when their start_date arrives (sync runs on `GET /api/employees/:id` and `GET /api/dashboard/events`)
6. When an event's end_date passes, employee status resets to "Працює" automatically
7. Events with no end_date remain active indefinitely

**Sync Implementation** (from store.js):
```javascript
export async function syncStatusEventsForEmployee(employeeId, { forceReset = false } = {}) {
  // 1. If employee has no events AND forceReset=false: return (leave legacy status alone)
  const events = await getStatusEventsForEmployee(empIdStr);
  if (events.length === 0 && !forceReset) return;

  // 2. Find active event for today
  const activeEvent = events.find(e => {
    if (e.start_date > today) return false;
    if (e.end_date && e.end_date < today) return false;
    return true;
  }) || null;

  // 3. Update employee status under write lock
  // - If active event found and status differs: update employee + write history
  // - If no active event and status != workingStatus: reset to workingStatus + write history
}

export async function syncAllStatusEvents() {
  // Called at GET /api/dashboard/events — syncs all active employees sequentially
}
```

**forceReset option**: Used after deleting the last status event for an employee. Bypasses the "no events = no-op" guard to ensure the employee's status is reset to "Працює" even when no events remain.

**Status Change Notifications**:
- Dashboard shows recent status changes (from status_history.csv)
- Includes manual changes and automatic resets (changed_by field: 'user' vs 'system')
- Sorted by change date (most recent first)

### Dashboard Notifications

The dashboard provides real-time notifications for important events and upcoming dates.

**Notification Types**:
1. **Birthdays**: Employees with birthdays this month
2. **Retirements**: Employees approaching retirement age
3. **Document Expiry**: Documents expiring within configured threshold
4. **Document Overdue**: Documents already expired
5. **Status Changes**: Recent employment status changes

**Combined Events API** (from index.js):
```javascript
app.get("/api/dashboard/events", async (_req, res) => {
  try {
    const events = await getDashboardEvents();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
```

**Event Structure**:
Each event object includes:
- `type`: Event type identifier (birthday, retirement, document_expiry, status_change)
- `employee`: Full employee object or relevant subset
- `date`: Event date (birth_date, retirement_date, expiry_date, change_date)
- `days_until`: Days until event (positive for future, negative for past)
- Additional fields depending on type

**Birthday Events**:
- Calculated from birth_date field
- Shows employees with birthdays in current month
- Supports filtering by specific month
- Displays days until birthday (for current month view)

**Retirement Events**:
- Calculated from birth_date + retirement_age_years configuration
- Shows employees approaching retirement (within configured threshold, e.g., 6 months)
- Retirement age configurable in config.csv (default: 60 years)
- Displays days until retirement date

**Retirement Calculation** (from store.js):
```javascript
export async function getRetirementEvents(retirementAge = 60) {
  const employees = await loadEmployees();
  const today = new Date();
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(today.getMonth() + 6);

  const events = [];
  for (const emp of employees) {
    if (!emp.birth_date) continue;

    // Calculate retirement date
    const birthDate = new Date(emp.birth_date);
    const retirementDate = new Date(birthDate);
    retirementDate.setFullYear(birthDate.getFullYear() + retirementAge);

    // Check if retirement is within next 6 months
    if (retirementDate >= today && retirementDate <= sixMonthsLater) {
      const daysUntil = Math.floor((retirementDate - today) / (1000 * 60 * 60 * 24));
      events.push({
        type: 'retirement',
        employee: emp,
        retirement_date: retirementDate.toISOString().split('T')[0],
        days_until: daysUntil
      });
    }
  }

  return events.sort((a, b) => a.days_until - b.days_until);
}
```

**Document Expiry Tracking**:
- Tracks expiry dates for document fields (e.g., passport_expiry_date, medical_cert_expiry_date)
- Document fields identified by field_type='file' and companion expiry field (field_name_expiry_date)
- Shows documents expiring within configured threshold (e.g., 30 days)
- Shows overdue documents separately

**Document Expiry Pattern**:
```javascript
export async function getDocumentExpiryEvents(threshold_days = 30) {
  const employees = await loadEmployees();
  const schema = await loadFieldsSchema();
  const today = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() + threshold_days);

  // Find file fields with expiry dates
  const fileFields = schema.filter(f => f.field_type === 'file');
  const expiryFields = fileFields
    .map(f => ({ field: f.field_name, expiry: f.field_name + '_expiry_date' }))
    .filter(f => schema.some(s => s.field_name === f.expiry));

  const events = [];
  for (const emp of employees) {
    for (const { field, expiry } of expiryFields) {
      const expiryDate = emp[expiry];
      if (!expiryDate) continue;

      const expDate = new Date(expiryDate);
      if (expDate >= today && expDate <= thresholdDate) {
        const daysUntil = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
        events.push({
          type: 'document_expiry',
          employee: emp,
          document_field: field,
          expiry_date: expiryDate,
          days_until: daysUntil
        });
      }
    }
  }

  return events.sort((a, b) => a.days_until - b.days_until);
}
```

**Status Change Events**:
- Shows recent status changes (manual and automatic)
- Includes change date, old status, new status
- Sourced from audit logs (action='UPDATE', entity_type='employee', details contains status change)
- Limited to recent changes (e.g., last 30 days)

**Dashboard UI Pattern**:
- Notifications displayed in cards/sections by type
- Color coding: green (upcoming), yellow (soon), red (overdue)
- Click to navigate to employee card for details
- Refresh button to reload events
- Event counts displayed in dashboard stats

**Notification Dismissal (Don't Show Again)**:

The dashboard supports permanent dismissal of notification events via localStorage persistence.

**Implementation Pattern**:
```javascript
// Reactive state for dismissed events
const dismissedEvents = ref(new Set());

// Generate stable event ID for persistence
function generateEventId(type, employeeId, date) {
  return `${type}:${employeeId}:${date}`;
}

// Load dismissed events from localStorage on mount
function loadDismissedEvents() {
  const stored = localStorage.getItem('dashboardDismissedEvents');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      dismissedEvents.value = new Set(parsed);
    } catch (error) {
      console.error('Failed to load dismissed events:', error);
      dismissedEvents.value = new Set();
    }
  }
}

// Save dismissed event to localStorage
function dismissEvent(eventId) {
  dismissedEvents.value.add(eventId);
  const arr = Array.from(dismissedEvents.value);
  localStorage.setItem('dashboardDismissedEvents', JSON.stringify(arr));
}

// Filter events by dismissed status
const filteredBirthdayToday = computed(() => {
  return birthdayToday.value.filter(evt => {
    const eventId = generateEventId('birthday_today', evt.employee_id, evt.current_year_birthday);
    return !dismissedEvents.value.has(eventId);
  });
});
```

**Key Features**:
- **Stable Event IDs**: Format `{type}:{employeeId}:{date}` ensures uniqueness
- **localStorage Persistence**: Dismissed events survive page reloads and navigation
- **Filtered Display**: Computed properties filter dismissed events from notification lists
- **Per-Event Dismissal**: Each notification type (status, birthday, retirement, document expiry) can be dismissed independently
- **Bulk Dismissal**: "Don't show again" button dismisses all events shown in current notification modal

**Event ID Types**:
- `status_starting:{employee_id}:{notified_date}` - Status change starting today
- `status_returning:{employee_id}:{notified_date}` - Status ending/returning today
- `birthday_today:{employee_id}:{birthday_date}` - Birthday today
- `birthday_week:{employee_id}:{birthday_date}` - Birthday within next 7 days
- `retirement_today:{employee_id}:{retirement_date}` - Retirement today
- `retirement_month:{employee_id}:{retirement_date}` - Retirement this month
- `doc_expiry_today:{employee_id}:{expiry_date}` - Document expiring today
- `doc_expiry_week:{employee_id}:{expiry_date}` - Document expiring this week

**User Flow**:
1. User sees notification popup on dashboard load
2. Clicks "Більше не показувати" (Don't show again) button
3. All events in that notification are added to dismissedEvents Set
4. Events saved to localStorage as JSON array
5. Notification modal closes
6. On page reload, dismissed events are filtered out and won't show again

### Custom Reports with Dynamic Filters

The reporting system allows users to create ad-hoc queries with multiple filter conditions across all employee fields.

**Filter Builder UI**:
- Add/remove filter rows dynamically
- Select field from fields_schema.csv
- Select condition based on field type (text, number, date)
- Enter filter value(s)
- AND logic between filters (all must match)

**Filter Condition Types**:

**Text Filters**:
- `contains` - Field contains value (case-insensitive substring match)
- `not_contains` - Field does not contain value
- `empty` - Field is empty or null

**Number Filters**:
- `greater_than` - Field value > filter value
- `less_than` - Field value < filter value
- `equals` - Field value = filter value

**Date Filters**:
- `date_range` - Field value between value and value2 (inclusive)
- `empty` - Field is empty or null

**Filter Object Structure** (from frontend):
```javascript
const customFilters = ref([
  {
    field: 'employment_status',
    condition: 'contains',
    value: 'Працює',
    value2: '' // Used for date_range condition
  },
  {
    field: 'hire_date',
    condition: 'date_range',
    value: '2023-01-01',
    value2: '2023-12-31'
  }
]);
```

**Server-Side Filter Application** (from index.js):
```javascript
app.get("/api/reports/custom", async (req, res) => {
  let { filters, limit, preview } = req.query;

  // Parse filters JSON
  if (filters) {
    try {
      filters = JSON.parse(filters);
    } catch (err) {
      res.status(400).json({ error: 'Invalid filters JSON' });
      return;
    }
  }

  // Load employees
  let employees = await loadEmployees();

  // Apply each filter
  for (const filter of filters || []) {
    employees = employees.filter(emp => {
      const fieldValue = emp[filter.field];

      switch (filter.condition) {
        case 'contains':
          return String(fieldValue || '').toLowerCase().includes(String(filter.value).toLowerCase());

        case 'not_contains':
          return !String(fieldValue || '').toLowerCase().includes(String(filter.value).toLowerCase());

        case 'empty':
          return !fieldValue || fieldValue.trim() === '';

        case 'greater_than':
          return parseFloat(fieldValue) > parseFloat(filter.value);

        case 'less_than':
          return parseFloat(fieldValue) < parseFloat(filter.value);

        case 'equals':
          return parseFloat(fieldValue) === parseFloat(filter.value);

        case 'date_range':
          return fieldValue >= filter.value && fieldValue <= filter.value2;

        default:
          return true;
      }
    });
  }

  // Apply preview/limit
  const maxLimit = 1000;
  const previewLimit = parseInt(req.query.preview_limit || 100, 10);
  const resultLimit = preview ? previewLimit : Math.min(parseInt(limit || maxLimit, 10), maxLimit);

  res.json({
    employees: employees.slice(0, resultLimit),
    total: employees.length,
    preview: !!preview
  });
});
```

**Export with Filters**:
- Same filter structure applies to export endpoint
- Filtered results exported to CSV file
- Filename includes timestamp: `employees_export_YYYYMMDD_HHMMSS.csv`
- All fields included in export (not just visible columns)

**Report Preview**:
- Preview mode limits results to configured preview_limit (default: 100 rows)
- Allows users to validate filters before exporting large datasets
- Preview indicator shown in UI
- Full export requires explicit user action

---

## Code Style and Conventions

This section documents the naming conventions, formatting standards, and coding patterns used throughout the codebase.

### Naming Conventions

The application follows consistent naming patterns across different layers and file types.

**CSV Field Names** (snake_case):
- All CSV column names use snake_case: lowercase with underscores
- Examples: `employee_id`, `full_name`, `birth_date`, `employment_status`
- Pattern applies to all CSV files: employees.csv, templates.csv, logs.csv, etc.
- Field names defined in fields_schema.csv are the canonical source

**JavaScript Variables and Functions** (camelCase):
- JavaScript code uses camelCase for variables, functions, and methods
- Examples: `loadEmployees()`, `saveTemplates()`, `employeeFields`, `fieldGroups`
- Vue.js refs and reactive variables: `const employees = ref([])`, `const selectedId = ref(null)`
- Computed properties: `const isFormDirty = computed(() => ...)`

**Vue.js Component Names** (PascalCase for files, kebab-case in templates):
- Component files use PascalCase: `App.vue` (single component per file in this project)
- Template element names use kebab-case: `<router-view>`, `<router-link>`

**CSS Class Names** (kebab-case):
- CSS classes use kebab-case: `.vacation-notification-overlay`, `.form-group`, `.button-group`
- Bootstrap classes follow Bootstrap conventions: `.btn`, `.card`, `.table`, `.form-control`

**Constants** (UPPER_SNAKE_CASE):
- Constants and configuration values use UPPER_SNAKE_CASE
- Examples: `DATA_DIR`, `FILES_DIR`, `EMPLOYEES_PATH`, `TEMPLATE_COLUMNS`
- Defined in schema.js and store.js

### File Naming Patterns

The application uses specific naming conventions for generated files to ensure uniqueness and traceability.

**Template DOCX Files**:
- Pattern: `template_{template_id}_{timestamp}.docx`
- Example: `template_1_1707845123456.docx`
- Location: `files/templates/`
- Timestamp: Unix timestamp in milliseconds (Date.now())
- One DOCX file per template (old file replaced on re-upload)

**Generated Documents**:
- Pattern: `{TemplateName}_{LastName}_{employee_id}_{timestamp}.docx`
- Example: `Contract_Петренко_123_1707845123456.docx`
- Location: `files/documents/`
- Template name sanitized to remove special characters (replaced with underscores)
- Last name sanitized to remove special characters (replaced with underscores)
- If last_name is empty/null, pattern becomes: `{TemplateName}_{employee_id}_{timestamp}.docx`
- Sanitization regex: `/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/g` (alphanumeric + Ukrainian letters only)

**Employee Document Folders**:
- Pattern: `employee_{employee_id}/`
- Example: `employee_123/`
- Location: `files/`
- Created on-demand when first document is uploaded for employee
- Contains employee-specific uploaded files (certificates, documents, etc.)

**Export Files**:
- Pattern: `employees_export_{YYYYMMDD}_{HHMMSS}.csv`
- Example: `employees_export_20260212_143022.csv`
- Generated dynamically on export request
- Timestamp uses local time in compact format

### Date and Time Format Conventions

The application uses different date formats for storage, display, and API communication.

**Storage Format** (YYYY-MM-DD):
- All dates stored in CSV files use ISO 8601 date format: YYYY-MM-DD
- Examples: `2023-05-15`, `1990-12-31`
- Applies to: birth_date, hire_date, status_start_date, status_end_date, etc.
- Standard format for parsing and comparison

**Display Format** (DD.MM.YYYY):
- Dates displayed to users use European format: DD.MM.YYYY
- Examples: `15.05.2023`, `31.12.1990`
- Used in generated documents via {current_date} placeholder
- Common format in Ukraine and Europe

**Timestamp Format** (ISO 8601):
- All timestamps use ISO 8601 format with timezone: YYYY-MM-DDTHH:MM:SS.sssZ
- Examples: `2023-05-15T14:30:22.123Z`, `2026-02-12T09:15:00.000Z`
- Applies to: generated_at (documents), timestamp (logs)
- Generated via `new Date().toISOString()`
- UTC timezone (Z suffix)

**Date/Time Display in Documents**:
- `{current_date}`: DD.MM.YYYY format (e.g., `12.02.2026`)
- `{current_datetime}`: DD.MM.YYYY HH:MM format (e.g., `12.02.2026 14:30`)
- Special placeholders automatically added during document generation

**Date Parsing and Validation**:
- HTML date inputs use YYYY-MM-DD format (browser standard)
- Backend validates date format before storage
- Invalid dates cleared to empty string (not stored as invalid values)
- Date comparison uses string comparison (works correctly with YYYY-MM-DD format)

### Comments and Documentation Style

The application follows consistent patterns for code comments and documentation.

**Function Documentation**:
- No JSDoc or formal documentation comments in most files
- Function names are descriptive and self-documenting
- Complex logic explained with inline comments where necessary

**Inline Comments**:
- Use `//` for single-line comments in JavaScript
- Use `/* */` for multi-line comments when needed
- Comments explain "why", not "what" (code should be self-explanatory)
- Ukrainian comments acceptable for business logic explanations

**Example Comment Patterns**:
```javascript
// Check if retirement is within next 6 months
if (retirementDate >= today && retirementDate <= sixMonthsLater) {
  // Add to events list
}

// Acquire lock: wait for previous write to complete
const previousLock = employeeWriteLock;
```

**TODO Comments**:
- Format: `// TODO: description`
- Used sparingly for known technical debt or planned improvements
- Should reference issue number or plan file when possible

**Code Section Headers**:
- Major sections in large files separated with comment blocks
- Example:
```javascript
// ===========================
// Employee CRUD endpoints
// ===========================
```

### Error Message Patterns

The application uses different languages for different audiences: Ukrainian for end users, English for developers.

**User-Facing Error Messages** (Ukrainian):
- All error messages returned to frontend are in Ukrainian
- Examples:
  - `"Назва шаблону обов'язкова"` (Template name required)
  - `"Шаблон не знайдено"` (Template not found)
  - `"Недозволений шлях до файлу"` (Forbidden file path)
  - `"employee_id обов'язковий"` (employee_id required)
- Pattern: `res.status(400).json({ error: "Українське повідомлення" })`

**Developer/Technical Messages** (English):
- Console logs and technical errors use English
- Examples:
  - `console.error('Invalid filters JSON:', err)`
  - `throw new Error('Request failed: ' + response.status)`
  - `console.log('Starting server on port', port)`
- Helps with debugging and international developer collaboration

**Mixed Messages**:
- Some validation errors mix Ukrainian (user field names) with English structure
- Example: `"Query parameter 'type' must be 'current' or 'month'"`
- Technical field names (employee_id, template_id) left in English even in Ukrainian messages

**Error Response Structure**:
```javascript
// Consistent error response format
{
  "error": "Error message string"
}
```

### Console Logging Conventions

The application uses console logging for debugging and monitoring during development.

**Log Levels**:
- `console.log()` - Informational messages, startup notifications, success messages
- `console.error()` - Error conditions, exceptions, validation failures

**Startup Logging**:
```javascript
console.log('✅ Server started on port', port);
console.log('📁 Data directory:', DATA_DIR);
console.log('📂 Files directory:', FILES_DIR);
```

**Error Logging Pattern**:
```javascript
try {
  // Operation
} catch (err) {
  console.error(err);
  res.status(500).json({ error: err.message });
}
```

**Request Logging**:
- No automatic request logging middleware
- Critical operations logged manually
- Example: `console.log('Generating document for employee:', employee_id)`

**Emoji Usage in Logs**:
- Emojis used in migration/utility scripts for visual clarity
- Examples: ✅ (success), ❌ (error), 📅 (date), 🔄 (processing)
- Not used in main server logs (keep production logs clean)

**Debug Logging**:
- Temporary debug logs acceptable during development
- Should be removed before commit (not left in production code)
- Use descriptive messages: `console.log('Employee before save:', employee)`

### Code Formatting and Whitespace

**Indentation**:
- 2 spaces for JavaScript, Vue.js, and JSON files
- No tabs (spaces only)
- Consistent across frontend and backend

**Line Length**:
- No strict line length limit
- Break long lines for readability (generally around 100-120 characters)
- Break long function calls at parameter boundaries

**Semicolons**:
- Semicolons used consistently in backend JavaScript code
- Vue.js frontend code uses semicolons for consistency
- Required after statements, not after function declarations

**Quotes**:
- Double quotes (`"`) preferred for strings in JavaScript
- Single quotes (`'`) acceptable, but be consistent within a file
- Template literals (backticks) for string interpolation

**Function Declarations**:
```javascript
// Named function declaration
export async function loadEmployees() {
  // ...
}

// Arrow function for callbacks
const filtered = employees.filter(emp => emp.active === 'yes');

// Async arrow function
const loadData = async () => {
  // ...
};
```

**Object and Array Formatting**:
```javascript
// Short objects on one line
const obj = { id: 1, name: 'Test' };

// Long objects on multiple lines
const employee = {
  employee_id: '1',
  full_name: 'John Doe',
  birth_date: '1990-01-01',
  employment_status: 'Працює'
};

// Arrays with multiple items
const fields = [
  'employee_id',
  'last_name',
  'first_name'
];
```

**Import Statements**:
```javascript
// Standard imports at top of file
import express from "express";
import cors from "cors";
import path from "path";

// Named imports grouped
import {
  loadEmployees,
  saveEmployees,
  loadLogs
} from "./store.js";
```

---

## Future Enhancements

This section documents potential improvements and migration paths for the CRM Manufacturing System. These are not currently planned for implementation but represent opportunities for system evolution as requirements grow.

### Migration Path to Database

The current CSV-based storage system is suitable for organizations with up to 10,000 employees. For larger organizations or those requiring advanced features, migration to a relational database is recommended.

**Recommended Database Options**:

**SQLite** (recommended for most cases):
- File-based database, no server required
- Significantly better performance than CSV for complex queries
- ACID transactions prevent data corruption
- Full-text search capabilities
- Supports 100k+ employees with good performance
- Easy migration: single .sqlite file replaces CSV files
- Native Node.js drivers available (better-sqlite3, sqlite3)

**PostgreSQL** (for enterprise deployments):
- Client-server architecture with connection pooling
- Advanced features: JSON columns, full-text search, materialized views
- Horizontal scalability with replication
- Robust backup and recovery tools
- Industry standard for production systems
- Requires server installation and maintenance

**Migration Steps**:
1. Create database schema matching current CSV structure
2. Write migration script to import CSV data into database tables
3. Update store.js functions to use SQL queries instead of CSV operations
4. Add database connection pooling and error handling
5. Create indexes for frequently queried fields (employee_id, template_id, etc.)
6. Update tests to use test database or in-memory database
7. Implement database backup strategy
8. Train team on database administration basics

**Schema Design Considerations**:
- Use foreign keys to enforce referential integrity (template_id -> templates, employee_id -> employees)
- Add indexes on: employee_id, template_id, birth_date, employment_status, hire_date
- Store audit logs in separate table with timestamp index
- Use TEXT/JSON column for data_snapshot in generated_documents
- Add created_at/updated_at timestamps for all tables
- Consider soft delete with deleted_at timestamp instead of active='yes'/'no'

**Benefits of Database Migration**:
- Faster queries (especially with filters and joins)
- True ACID transactions (no need for in-memory locks)
- Better concurrency handling (row-level locking)
- Advanced querying (aggregations, complex joins, subqueries)
- Data integrity constraints (foreign keys, unique constraints)
- Backup and restore tools
- Full-text search capabilities
- Query optimization and analysis tools

### Scalability Considerations

**Current System Limitations** (CSV-based storage):
- All data loaded into memory for each query (not suitable for 100k+ employees)
- In-memory file locks don't work across multiple server instances
- Sequential processing (no parallelization of requests)
- No query optimization (full table scans for every filter)
- Limited filtering capabilities (no complex queries)
- File I/O becomes bottleneck with frequent writes

**Scaling Strategies**:

**For 10k-50k employees (CSV optimization)**:
- Implement lazy loading (load only needed CSV files)
- Add in-memory caching for frequently accessed data
- Use streaming CSV parsing for large exports
- Compress old CSV files (archived logs, old document history)
- Separate hot data (active employees) from cold data (retired employees)

**For 50k-100k employees (database required)**:
- Migrate to SQLite or PostgreSQL
- Add database indexes for common queries
- Implement pagination at database level (LIMIT/OFFSET)
- Use prepared statements to prevent SQL injection
- Add connection pooling for concurrent requests

**For 100k+ employees (enterprise architecture)**:
- Use PostgreSQL with read replicas
- Implement caching layer (Redis) for frequently accessed data
- Add background job queue (Bull, BullMQ) for long-running operations
- Use CDN for static assets and generated documents
- Consider microservices architecture (separate document generation service)
- Implement horizontal scaling with load balancer

### Performance Optimization Opportunities

**Backend Optimizations**:

**Database Queries** (after migration):
- Add indexes on frequently filtered fields
- Use EXPLAIN ANALYZE to identify slow queries
- Implement query result caching (Redis, in-memory)
- Use database views for complex joins
- Batch database operations (bulk inserts/updates)

**Document Generation**:
- Implement background job queue for document generation
- Add worker processes to parallelize generation
- Cache template DOCX parsing (don't re-parse for every generation)
- Use streaming for large document downloads
- Compress generated documents (zip multiple documents)
- Add generation status polling endpoint (for async generation)

**File System**:
- Use cloud storage (S3, Azure Blob) for generated documents
- Implement CDN for static file serving
- Archive old documents to cheaper storage tier
- Add file cleanup job (delete old temporary files)

**API Performance**:
- Add response compression (gzip, brotli)
- Implement ETag headers for caching
- Use HTTP/2 for better multiplexing
- Add rate limiting to prevent abuse
- Implement API result pagination everywhere

**Frontend Optimizations**:

**Loading Performance**:
- Code splitting (lazy load routes with dynamic imports)
- Tree shaking to remove unused code
- Minification and compression
- Optimize images and assets
- Use service worker for offline support

**Runtime Performance**:
- Virtualize long lists (vue-virtual-scroller for employee tables)
- Debounce search inputs to reduce API calls
- Implement infinite scroll instead of pagination
- Use computed properties effectively (avoid unnecessary recalculations)
- Lazy load form fields (render visible sections first)

**Caching**:
- Cache field schema in localStorage
- Cache dropdown options (employment statuses, etc.)
- Implement stale-while-revalidate strategy
- Use HTTP caching headers for API responses

### Templates System Backlog

The templates system has a comprehensive backlog of potential enhancements. For full details, see `docs/plans/completed/templates-system-improvements.md` (Future Enhancements Backlog section).

**High Priority Enhancements**:

**1. Batch Document Generation**:
- Generate documents for multiple employees at once
- Background job queue for large batches
- Progress tracking UI with percentage complete
- Email notification on completion
- Use case: Generate contracts for all new hires at once

**2. Custom Fields Beyond Employee Data**:
- Add custom placeholder fields to template definition
- User input form for custom fields during generation
- Store custom field values in data_snapshot
- Validate required custom fields
- Use case: Contract with custom salary or probation period

**3. Template Usage Statistics**:
- Track generation count per template
- Most/least used templates report
- Generation trends over time (chart)
- Employee document count report
- Use case: Identify which templates to improve or retire

**4. Document Re-generation**:
- Regenerate document with current employee data
- Compare old vs new data snapshot (diff view)
- Audit trail for regenerations
- Version history for regenerated documents
- Use case: Update contract after employee promotion

**Medium Priority Enhancements**:

**5. Template Versioning**:
- Track template file versions over time
- Allow regeneration with specific template version
- Version comparison UI
- Rollback to previous version
- Use case: Maintain compliance with historical contract templates

**6. Automatic Cleanup of Old Documents**:
- Configurable retention period (e.g., 90 days)
- Scheduled cleanup job (cron)
- Archive to ZIP before deletion
- Cleanup report in admin UI
- Use case: Prevent disk space exhaustion

**7. Template Preview**:
- Preview template with sample data
- Highlight missing placeholders in red
- Preview in browser (convert DOCX to HTML)
- Print preview
- Use case: Validate template before using with real employees

**Low Priority Enhancements**:

**8. Advanced Placeholder Features**:
- Conditional placeholders: {if:employment_status=='Працює'}Active{/if}
- Loops for repeating data: {loop:certifications}...{/loop}
- Calculated fields: {age_years} from birth_date
- Format specifiers: {hire_date:DD.MM.YYYY}
- Use case: Complex contracts with conditional clauses

**9. Multi-language Support**:
- Template language field (Ukrainian, English, Russian)
- Locale-aware date formatting
- Translatable UI labels
- Language-specific placeholder names
- Use case: International organization with multi-language contracts

**10. Email Integration**:
- Send generated document via email
- Email template configuration
- Attachment support
- Email delivery log
- Use case: Automatically send contract to new hire's email

For the complete backlog with detailed descriptions, see the Future Enhancements Backlog section in `docs/plans/completed/templates-system-improvements.md`.

### Other Feature Enhancements

**User Authentication and Authorization**:
- Currently the system has no user authentication (single-user assumed)
- Track generated_by with real username instead of 'system'
- Role-based access control (admin, manager, HR, employee)
- Employee self-service portal (view own documents, download payslips)
- Approval workflow for sensitive operations (salary changes, termination)
- Audit trail with real usernames

**Advanced Reporting**:
- Saved reports (store filter configurations)
- Scheduled reports (email daily/weekly/monthly reports)
- Export to multiple formats (PDF, Excel, JSON)
- Report charts and visualizations
- Pivot tables for cross-tabulation
- Report builder with drag-and-drop interface

**Integration Capabilities**:
- REST API for external systems
- Webhook notifications for events (new hire, status change)
- Import from HR systems (SAP, Workday, etc.)
- Export to payroll systems
- Single sign-on (SSO) integration (SAML, OAuth)
- Active Directory integration for user management

**Advanced Dashboard**:
- Customizable widgets (user can choose what to display)
- Drag-and-drop dashboard layout
- Chart visualizations (bar, line, pie charts)
- Drill-down capabilities (click to see details)
- Real-time updates (WebSocket or SSE)
- Dashboard export to PDF

**Mobile Support**:
- Responsive design improvements for mobile browsers
- Progressive Web App (PWA) for offline support
- Native mobile apps (React Native, Flutter)
- Push notifications for important events
- Mobile-optimized forms (larger touch targets)
- Camera integration for document scanning

### Maintaining Documentation

As the system evolves, it's critical to keep documentation up-to-date and accurate.

**When to Update CLAUDE.md** (this file):
- When adding new backend code patterns (store functions, API routes, utilities)
- When adding new frontend code patterns (Vue components, routing, state management)
- When technical architecture changes (CSV to database, new libraries, etc.)
- When adding new development workflows or tools
- When technical decisions change (e.g., switching testing frameworks)
- When adding new file organization patterns
- When security patterns change

**When to Update README.md**:
- When adding new user-facing features (new views, functionality)
- When API endpoints change (new endpoints, parameter changes)
- When installation or setup steps change
- When configuration options change (config.csv fields)
- When user workflow changes (how to use the system)
- When screenshots or UI examples need updates
- When deployment instructions change

**Documentation Best Practices**:
- Document WHILE implementing, not after (context is fresher)
- Keep CLAUDE.md focused on patterns and technical decisions (for developers/AI)
- Keep README.md focused on user perspective and usage (for end users)
- Include code examples in CLAUDE.md for complex patterns
- Link between CLAUDE.md and README.md when topics overlap
- Update documentation in same commit as code changes when possible
- Review documentation during code review process
- Use consistent terminology across all documentation
- Keep table of contents updated (if added)

**Documentation Sections to Update**:
- Backend Patterns: When adding new store functions, API routes, or utilities
- Frontend Patterns: When adding new Vue patterns, components, or workflows
- API Structure: When adding/modifying API endpoints
- Special Features: When adding new major features
- Code Style: When establishing new naming or coding conventions
- Testing: When adding new test types or changing test approach

**Avoiding Documentation Drift**:
- Make documentation updates part of definition of done
- Include documentation review in pull request checklist
- Run periodic documentation audits (quarterly)
- Keep examples minimal and focused (don't duplicate code)
- Link to code files instead of duplicating long code blocks
- Use automated tools to validate code examples (if possible)

**Documentation Organization**:
- CLAUDE.md: Internal technical documentation (this file)
- README.md: User-facing documentation and getting started guide
- docs/plans/: Development plans and task breakdowns
- docs/plans/completed/: Completed plans (archived for reference)
- Code comments: Inline explanations for complex logic only
- API documentation: In README.md or separate API.md if it grows large

---

