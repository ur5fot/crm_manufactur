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

