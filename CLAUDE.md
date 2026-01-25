# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation

This repository maintains three documentation files that should be kept in sync:

- **[README.md](README.md)** - Main documentation in English for international audience
- **[README.ru.md](README.ru.md)** - Russian documentation (Русская документация)
- **[CLAUDE.md](CLAUDE.md)** (this file) - Technical architecture and development guide for AI assistants

When updating features or architecture, ensure all three files reflect the changes.

## Project Overview

Local CRM system for managing employee data using CSV files as the database and PDF documents stored in local folders. The system uses a client-server architecture with Vue.js frontend and Express.js backend.

**Key Characteristic:** CSV files can be edited directly in Excel and changes reload automatically when the UI is refreshed.

## Development Commands

### Start the application

```bash
./run.sh
```

This script automatically installs dependencies if needed and starts both services in parallel.

Or manually:

```bash
# Terminal 1 - Server (port 3000)
cd server
npm install
npm run dev

# Terminal 2 - Client (port 5173)
cd client
npm install
npm run dev
```

Access the application at `http://localhost:5173`

### Production build

```bash
# Client only
cd client
npm run build
npm run preview
```

## Architecture

### Data Storage Model

**CSV-based database** instead of traditional RDBMS:
- `data/employees.csv` - main employee records (37 columns) - single denormalized table
- `data/dictionaries.csv` - reference data for selects (gender, blood groups, employment status, etc.)
- `files/employee_[ID]/` - uploaded PDF documents

**CSV Format:**
- Delimiter: `;` (semicolon) for Excel compatibility
- Encoding: UTF-8 with BOM (Byte Order Mark) for correct display in Excel
- Header row must remain intact
- File paths stored as relative paths (e.g., `files/employee_emp_1234/passport.pdf`)
- BOM automatically added by server when writing CSV files

### Backend Architecture ([server/src/](server/src/))

**Core modules:**
- [index.js](server/src/index.js) - Express app with REST API endpoints
- [store.js](server/src/store.js) - File system operations and CSV file management
- [csv.js](server/src/csv.js) - CSV read/write utilities with row normalization
- [schema.js](server/src/schema.js) - Data model definitions (EMPLOYEE_COLUMNS)

**API Endpoints:**
- `GET /api/employees` - List all employees (returns array of employee objects)
- `GET /api/employees/:id` - Get employee details (returns single employee object)
- `POST /api/employees` - Create employee (accepts employee object, auto-generates numeric ID if not provided)
- `PUT /api/employees/:id` - Update employee (accepts employee object)
- `DELETE /api/employees/:id` - Delete employee and associated files
- `POST /api/employees/:id/files` - Upload PDF documents (multer)
- `POST /api/employees/import` - Bulk import from CSV file
- `GET /api/dictionaries` - Get all reference data grouped by type
- `POST /api/open-data-folder` - Open data folder in OS file explorer

**Important patterns:**
- All data loaded into memory on each request (acceptable for small datasets)
- Row normalization ensures all columns exist with empty string defaults
- IDs are sequential numeric strings (e.g., "1", "2", "3")
- Auto-incremented IDs calculated by finding max existing ID + 1
- Deleting an employee removes associated file directory
- File uploads use multer with 10MB limit for PDFs

### Frontend Architecture ([client/src/](client/src/))

**Single-page application:**
- [App.vue](client/src/App.vue) - Monolithic component containing all UI logic
- [api.js](client/src/api.js) - HTTP client wrapper for backend API
- [styles.css](client/src/styles.css) - Global styles

**State management:**
- Pure Vue 3 reactivity (no Vuex/Pinia)
- All state in App.vue component
- Form data mirrors employee object structure
- Dictionaries loaded on mount via `/api/dictionaries` and used for dropdown selects

**Vite proxy configuration** ([vite.config.js](client/vite.config.js)):
- `/api`, `/files`, `/data` proxied to `http://localhost:3000`
- Hot module replacement enabled

## Data Model

### Employee Fields (37 columns)

Defined in [server/src/schema.js](server/src/schema.js):

1. `employee_id` - Employee ID (auto-increment, sequential numeric)
2. `last_name` - Last name
3. `first_name` - First name
4. `middle_name` - Middle name
5. `employment_status` - Employment status (dictionary: Работает, Уволен, Отпуск, Больничный)
6. `additional_status` - Additional status
7. `location` - Location
8. `department` - Department
9. `position` - Position
10. `grade` - Grade (in words)
11. `salary_grid` - Salary grid
12. `salary_amount` - Salary amount
13. `specialty` - Specialty
14. `work_state` - Work state
15. `work_type` - Work type (dictionary: Полная ставка, Частичная занятость, Контракт, Временная работа)
16. `gender` - Gender (dictionary: Мужской, Женский)
17. `fit_status` - Fitness status (dictionary: Годен, Не годен, Ограниченно годен)
18. `order_ref` - Order reference
19. `bank_name` - Bank name
20. `bank_card_number` - Bank card number
21. `bank_iban` - Bank IBAN
22. `tax_id` - Tax ID
23. `email` - Email
24. `blood_group` - Blood group (dictionary: I (0), II (A), III (B), IV (AB))
25. `workplace_location` - Workplace location
26. `residence_place` - Residence place
27. `registration_place` - Registration place
28. `driver_license_file` - Driver's license file path
29. `id_certificate_file` - ID certificate file path
30. `foreign_passport_number` - Foreign passport number
31. `foreign_passport_issue_date` - Foreign passport issue date (YYYY-MM-DD)
32. `foreign_passport_file` - Foreign passport file path
33. `criminal_record_file` - Criminal record certificate file path
34. `phone` - Phone number
35. `phone_note` - Phone note
36. `education` - Education
37. `notes` - Notes

### Dictionaries (5 columns)

Reference data for dropdown lists in [data/dictionaries.csv](data/dictionaries.csv):

- dictionary_id, dictionary_type, value, label, order_index

**Available dictionary types:**
- `gender` - Мужской, Женский
- `blood_group` - I (0), II (A), III (B), IV (AB)
- `employment_status` - Работает, Уволен, Отпуск, Больничный
- `work_type` - Полная ставка, Частичная занятость, Контракт, Временная работа
- `fit_status` - Годен, Не годен, Ограниченно годен

**API response format:**
```json
{
  "dictionaries": {
    "gender": [
      {"value": "Мужской", "label": "Мужской"},
      {"value": "Женский", "label": "Женский"}
    ],
    ...
  }
}
```

**Usage in forms:**
- Employee form fields with `type: "select"` and `optionsKey` property use dictionaries
- Fields: `gender`, `employment_status`, `work_type`, `fit_status`, `blood_group`
- Dropdown options populated from `dictionaries[field.optionsKey]`
- To add new select values, edit [data/dictionaries.csv](data/dictionaries.csv) and reload page

## CSV Import

Template: `data/employees_import_sample.csv`

**Important:** The template file is created with UTF-8 BOM for Excel compatibility. All CSV files should maintain BOM for proper Cyrillic display.

**Rules:**
- UTF-8 with BOM encoding, `;` delimiter
- Headers must match English column names from EMPLOYEE_COLUMNS
- Required: at least `last_name` or `first_name`
- `employee_id` optional: if empty, auto-generated (sequential numeric); if exists, row skipped
- Dates in `YYYY-MM-DD` format
- Imports all employee fields including personal data, employment, contact (phone, phone_note), education, documents, etc.
- Dictionary values (gender, employment_status, work_type, etc.) must match values from dictionaries.csv

## Key Technical Decisions

1. **Why CSV?** Easy to edit in Excel, human-readable, no database setup required
2. **Why in-memory?** Simple implementation for small datasets (<1000 employees)
3. **Why monolithic App.vue?** Small project scope, component splitting not necessary
4. **Why single denormalized table?** Simplicity - one phone and one education field per employee is sufficient for most use cases
5. **Why relative file paths?** Makes data folder portable across systems

## Modifying Data Model

When adding new employee fields:
1. Add column to `EMPLOYEE_COLUMNS` in [server/src/schema.js](server/src/schema.js)
2. Add to CSV header row in `data/employees.csv`
3. Add form input in [client/src/App.vue](client/src/App.vue)
4. Row normalization handles missing columns automatically

When adding new document types:
1. Add column to `EMPLOYEE_COLUMNS`
2. Add to `DOCUMENT_FIELDS` array
3. Upload UI automatically detects fields ending in `_file`

When adding new dictionary types:
1. Add entries to [data/dictionaries.csv](data/dictionaries.csv)
2. Use in form by adding field with `type: "select"` and `optionsKey: "your_type"`
3. Frontend automatically loads from `/api/dictionaries` on mount

## Documentation Maintenance

**Important:** This project maintains bilingual documentation. When making changes:

1. **Update all three docs:** [README.md](README.md), [README.ru.md](README.ru.md), and [CLAUDE.md](CLAUDE.md)
2. **Keep sections synchronized:** Same structure, same code examples
3. **Translate accurately:** Technical terms consistent, instructions equivalent
4. **Test instructions:** Verify setup steps work on fresh install

See [.docs-sync.md](.docs-sync.md) for detailed sync checklist.
