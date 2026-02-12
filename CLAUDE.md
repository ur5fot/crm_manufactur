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
- **Validation**: Zod for input validation schemas
- **CSV Parsing**: csv-parse and csv-stringify libraries
- **Testing**: Node.js native test runner for unit/integration tests

### Frontend
- **Framework**: Vue.js 3 with Composition API
- **Build Tool**: Vite for fast development and production builds
- **Router**: Vue Router 5 for SPA navigation
- **UI Framework**: Bootstrap 5 for responsive components
- **HTTP Client**: Axios for API communication
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
├── client/                      # Vue.js frontend application
│   ├── src/
│   │   ├── App.vue             # Main app component with routing
│   │   ├── api.js              # Axios-based API client
│   │   └── main.js             # Vue app initialization
│   ├── public/                 # Static assets
│   ├── package.json            # Frontend dependencies
│   └── vite.config.js          # Vite build configuration
│
├── server/                      # Node.js backend application
│   ├── src/
│   │   ├── index.js            # Express server setup and API routes
│   │   ├── store.js            # CSV data storage layer (load/save functions)
│   │   ├── csv.js              # Low-level CSV read/write utilities
│   │   ├── schema.js           # Dynamic field schema loading from fields_schema.csv
│   │   ├── docx-generator.js   # DOCX template processing and placeholder replacement
│   │   └── upload-config.js    # Multer configuration for file uploads
│   ├── test/                   # Unit and integration tests
│   │   ├── config.test.js
│   │   ├── docx-generator.test.js
│   │   ├── templates-api.test.js
│   │   └── upload-limit.test.js
│   └── package.json            # Backend dependencies
│
├── tests/
│   └── e2e/                    # Playwright E2E tests
│       ├── templates-generation.spec.js
│       ├── templates-crud.spec.js
│       └── document-history.spec.js
│
├── data/                       # CSV data files (runtime state)
│   ├── employees.csv           # Employee master records
│   ├── templates.csv           # Document template metadata
│   ├── generated_documents.csv # Generated document records
│   ├── logs.csv                # Audit log entries
│   ├── config.csv              # Application configuration
│   └── fields_schema.csv       # Dynamic field schema and UI metadata
│
├── files/                      # Uploaded and generated files
│   ├── templates/              # Template DOCX files (template_{id}_{timestamp}.docx)
│   ├── documents/              # Generated DOCX files (TemplateName_empXXX_{timestamp}.docx)
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
└── stop.sh                     # Stop both server and client
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

**generated_documents.csv**
- Records of all generated documents
- Links to templates and employees
- Stores generation timestamp and data snapshot
- Document ID for tracking and download

**logs.csv**
- Audit trail for all operations (create, update, delete, import, export, generate)
- Includes timestamp, user, action type, entity type, entity ID, and details
- Automatically pruned to max_log_entries configuration limit

**config.csv**
- Key-value configuration storage
- Settings: max_file_upload_mb, retirement_age_years, max_log_entries, max_report_preview_rows
- Loaded at startup and cached in memory

**fields_schema.csv**
- Dynamic field schema defining all employee fields
- Controls: field name, data type, display label (Ukrainian), validation, UI visibility
- Changes trigger automatic schema migration in employees.csv

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
- Naming convention: `{TemplateName}_emp{employee_id}_{timestamp}.docx`
- Example: Contract_emp123_1707845123456.docx
- Files are never deleted, only references in generated_documents.csv
- Used for document history and compliance

### Employee Document Folders (files/employee_*/)

Per-employee folders for uploaded documents:
- Naming convention: `employee_{employee_id}/`
- Example: employee_123/
- Used for storing employee-specific files (contracts, certificates, etc.)
- Created on-demand when first document is uploaded for employee

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

**Route Organization** (in index.js):
1. Health check and configuration routes
2. Dashboard and reporting routes
3. Employee CRUD routes
4. Templates CRUD routes
5. Documents and file management routes
6. Utility routes (folder opening, import/export)

**Example Route Pattern**:
```javascript
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
```

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
  const outputFilename = `${sanitizedName}_emp${employeeId}_${timestamp}.docx`;
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
  // Read template file
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  // Extract document.xml content
  const documentXml = zip.file('word/document.xml').asText();

  // Extract placeholders using regex
  const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;
  const placeholders = new Set();
  let match;

  while ((match = placeholderRegex.exec(documentXml)) !== null) {
    placeholders.add(match[1]);
  }

  // Return sorted array
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

The application uses Vue Router 5 with history mode for SPA navigation.

**Routes Configuration** (from main.js):
```javascript
const routes = [
  { path: "/", name: "dashboard", component: App },
  { path: "/cards/:id?", name: "cards", component: App },
  { path: "/table", name: "table", component: App },
  { path: "/reports", name: "reports", component: App },
  { path: "/import", name: "import", component: App },
  { path: "/templates", name: "templates", component: App },
  { path: "/document-history", name: "document-history", component: App },
  { path: "/logs", name: "logs", component: App }
];
```

**Route Descriptions**:
- `/` (dashboard): Main dashboard with statistics and notifications
- `/cards/:id?`: Employee card view with optional employee ID parameter
- `/table`: Employee list in table format
- `/reports`: Reporting interface with status reports and custom filters
- `/import`: CSV import interface for bulk employee operations
- `/templates`: Document template management
- `/document-history`: History of all generated documents
- `/logs`: Audit log viewer

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
- beforeEach guard checks for unsaved changes when leaving cards view
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
    <div class="vacation-notification-card" @click.stop>
      <div class="card-header">
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
- Card with click.stop to prevent close (vacation-notification-card)
- Close button in header (&times; character)
- Form submission with @submit.prevent
- Cancel button to close without action
- Modal state tracked with ref boolean

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
- `vacation-notification-card`: Centered modal card with white background and shadow
- `form-grid`: Responsive grid layout for form fields (2-3 columns)
- `button-group`: Horizontal button layout with spacing
- `card-header`: Custom header styling with flex layout

**Responsive Design**:
- Bootstrap grid system used for layout
- Custom media queries for mobile-specific adjustments
- Form grids collapse to single column on mobile
- Tables use horizontal scroll on small screens

---

