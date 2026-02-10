# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation

This repository maintains three documentation files that should be kept in sync:

- **[README.md](README.md)** - Main documentation in English for international audience
- **[README.uk.md](README.uk.md)** - Ukrainian documentation (Українська документація)
- **[CLAUDE.md](CLAUDE.md)** (this file) - Technical architecture and development guide for AI assistants

When updating features or architecture, ensure all three files reflect the changes.

## Communication Language

- Общение в чате ведётся на **русском языке**
- Если используются английские термины — писать перевод в скобках, например: "auto-refresh (автообновление)"

## Development Workflow

### Story Completion and Git Commits

**IMPORTANT:** After implementing or reviewing a story, ALWAYS ask the user before committing changes:

```
Story завершена! Создать git commit?

1. Да, закоммитить изменения
2. Нет, я сделаю это сам позже
```

**Only create commits when explicitly requested by the user.** Never commit automatically after:
- Completing story implementation (`/bmad-bmm-dev-story`)
- Finishing code review fixes (`/bmad-bmm-code-review`)
- Applying architectural changes
- Any other code modifications

**If user chooses [1]:**
1. Follow the standard git commit process (see below)
2. Use story title and key changes in commit message
3. Include `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>` trailer

**If user chooses [2]:**
- List modified files for user reference
- Continue to next workflow step

### Git Commit Guidelines

When user explicitly requests a commit, follow these steps:

1. Run `git status` and `git diff` to see all changes
2. Stage relevant files (avoid `git add .` - stage specific files by name)
3. Draft commit message following project conventions:
   - First line: Brief summary (e.g., "Story 3.2: CSV Export — реалізація + code review fixes")
   - Body: Key changes as bullet points
   - Trailer: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`
4. Create commit using heredoc for proper formatting
5. **Never force push, amend without permission, or skip hooks**

## Project Overview

Local CRM system for managing employee data using CSV files as the database and documents (PDF and images) stored in local folders. The system uses a client-server architecture with Vue.js frontend and Express.js backend.

**Key Characteristic:** CSV files can be edited directly in Excel and changes reload automatically when the UI is refreshed.

## Development Commands

### Start the application

```bash
./run.sh
```

This script automatically installs dependencies if needed and starts both services in parallel.

### Stop the application

```bash
./stop.sh
```

This script stops both frontend and backend servers by killing processes on ports 3000, 5173, and 5174.

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

### First Installation / Production Deployment

**Initial setup:**
```bash
git clone <repository-url>
cd crm_manufactur
cp data/fields_schema.template.csv data/fields_schema.csv
./run.sh
```

**Updating from GitHub:**
Since `fields_schema.csv` is in `.gitignore`, local schema modifications won't conflict:
```bash
git pull origin master
./stop.sh
./run.sh
```

**Why fields_schema.csv is gitignored:**
- Production environments often need custom fields, options, or labels
- Schema changes in development shouldn't overwrite production configuration
- Template file (`fields_schema.template.csv`) provides starting point for new installs
- Automatic migration (see store.js) handles adding new fields from schema to employees.csv

## Architecture

### Data Storage Model

**CSV-based database** instead of traditional RDBMS:
- `data/employees.csv` - main employee records (40 columns) - single denormalized table (gitignored - user data)
- `data/fields_schema.csv` - **meta-schema defining all fields, their types, labels, options, and UI configuration** (gitignored - local production config)
- `data/fields_schema.template.csv` - template schema for new installations (tracked in git)
- `data/config.csv` - **system configuration** (key-value pairs: log cleanup threshold, etc.) (gitignored - local production config)
- `data/logs.csv` - audit log of all CRUD operations with automatic cleanup (gitignored - user data)
- `data/employees_import_sample.csv` - import template with UTF-8 BOM (tracked in git)
- `data/dictionaries.csv` - (legacy, kept for compatibility) reference data
- `files/employee_[ID]/` - uploaded documents: PDF and images (gitignored - user files)

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
- `PUT /api/employees/:id` - Update employee (accepts employee object, logs changes automatically)
- `DELETE /api/employees/:id` - Delete employee and associated files (logs deletion)
- `POST /api/employees/:id/files` - Upload documents (PDF/images) with optional `issue_date` and `expiry_date` in request body (multer with temporary filename, then renamed based on file_field)
- `DELETE /api/employees/:id/files/:fieldName` - Delete employee document
- `POST /api/employees/:id/open-folder` - Open employee's document folder in OS file explorer
- `POST /api/employees/import` - Bulk import from CSV file
- `GET /api/fields-schema` - **Get dynamic UI schema** (field types, labels, options, groups, table configuration)
- `GET /api/document-expiry` - Get document expiry events (today and next 7 days) for dashboard timeline and notifications
- `GET /api/birthday-events` - Get birthday events (today and next 7 days) for dashboard timeline and notifications
- `GET /api/config` - Get system configuration (key-value object from config.csv)
- `GET /api/reports/custom` - **Generate custom filtered report** (accepts filter parameters: field, condition, value; returns filtered employee data)
- `GET /api/dictionaries` - Get all reference data grouped by type (legacy)
- `GET /api/logs` - Get audit log sorted by timestamp descending (auto-cleaned when exceeds max_log_entries)
- `POST /api/open-data-folder` - Open data folder in OS file explorer

**Important patterns:**
- All data loaded into memory on each request (acceptable for small datasets)
- Row normalization ensures all columns exist with empty string defaults
- IDs are sequential numeric strings (e.g., "1", "2", "3")
- Auto-incremented IDs calculated by finding max existing ID + 1
- Deleting an employee removes associated file directory
- File uploads use multer with 10MB limit for PDFs and images (jpg, jpeg, png, gif, webp):
  - Files initially saved with temporary names (`temp_{timestamp}.*`)
  - After upload completes, renamed based on `file_field` parameter with original extension preserved (e.g., `driver_license_file.pdf`, `id_certificate_file.jpg`)
  - This ensures correct naming even though multer processes files before body fields are available
  - Upload endpoint also accepts optional `issue_date` and `expiry_date` fields, saved to `{field_name}_issue_date` and `{field_name}_expiry_date` columns
  - Document fields dynamically loaded from `fields_schema.csv` at server startup

### Frontend Architecture ([client/src/](client/src/))

**Single-page application:**
- [App.vue](client/src/App.vue) - Monolithic component containing all UI logic
- [api.js](client/src/api.js) - HTTP client wrapper for backend API
- [styles.css](client/src/styles.css) - Global styles

**State management:**
- Pure Vue 3 reactivity (no Vuex/Pinia)
- All state in App.vue component
- Form data mirrors employee object structure
- **Dynamic UI generation**: Fields schema loaded on mount via `/api/fields-schema`
- Form groups, table columns, and filters generated from schema
- **Vue Router**: URL-based navigation with persistent state (/cards/:id, /table, /reports, /import, /logs, /)
- Six view modes: Dashboard (home), Cards (detail), Table (summary with inline editing), Reports (custom filtering), Import (CSV upload), Logs (audit trail)

**Dashboard UI** (full-width, no max-width constraint)**:**
- **Stat Cards** - 4-column grid showing employee counts by `employment_status` (total, per-status, other)
- **Inline Expand** - Click any stat card to expand an accordion list of employee names filtered by that status
  - Single-expand behavior: only one card expanded at a time (`expandedCard` ref)
  - `toggleStatCard(cardKey)` function, `expandedEmployees` computed property
  - Employee names are clickable — navigate to employee card via `router.push('/cards/' + id)`
  - Each card + expand wrapped in `.stat-card-wrap` container
  - CSS transition 200ms for both expand and collapse animation
- **Auto-expand Reports** - "Хто відсутній зараз" report automatically expands on Dashboard mount
  - `toggleReport('current')` called after employees loaded
  - Shows all employees with non-working status (not `options[0]`)
  - Only auto-expands on Dashboard, not on other views
- **Timeline Cards** - Two-column grid (`.timeline-grid`) showing events (status changes, document expiry, birthdays):
  - "Сьогодні" (today) and "Найближчі 7 днів" (next 7 days)
  - Card-style containers (`.timeline-card`) with white background and rounded corners
  - Employee names are clickable links (`.timeline-link`) to employee cards via router
  - Status events: emoji by status position — ✈️ (vacation/options[2]), 🏥 (sick leave/options[3]), ℹ️ (others)
  - Document expiry events: ⚠️ (expiring today), 📄 (expiring within 7 days)
  - Birthday events: 🎂 (birthday today), 🎉 (birthday within 7 days)
- **Auto-refresh** - Dashboard data refreshes automatically via interval
- **Footer** - Shows last update timestamp

**Summary Table UI:**
- **Double-click on cell** - Triggers inline editing for editable fields
- **Double-click on ID** - Opens employee detail card
- **Multi-select filters** - Checkbox-based filters for select fields
- **Empty value filter** - Special "(Пусто)" checkbox to filter rows with empty values
- **ID column** - Center-aligned with title attribute for accessibility
- **Filter state** - Reactive columnFilters object with `__EMPTY__` sentinel value for empty checks

**Custom Reports UI:**
- **Filter Builder** - Dynamic form for building complex filters:
  - Field selector dropdown (all fields from `fields_schema.csv`)
  - Condition selector: `contains`, `equals`, `not_equals`, `empty`, `not_empty`
  - Value input adapts to field type (text, select dropdown, date picker)
  - "Додати фільтр" button to add filter to active list
  - "Очистити фільтри" button to reset all filters
- **Active Filters Display** - Shows applied filters with remove (✖️) button per filter
- **Column Selector** - Checkboxes to choose which fields to include in CSV export
- **Preview Table** - Shows filtered results (max 100 rows preview, paginated)
- **CSV Export** - "Експорт в CSV" button generates and downloads filtered data
  - Filename format: `report_YYYY-MM-DD_HH-mm-ss.csv`
  - UTF-8 with BOM encoding for Excel compatibility
  - Only selected columns included
- **Backend filtering** - `GET /api/reports/custom` accepts filter array: `[{field, condition, value}, ...]`
- **Multiple filters logic** - AND logic (all filters must match)

**CSV Import UI:**
- **Dedicated Import Page** - Moved from employee card to separate `/import` route
- **Template Download** - "Завантажити шаблон CSV" button downloads `employees_import_sample.csv`
  - Template auto-synced with `fields_schema.csv` on server startup via `run.sh`
  - `syncCSVTemplate()` function in `store.js` adds/removes columns to match current schema
  - Standalone script `server/src/sync-template.js` executed by `run.sh` before starting servers
- **File Upload** - File picker for CSV upload
- **Import Instructions** - Clear instructions on CSV format, required fields, encoding
- **Validation** - Server-side validation with error messages for invalid data
- **Success/Error Feedback** - Shows import results (rows added, rows skipped, errors)

**Documents Section UI:**
- **Dynamic document fields** - All fields with `field_type=file` from fields_schema automatically displayed
- **Open Folder button** - Opens employee's document folder (`files/employee_{id}/`) in OS file explorer
- **Document upload popup** - Click "Завантажити" button to open a modal popup with:
  - Document name in header
  - File picker (accepts PDF and images: jpg, jpeg, png, gif, webp)
  - Issue/registration date input (type=date, optional)
  - Expiry date input (type=date, optional)
  - "Завантажити" and "Скасувати" buttons
- **Document dates display** - Issue date and expiry date shown in the documents table for uploaded documents
- **Date editing** - Dates can be edited for already-uploaded documents without re-uploading the file
- **File actions** - Open document in browser, delete document
- **Empty form reset** - Creating new employee clears all document fields to prevent copying file links

**Icon-Only Buttons Pattern:**
- **Delete and Clear buttons** - Redesigned in employee cards view:
  - "Видалити співробітника" → 🗑️ icon only (trash icon)
  - "Очистити форму" → 🧹 icon only (broom icon)
  - Positioned side-by-side with flexbox row layout
  - `title` attribute for tooltip on hover (accessibility)
  - Smaller size and less prominent color (gray) than primary action buttons
  - Reduced opacity until hover (prevents accidental clicks)
- **Tab bar buttons** - Redesigned refresh and new employee buttons:
  - "Оновити" → 🔄 icon only (refresh icon)
  - "Новий працівник" → ➕ icon only (plus icon)
  - Moved from top-right to tab bar for better layout
  - `title` attribute for accessibility
  - Visual separation from view tabs (different color or spacing)

**Confirmation Dialogs Pattern:**
- **Clear Form Dialog** - Shows when "Очистити форму" button clicked:
  - Message: "Ви впевнені, що хочете очистити форму? Всі незбережені дані будуть втрачені."
  - Buttons: "Так, очистити" (destructive) and "Скасувати" (safe default)
  - Only clears form if user confirms "Так"
  - Modal overlay prevents interaction with underlying UI
- **Delete Employee Dialog** - Shows when "Видалити співробітника" button clicked:
  - Message: "Ви впевнені, що хочете видалити цього співробітника? Цю дію неможливо скасувати."
  - Buttons: "Так, видалити" (destructive) and "Скасувати" (safe default)
  - Only deletes if user confirms "Так"
- **Unsaved Changes Dialog** - Shows when navigating away from employee card with unsaved changes:
  - Message: "У вас є незбережені зміни: [список змінених полів]. Зберегти перед виходом?"
  - Buttons: "Зберегти і продовжити", "Продовжити без збереження", "Скасувати"
  - Lists changed fields for transparency
  - Saves and navigates if "Зберегти" clicked
  - Navigates without saving if "Продовжити" clicked
  - Stays on current page if "Скасувати" clicked

**Document Expiry Notifications:**
- **API endpoint** - `GET /api/document-expiry` returns expiry events (today and next 7 days)
- **Notification popup** - "Сповіщення про закінчення терміну дії документів" modal with:
  - Documents expiring today - warning emoji (⚠️)
  - Documents expiring within 7 days - document emoji (📄)
  - Each entry shows employee name, document type label, and expiry date
- **Dashboard timeline integration** - Document expiry events appear in the dashboard timeline alongside status change events
- **Auto-check on load** - `checkDocumentExpiry()` function called from `loadEmployees()`, similar to `checkStatusChanges()`

**Birthday Notifications:**
- **API endpoint** - `GET /api/birthday-events` returns birthday events (today and next 7 days)
- **Notification popup** - "Сповіщення про дні народження" modal with:
  - Birthdays today - cake emoji (🎂), shows employee name, age, birth date
  - Birthdays within 7 days - party emoji (🎉), shows employee name, upcoming age, birth date
  - Each entry shows employee name and age
- **Dashboard timeline integration** - Birthday events appear in the dashboard timeline alongside status and document events
- **Auto-check on load** - `checkBirthdayEvents()` function called from `loadEmployees()`
- **birth_date field** - Added to fields_schema.csv (field_type=date, field_group="Личные данные", show_in_table=no)

**Status Change System:**
- **Status Change Popup** - `employment_status` is read-only in the employee card. A "Змінити статус" button opens a popup with:
  - Select dropdown with all `employment_status` options except `options[0]` (working status is set via "Скинути статус" button)
  - Start date (required, input type=date)
  - End date (optional, input type=date)
  - "Застосувати" and "Скасувати" buttons
  - "Скинути статус" button — restores `options[0]` and clears both dates
- **Automatic status management** - On page load, `checkStatusChanges()` checks all employees and updates statuses:
  - If `status_start_date` <= today and `status_end_date` is empty or >= today — status remains as set
  - If `status_end_date` < today — restores `options[0]`, clears `status_start_date` and `status_end_date`
  - Works for ALL statuses with dates (vacation, sick leave, etc.), not just vacation
- **Dynamic status values** - Computed from `fields_schema.csv`:
  - `workingStatus`: First value from `employment_status` field_options (e.g., "Працює", "Активний")
  - `vacationStatus`: `options[2]` from `employment_status` (e.g., "Відпустка") — used for emoji assignment
- **Notifications** - Modal window "Сповіщення про зміну статусів" with two sections:
  - Employees changing status today — emoji by position: ✈️ (vacation/options[2]), 🏥 (sick leave/options[3]), ℹ️ (others)
  - Employees returning to `options[0]` today (🏢 green)
- **Data fields** - `status_start_date` and `status_end_date` (renamed from vacation_start/end_date), hidden from employee card form (no field_group), managed only through the popup
- **Implementation** - `checkStatusChanges()` function in App.vue, called from `loadEmployees()`
- **Logging** - Console output for debugging status checks and changes

**Vue Router:**
- **URL-based navigation** - All views accessible via URLs for bookmarking and direct linking
- **Routes:**
  - `/` - Dashboard (home page)
  - `/cards` - Employee cards view (auto-loads first employee if available)
  - `/cards/:id` - Employee cards view with specific employee loaded (e.g., `/cards/5`)
  - `/table` - Summary table view
  - `/reports` - **Custom Reports view** with advanced filtering and CSV export
  - `/import` - **CSV Import view** with template download and bulk upload
  - `/logs` - Audit logs view
- **Persistent state** - Refresh page at `/cards/5` restores the employee card for ID 5
- **Auto-load first employee** - Navigating to `/cards` without ID automatically loads first employee from list
- **Router navigation** - All view switches use `router.push()` instead of reactive `currentView` variable
- **Unsaved changes warning** - Navigation guard (`beforeRouteLeave`) prevents accidental data loss when leaving `/cards/:id` with unsaved changes
  - Shows confirmation dialog: "Save before leaving?", "Continue without saving", "Cancel"
  - Lists changed fields in dialog for transparency
  - Also prevents browser refresh/close via `window.beforeunload` event

**Vite proxy configuration** ([vite.config.js](client/vite.config.js)):
- `/api`, `/files`, `/data` proxied to `http://localhost:3000`
- Hot module replacement enabled

## Data Model

### Employee Fields (dynamic column count)

Defined in [server/src/schema.js](server/src/schema.js). The column list is dynamically generated from `fields_schema.csv`. For each field with `field_type=file`, two companion date columns are auto-appended: `{field_name}_issue_date` and `{field_name}_expiry_date`.

**Core fields from schema:**
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
25. `residence_place` - Residence place
26. `registration_place` - Registration place
27. `personal_matter_file` - Personal matter file path
28. + `personal_matter_file_issue_date` - auto-generated
29. + `personal_matter_file_expiry_date` - auto-generated
30. `medical_commission_file` - Medical commission file path
31. + `medical_commission_file_issue_date` - auto-generated
32. + `medical_commission_file_expiry_date` - auto-generated
33. `veterans_certificate_file` - Veteran's certificate file path
34. + `veterans_certificate_file_issue_date` - auto-generated
35. + `veterans_certificate_file_expiry_date` - auto-generated
36. `driver_license_file` - Driver's license file path
37. + `driver_license_file_issue_date` - auto-generated
38. + `driver_license_file_expiry_date` - auto-generated
39. `id_certificate_file` - ID certificate file path
40. + `id_certificate_file_issue_date` - auto-generated
41. + `id_certificate_file_expiry_date` - auto-generated
42. `foreign_passport_number` - Foreign passport number
43. `foreign_passport_file` - Foreign passport file path
44. + `foreign_passport_file_issue_date` - auto-generated
45. + `foreign_passport_file_expiry_date` - auto-generated
46. `criminal_record_file` - Criminal record certificate file path
47. + `criminal_record_file_issue_date` - auto-generated
48. + `criminal_record_file_expiry_date` - auto-generated
49. `military_id_file` - Military ID file path
50. + `military_id_file_issue_date` - auto-generated
51. + `military_id_file_expiry_date` - auto-generated
52. `medical_certificate_file` - Medical certificate file path
53. + `medical_certificate_file_issue_date` - auto-generated
54. + `medical_certificate_file_expiry_date` - auto-generated
55. `insurance_file` - Insurance policy file path
56. + `insurance_file_issue_date` - auto-generated
57. + `insurance_file_expiry_date` - auto-generated
58. `education_diploma_file` - Education diploma file path
59. + `education_diploma_file_issue_date` - auto-generated
60. + `education_diploma_file_expiry_date` - auto-generated
61. `phone` - Phone number
62. `phone_note` - Phone note
63. `education` - Education
64. `birth_date` - Birth date (YYYY-MM-DD) — for birthday notifications and age calculation
65. `status_start_date` - Status start date (YYYY-MM-DD) — managed via Status Change popup
66. `status_end_date` - Status end date (YYYY-MM-DD) — managed via Status Change popup
67. `notes` - Notes

**Auto-generated date columns convention:**
- For every `field_type=file` field in `fields_schema.csv`, the system auto-generates two companion columns in `employees.csv`:
  - `{field_name}_issue_date` - Document registration/issue date (YYYY-MM-DD)
  - `{field_name}_expiry_date` - Document expiry date (YYYY-MM-DD)
- These columns are NOT defined in `fields_schema.csv` — they are derived automatically in `schema.js`
- On server startup, `initializeEmployeeColumns()` in `store.js` auto-migrates `employees.csv` to include any missing columns

### Fields Schema (8 columns) - **Primary UI Configuration**

**Dynamic UI system** controlled by [data/fields_schema.csv](data/fields_schema.csv):

This file defines the entire UI structure - **edit this file to change form layout, table columns, field types, and dropdown options**.

**Important:** `fields_schema.csv` is in `.gitignore` to allow production-specific customization. For new installations, copy from `fields_schema.template.csv`.

**Columns:**
- `field_order` - Sequential order (1-41+)
- `field_name` - Technical field name (matches employees.csv column)
- `field_label` - Display label in Russian
- `field_type` - Input type: `text`, `select`, `textarea`, `number`, `email`, `tel`, `date`, `file`
- `field_options` - For select fields: pipe-separated values (e.g., `Работает|Уволен|Отпуск`)
- `show_in_table` - Show in summary table: `yes` or `no`
- `field_group` - Group name for employee card sections
- `editable_in_table` - Allow inline editing in table: `yes` or `no`

**Example rows:**
```csv
5;employment_status;Статус работы;select;Работает|Уволен|Отпуск|Больничный;yes;Личные данные;yes
7;location;Местонахождение;select;Симферополь|Керчь|Евпатория;yes;Локация;yes
```

**How it works:**
1. Backend reads fields_schema.csv on startup
2. `GET /api/fields-schema` returns structured data (groups, tableFields, allFields)
3. Frontend dynamically generates:
   - Employee card form sections grouped by `field_group`
   - Summary table columns where `show_in_table=yes`
   - Filters with checkboxes for select fields in table
   - Dictionaries from `field_options`

**To modify UI:**
1. Edit [data/fields_schema.csv](data/fields_schema.csv)
2. Reload page - changes apply immediately
3. No code changes required!

### Dictionaries (5 columns) - **Legacy, Replaced by fields_schema.csv**

Reference data file [data/dictionaries.csv](data/dictionaries.csv) is kept for backward compatibility but **not used by the application**.

All dropdown options are now defined directly in `fields_schema.csv` via the `field_options` column.

### System Configuration (3 columns)

System-wide settings in [data/config.csv](data/config.csv):

**Columns:**
- `config_key` - Configuration parameter name
- `config_value` - Parameter value
- `config_description` - Human-readable description

**Current configuration:**
- `max_log_entries` - Maximum number of log entries before automatic cleanup (default: 1000)

**Features:**
- CSV-based configuration (no hardcoded values)
- UTF-8 with BOM encoding for Excel compatibility
- Loaded via `GET /api/config` endpoint
- Used by server for automatic log cleanup and other system behaviors

### Audit Logs (9 columns)

Automatic change tracking in [data/logs.csv](data/logs.csv):

**Columns:**
- `log_id` - Sequential log entry ID
- `timestamp` - ISO 8601 timestamp
- `action` - Operation type: `CREATE`, `UPDATE`, `DELETE`
- `employee_id` - Employee ID
- `employee_name` - Full name at time of change
- `field_name` - Changed field (for UPDATE)
- `old_value` - Previous value (for UPDATE)
- `new_value` - New value (for UPDATE)
- `details` - Human-readable description

**Features:**
- All CRUD operations automatically logged
- Field-level change tracking for updates
- **Automatic cleanup** - When log count exceeds `max_log_entries` from config.csv, oldest entries are removed
- Cleanup triggered after each log write operation
- Searchable logs view in UI
- Sorted by timestamp descending (newest first)
- Human-readable field labels: "Пригодность (fit_status)"

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
- Dictionary values (gender, employment_status, work_type, etc.) must match values from fields_schema.csv `field_options` column

## Key Technical Decisions

1. **Why CSV?** Easy to edit in Excel, human-readable, no database setup required
2. **Why in-memory?** Simple implementation for small datasets (<1000 employees)
3. **Why monolithic App.vue?** Small project scope, component splitting not necessary
4. **Why single denormalized table?** Simplicity - one phone and one education field per employee is sufficient for most use cases
5. **Why relative file paths?** Makes data folder portable across systems
6. **Why fields_schema.csv?** Single source of truth for UI configuration - no hardcoded forms, complete flexibility
7. **Why multiple filter checkboxes?** Better UX than single-select dropdowns for filtering data
8. **Why gitignore fields_schema.csv?** Production environments need custom fields/options without git conflicts; template provides starting point for new installs
9. **Concurrent edit protection:** In-memory write locks (`employeeWriteLock`, `logWriteLock`) prevent CSV file corruption by serializing write operations. However, **the current implementation has a known limitation**: the lock protects only the `writeCSV()` call, not the full read-modify-write transaction. This means concurrent PUT requests can read stale data before writing, potentially causing lost updates (last-write-wins).
   - **Current behavior:** `loadEmployees()` → modify in memory → `saveEmployees()` (locked) — two requests can both read before either writes
   - **Impact:** If two users simultaneously edit different fields of the same employee, one update may be lost
   - **Recommended workflow to avoid conflicts:**
     - Coordinate team members to avoid editing the same employee simultaneously
     - Use the refresh button (🔄) before editing to get latest data
     - Check audit logs if updates appear to be missing
   - **Technical note:** Full transaction-level locking (protecting read-modify-write) would eliminate this issue but adds complexity. Current design prioritizes simplicity for small-team deployments where concurrent edits are rare. If concurrent editing becomes frequent, consider implementing transaction locks or optimistic locking with version numbers.

## Known Limitations

### Concurrent Edit Race Condition (Read-Modify-Write)

**Problem:** Two users editing the same employee simultaneously may experience lost updates (last-write-wins scenario).

**Technical Details:**
- Current implementation uses write locks (`employeeWriteLock`) to prevent CSV file corruption
- However, the lock only protects the final write operation, NOT the full read-modify-write cycle
- Flow: `PUT /api/employees/:id` → `loadEmployees()` (unlocked) → modify data → `saveEmployees()` (locked)

**Scenario Example:**
```
Time  | Request A (update salary)     | Request B (update position)
------|-------------------------------|-----------------------------
T1    | loadEmployees() (salary=1000) |
T2    |                               | loadEmployees() (salary=1000)
T3    | modify: salary=1500           |
T4    |                               | modify: position="Manager"
T5    | saveEmployees() (locked)      |
T6    | write CSV: salary=1500        | waiting for lock...
T7    |                               | saveEmployees() (locked)
T8    |                               | write CSV: salary=1000 (СТАРОЕ ЗНАЧЕНИЕ!)
      |                               | Result: salary reverted to 1000
```

**Impact:**
- Both updates succeed with HTTP 200 responses
- No error message shown to users
- One update silently lost (overwritten by stale data from other request)
- Audit logs show both changes, but only last write persists in CSV

**Best Practices to Avoid Issues:**

1. **Организационные меры:**
   - Координируйте работу команды — избегайте одновременного редактирования одного сотрудника
   - Назначайте ответственных за определённые разделы данных (HR — личные данные, бухгалтерия — зарплаты)

2. **Workflow рекомендации:**
   - Перед редактированием нажмите кнопку обновления (🔄) чтобы получить свежие данные
   - После сохранения проверьте что изменения применились (посмотрите в таблице или обновите карточку)
   - Если изменения не сохранились — проверьте audit logs для диагностики

3. **Проверка аудит логов:**
   - Если обнаружили пропавшие изменения — откройте вкладку "Логи"
   - Найдите записи с нужным `employee_id` и временем редактирования
   - Если видите оба изменения в логах, но в CSV только одно — это признак race condition
   - Повторно внесите потерянное изменение

4. **Технические меры предосторожности:**
   - Разворачивайте систему для малых команд (до 5-10 одновременных пользователей)
   - Для больших команд рассмотрите внедрение transaction-level locking или миграцию на реляционную БД

**Планы по улучшению:**
- Возможное решение: transaction lock для всего PUT handler (read-modify-write как атомарная операция)
- Альтернатива: optimistic locking с version numbers в CSV (требует миграции схемы)
- Trade-off: текущая простота vs полная защита от race conditions

## CRITICAL: No Hardcoded Schema Values

**`fields_schema.csv` is the single source of truth.** All field labels, dropdown options, status values, and field metadata MUST come from `fields_schema.csv` dynamically. Never hardcode values that are defined in the schema.

**What MUST NOT be hardcoded in code:**
- Field labels (e.g., "Прізвище", "Статус роботи") — use `field_label` from schema
- Dropdown option values (e.g., "Працює", "Відпустка") — use `field_options` from schema
- Status detection patterns (e.g., searching for "отпуск" or "відпустк" in option strings) — use positional convention instead
- Fallback values for statuses — if schema not loaded, use empty string `''`

**Positional convention for `employment_status` options:**
The order of values in `field_options` for `employment_status` has semantic meaning:
- `options[0]` = working/active status (e.g., "Працює")
- `options[1]` = fired/dismissed status (e.g., "Звільнений")
- `options[2]` = vacation status (e.g., "Відпустка") — used for emoji assignment (✈️)
- `options[3]` = sick leave status (e.g., "Лікарняний") — used for emoji assignment (🏥)
- `options[4+]` = other statuses — emoji ℹ️

This convention is used by:
- `workingStatus` computed in App.vue — `employmentOptions[0]`
- `vacationStatus` computed in App.vue — `employmentOptions[2]`
- `checkStatusChanges()` function — uses `workingStatus` to restore status after end date passes
- Status Change Popup — shows all options except `options[0]` for selection
- Notification emoji — assigned by position index (✈️, 🏥, ℹ️)
- Dashboard stat cards — rendered dynamically via `v-for` over all options
- `getDashboardStats()` in store.js — counts per each option dynamically
- `expandedEmployees` computed — filters employees by clicked stat card status

**Dashboard stat card colors** are assigned by position index via `statusCardColor(idx)` function using CSS variables (`--color-status-active`, `--color-status-warning`, `--color-status-vacation`, etc.).

## Modifying Data Model

**Adding or changing fields is now extremely simple:**

1. Edit [data/fields_schema.csv](data/fields_schema.csv):
   - Add new row or modify existing row
   - Set field type, label, options, group, table visibility, field order
2. Add to CSV header row in `data/employees.csv`
3. Restart server and reload page - UI updates automatically!

**Note:** Both `EMPLOYEE_COLUMNS` and `DOCUMENT_FIELDS` are now dynamically loaded from `fields_schema.csv` at server startup based on `field_order` and `field_type=file` respectively.

**No code changes needed for:**
- Changing field labels
- Adding/removing dropdown options
- Showing/hiding fields in summary table
- Enabling/disabling inline editing
- Reorganizing form groups

When adding new document types:
1. Add new row to [data/fields_schema.csv](data/fields_schema.csv) with `field_type=file`
2. Restart server - it auto-migrates `employees.csv` to add the file column plus `_issue_date` and `_expiry_date` companion columns
3. Reload page - document field appears automatically in Documents section with upload popup, date fields, and expiry tracking!

**Note:** `DOCUMENT_FIELDS` is now dynamically loaded from `fields_schema.csv` at server startup - no code changes needed! Date companion columns are auto-generated by `schema.js`.

When adding new dictionary types:
1. Add entries to [data/dictionaries.csv](data/dictionaries.csv)
2. Use in form by adding field with `type: "select"` and `optionsKey: "your_type"`
3. Frontend automatically loads from `/api/dictionaries` on mount

## Documentation Maintenance

**Important:** This project maintains bilingual documentation. When making changes:

1. **Update all three docs:** [README.md](README.md), [README.uk.md](README.uk.md), and [CLAUDE.md](CLAUDE.md)
2. **Keep sections synchronized:** Same structure, same code examples
3. **Translate accurately:** Technical terms consistent, instructions equivalent
4. **Test instructions:** Verify setup steps work on fresh install

See [.docs-sync.md](.docs-sync.md) for detailed sync checklist.
