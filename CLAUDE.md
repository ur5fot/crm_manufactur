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
- `templates-api.test.js`: Template API endpoint validation
- `retirement-events.test.js`: Retirement event processing logic
- `retirement-api.test.js`: Retirement API endpoint validation

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
# Run all unit/integration tests
cd server && npm test

# Run specific test file
node server/test/config.test.js
node server/test/docx-generator.test.js
```

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
  - field_type: Data type (text, select, date, file, textarea, number)
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
- Saves generated document to: `files/documents/{TemplateName}_emp{id}_{timestamp}.docx`
- Records generation in generated_documents.csv with data snapshot
- Creates audit log entry
- Returns: Document object with download URL
- 404 if template or employee not found

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
2. Installs dependencies if node_modules/ is missing (both server and client)
3. Initializes config.csv from config.template.csv if not exists
4. Runs CSV template synchronization (sync-template.js)
5. Starts server in watch mode (port 3000)
6. Starts client in development mode (port 5173)
7. Runs both services in parallel
8. Handles cleanup on exit (Ctrl+C)

**Production Mode**:
```bash
./run.sh prod
```

Production mode uses different ports:
- Server: port 3001 (instead of 3000)
- Client: port 5174 (instead of 5173)

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

### Stopping the Application

**Quick Stop**:
```bash
./stop.sh
```

This script:
1. Finds processes using ports 3000 (server) and 5173 (client)
2. Terminates both processes
3. Provides confirmation messages

**Production Mode Stop**:
```bash
./stop.sh prod
```

Stops services running on production ports (3001, 5174).

**Manual Stop**:
- Ctrl+C in each terminal running server/client
- Or use `lsof -ti:3000 | xargs kill -9` for manual port cleanup

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

The application uses standard ports for development:

**Development Ports** (default):
- Server: 3000
- Client: 5173
- Configure via PORT and VITE_PORT environment variables

**Production Ports** (with `./run.sh prod`):
- Server: 3001
- Client: 5174

**Port Conflicts**:
If ports are already in use:
1. Use `./stop.sh` to clean up previous instances
2. Or change PORT/VITE_PORT environment variables before starting
3. Or manually kill processes: `lsof -ti:PORT | xargs kill -9`

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
  const documentXml = zip.file('word/document.xml').asText();

  // Extract placeholders using regex
  const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;
  const placeholders = new Set();
  let match;

  while ((match = placeholderRegex.exec(documentXml)) !== null) {
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
{TemplateName}_emp{employee_id}_{timestamp}.docx
```
Example: `Contract_emp123_1707845123456.docx`

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

The application supports tracking temporary and permanent employment status changes with optional automatic expiration.

**Status Change Fields** (from fields_schema.csv):
- `employment_status` - Current status (select field with values like Працює, На лікарняному, У відпустці, etc.)
- `status_start_date` - When the current status began (date field)
- `status_end_date` - When the status will end (optional, date field)

**Status Change Workflow**:
1. User updates employment_status field in employee card
2. Optionally sets status_start_date (defaults to today)
3. Optionally sets status_end_date for temporary statuses
4. Backend validates and saves changes
5. Audit log created with status change details

**Automatic Status Reset**:
- System checks for expired statuses on dashboard load
- If status_end_date < current_date, status automatically resets
- Reset status value configured in config.csv or defaults to "Працює"
- Audit log created for automatic reset
- User notified of automatic status changes

**Status Reset Implementation** (from store.js):
```javascript
export async function checkAndResetExpiredStatuses() {
  const employees = await loadEmployees();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const changes = [];
  for (const emp of employees) {
    if (emp.status_end_date && emp.status_end_date < today) {
      const oldStatus = emp.employment_status;
      emp.employment_status = 'Працює'; // Default reset value
      emp.status_start_date = today;
      emp.status_end_date = '';

      changes.push({
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        old_status: oldStatus,
        new_status: emp.employment_status
      });
    }
  }

  if (changes.length > 0) {
    await saveEmployees(employees);

    // Create audit log entries
    for (const change of changes) {
      await addLog({
        user: 'system',
        action: 'UPDATE',
        entity_type: 'employee',
        entity_id: change.employee_id,
        details: `Automatic status reset: ${change.old_status} → ${change.new_status}`
      });
    }
  }

  return changes;
}
```

**Status Change Notifications**:
- Dashboard shows recent status changes
- Includes manual changes and automatic resets
- Shows: employee name, old status, new status, change date
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

