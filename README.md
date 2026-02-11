# CSV CRM (Vue + Node)

**[Українська версія / Ukrainian version](README.uk.md)**

---

> ⚠️ **VIBE CODING PROJECT WARNING** ⚠️
>
> This project was created using AI-assisted "vibe coding" methodology - rapid development prioritizing working features over strict code quality standards. While functional and tested, the codebase may contain:
> - Unconventional architectural choices (monolithic components, in-memory CSV operations)
> - Known limitations documented throughout (see "Known Limitations" section)
> - Trade-offs favoring simplicity over scalability
>
> **Intended for:** Small teams (5-10 users), rapid prototyping, learning projects
>
> **Not recommended for:** Large-scale deployments, mission-critical systems, high-concurrency scenarios
>
> Use at your own risk. Review documentation carefully before deploying to production.

---

Local CRM system that stores data in CSV files and PDF documents. CSV files can be safely edited in Excel and changes reload automatically when you refresh the UI.

## Features

- **CSV-based storage** - no database required, edit data directly in Excel
- **Dynamic UI** - entire form and table structure controlled by `fields_schema.csv`
- **Sequential numeric IDs** - simple employee IDs (1, 2, 3...)
- **Document management** - upload PDF and image documents with issue/expiry dates, document expiry notifications
- **Dashboard** - stat cards with expandable employee lists, timeline with status changes, document expiry, and birthday events
- **Birthday notifications** - automatic birthday reminders (today and next 7 days) with dashboard timeline integration
- **Universal status tracking** - status change popup, automatic status management, notifications for all status types (vacation, sick leave, etc.)
- **URL-based routing** - bookmarkable URLs with persistent state (/cards/:id for direct employee access)
- **Auto-load first employee** - cards view automatically loads first employee when opened
- **Summary table** - inline editing via double-click, multi-select filters with empty value support
- **Custom Reports** - advanced filtering and CSV export with column selection
- **Unsaved changes warning** - navigation guard prevents accidental data loss when leaving employee card with unsaved changes
- **Icon-only buttons** - redesigned Delete and Clear buttons with tooltips for better UX and accident prevention; New Employee button (➕) located in Cards view sidebar, Refresh button (🔄) in global header
- **Confirmation dialogs** - confirm before clearing form or deleting employee
- **Automatic audit logging** - all changes tracked in `logs.csv` with automatic cleanup when threshold exceeded
- **CSV import** - bulk import employees from CSV files
- **System configuration** - CSV-based config file for log cleanup threshold and other settings
- **UTF-8 with BOM** - proper Cyrillic support in Excel

## Tech Stack

- **Frontend:** Vue 3 + Vite
- **Backend:** Node.js + Express
- **Storage:** CSV files (UTF-8 with BOM)
- **File uploads:** Multer

## Project Structure

```
crm_manufactur/
├── data/
│   ├── employees.csv              # Core employee data (40+ fields) - gitignored
│   ├── fields_schema.csv          # Meta-schema: field types, labels, options, UI config - gitignored
│   ├── fields_schema.template.csv # Schema template for new installations (tracked in git)
│   ├── config.csv                 # System configuration (log cleanup, etc.) - gitignored
│   ├── logs.csv                   # Audit log with auto-cleanup - gitignored
│   ├── employees_import_sample.csv # Import template with UTF-8 BOM
│   └── dictionaries.csv           # (legacy, kept for compatibility)
├── files/                         # Uploaded documents (PDF/images) - gitignored
│   └── employee_[ID]/
├── server/                        # Express.js backend
└── client/                        # Vue.js frontend
```

## Quick Start

### First Installation

On first deployment, create the local schema file from template:

```bash
cp data/fields_schema.template.csv data/fields_schema.csv
```

**Important:** `fields_schema.csv` is in `.gitignore` to prevent your local schema changes (custom fields, options) from conflicting with git updates. Edit it to fit your needs!

### Using the startup script

Start both servers:
```bash
./run.sh
```

Stop both servers:
```bash
./stop.sh
```

### Manual startup

**Terminal 1 (server):**

```bash
cd server
npm install
npm run dev
```

**Terminal 2 (client):**

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## CSV Format Notes

- **Delimiter:** `;` (semicolon) for Excel compatibility
- **Encoding:** UTF-8 with BOM for correct Cyrillic display in Excel
- **Header row:** Must remain intact
- **Employee IDs:** Sequential numbers (1, 2, 3...) instead of UUIDs
- **File paths:** Stored as relative paths like `files/employee_1/passport.pdf`

## Data Model

### Main Tables

- **employees.csv** - Main employee records (40 fields):
  1. `employee_id` - Employee ID (auto-increment)
  2. `last_name` - Last name
  3. `first_name` - First name
  4. `middle_name` - Middle name
  5. `employment_status` - Employment status (Working, On leave, Fired, Sick leave)
  6. `additional_status` - Additional status
  7. `location` - Location
  8. `department` - Department
  9. `position` - Position
  10. `grade` - Grade (in words)
  11. `salary_grid` - Salary grid
  12. `salary_amount` - Salary amount
  13. `specialty` - Specialty
  14. `work_state` - Work state
  15. `work_type` - Work type (Full time, Part time, Contract, Temporary)
  16. `gender` - Gender (Male, Female)
  17. `fit_status` - Fitness status (Fit, Unfit, Limited fitness)
  18. `order_ref` - Order reference
  19. `bank_name` - Bank name
  20. `bank_card_number` - Bank card number
  21. `bank_iban` - Bank IBAN
  22. `tax_id` - Tax ID
  23. `email` - Email
  24. `blood_group` - Blood group (I (0), II (A), III (B), IV (AB))
  25. `residence_place` - Residence place
  26. `registration_place` - Registration place
  27. `personal_matter_file` - Personal matter (file)
  28. `medical_commission_file` - Medical commission (file)
  29. `veterans_certificate_file` - Veteran's certificate (file)
  30. `driver_license_file` - Driver's license (file)
  31. `id_certificate_file` - ID certificate (file)
  32. `foreign_passport_number` - Foreign passport number
  33. `foreign_passport_file` - Foreign passport (file)
  34. `criminal_record_file` - Criminal record certificate (file)
  35. `military_id_file` - Military ID (file)
  36. `medical_certificate_file` - Medical certificate (file)
  37. `insurance_file` - Insurance policy (file)
  38. `education_diploma_file` - Education diploma (file)
  39. `phone` - Phone number
  40. `phone_note` - Phone note
  41. `education` - Education
  42. `birth_date` - Birth date (YYYY-MM-DD)
  43. `notes` - Notes
  44. `status_start_date` - Status start date (YYYY-MM-DD)
  45. `status_end_date` - Status end date (YYYY-MM-DD)
  46. Additional document and service fields

- **fields_schema.csv** - **Meta-schema for UI control** (8 columns, local file in `.gitignore`):
  - `field_order` - Sequential number (1-40)
  - `field_name` - Technical field name
  - `field_label` - Display label (in Russian)
  - `field_type` - Input type: `text`, `select`, `textarea`, `number`, `email`, `tel`, `date`, `file`
  - `field_options` - Options for select (pipe-separated), e.g.: `Working|Fired|On leave`
  - `show_in_table` - Show in summary table: `yes` / `no`
  - `field_group` - Group name for employee card
  - `editable_in_table` - Allow inline editing: `yes` / `no`
  - **To change UI, simply edit this file and reload the page!**
  - **Note:** File is in `.gitignore` for production independence from development. Create from `fields_schema.template.csv` on first install

- **config.csv** - System configuration (3 columns):
  - `config_key` - Configuration parameter name
  - `config_value` - Parameter value
  - `config_description` - Human-readable description
  - Current settings:
    - `max_log_entries` (default: 1000) - Maximum audit log entries before automatic cleanup
    - `max_file_upload_mb` (default: 10) - Maximum file upload size in megabytes
    - `retirement_age_years` (default: 60) - Retirement age for auto-dismiss notifications
    - `max_report_preview_rows` (default: 100) - Maximum rows shown in report preview table

- **logs.csv** - Audit log of all changes with automatic cleanup (9 columns):
  - `log_id` - Log entry ID
  - `timestamp` - Timestamp (ISO 8601)
  - `action` - Operation type: `CREATE`, `UPDATE`, `DELETE`
  - `employee_id` - Employee ID
  - `employee_name` - Full name at time of change
  - `field_name` - Changed field (for UPDATE)
  - `old_value` - Old value
  - `new_value` - New value
  - `details` - Change description
  - **Auto-cleanup:** When log count exceeds `max_log_entries` from config.csv, oldest entries are automatically removed

- **dictionaries.csv** - (legacy, replaced by `fields_schema.csv`):
  - Kept for backward compatibility but not used
  - All dropdown options now in `fields_schema.csv` → `field_options`

## Features in Detail

### Dashboard

The Dashboard is the home screen showing employee statistics, upcoming status change events, and auto-expanded reports.

**Stat Cards:**
- 4-column grid displaying employee counts by employment status (Total, per-status, Other)
- Click any card to expand an inline list of employee names with that status
- Only one card can be expanded at a time (accordion behavior)
- Click an employee name to navigate directly to their card

**Auto-expanded Reports:**
- "Who is absent now" report automatically expands on Dashboard load
- Shows all employees with non-working status (vacation, sick leave, etc.)
- Employee names are clickable links to their cards

**Timeline:**
- Two-column layout with "Today" and "Next 7 days" cards
- Shows employees with upcoming status changes (vacation, sick leave, etc.) with date badges
- Shows document expiry events (📄 expiring soon, ⚠️ expiring today)
- Shows birthday events (🎂 birthday today, 🎉 upcoming birthday)
- Emoji indicators by event type:
  - Status changes: ✈️ vacation, 🏥 sick leave, ℹ️ other
  - Document expiry: ⚠️ expiring today, 📄 expiring within 7 days
  - Birthdays: 🎂 today, 🎉 upcoming
- Employee names are clickable links to their cards via router

### Summary Table

The summary table provides powerful filtering and editing capabilities:

**Interaction:**
- **Double-click on cell** - Edit field value inline (for editable fields)
- **Double-click on ID** - Open employee card
- **Multi-select filters** - Select multiple values simultaneously per column
- **Empty value filter** - "(Пусто)" checkbox to filter rows with empty values
- **Clear filters** - One-click button to reset all active filters

**Filter behavior:**
- Checkboxes for each unique value in select fields
- Empty value option appears first in each filter
- Multiple selections work with OR logic
- Active filter count displayed in clear button

### Document Management

**Dynamic document types:** All fields with type `file` in `fields_schema.csv` automatically become available for upload in the Documents section.

**Upload popup:**
- Click "Завантажити" button to open an upload popup modal
- Select a file (PDF or images: jpg, jpeg, png, gif, webp)
- Optionally set issue/registration date and expiry date
- Dates are stored in auto-generated companion columns (`{field}_issue_date`, `{field}_expiry_date`)

**Features:**
- Upload PDF and image documents per employee
- Files saved with proper names and original extensions (e.g., `driver_license_file.pdf`, `id_certificate_file.jpg`)
- Issue and expiry dates displayed in the documents table
- Dates can be edited for existing documents without re-uploading the file
- "Open Folder" button in Documents section opens employee's folder in OS file explorer
- File paths automatically written to corresponding columns in `employees.csv`

**Document expiry notifications:**
- Automatic notification popup when documents expire today or within 7 days
- Document expiry events shown in the dashboard timeline
- Emoji indicators: ⚠️ expired today, 📄 expiring within 7 days

**Adding new document types:**
Simply add a new row to `fields_schema.csv` with `field_type=file` and restart the server - date columns are auto-generated, no code changes needed!

### Status Change System

Universal status management with popup, automatic status changes, and notifications for all status types.

**Status Change Popup:**
- `employment_status` is read-only in the employee card
- Click "Change Status" button to open the popup
- Select any status (except the working/active status which is the default)
- Set a start date (required) and optionally an end date
- Click "Reset Status" to restore the working status and clear dates

**Automatic status management:**
- On page load, the system automatically checks all employees with `status_start_date`/`status_end_date`:
  - If `status_end_date` has passed — restores working status (first value from `employment_status` options) and clears dates
  - Works for all statuses (vacation, sick leave, etc.), not just vacation

**Notifications:**
- Modal window with two sections: employees changing status today and employees returning
- Emoji indicators by status type: ✈️ vacation, 🏥 sick leave, ℹ️ other statuses
- Color-coded (blue for status change, green for returning)
- Displays name, position, and end date for context
- Appears automatically on page load when there are status events today

**No manual intervention required** - expired statuses are restored automatically!

### Birthday Notifications

Automatic birthday tracking and notifications for employee birthdays.

**Birthday Events:**
- Notification popup "Birthday Notifications" with two sections
- Birthdays today: 🎂 cake emoji, shows employee name and age
- Birthdays within next 7 days: 🎉 party emoji, shows employee name and upcoming age
- Appears automatically on page load when there are birthdays today or upcoming

**Dashboard Timeline Integration:**
- Birthday events appear in the timeline alongside status changes and document expiry
- Today's birthdays in "Today" card, upcoming birthdays in "Next 7 days" card
- Employee names are clickable links to their cards

**birth_date Field:**
- Added to employee data model as date field (YYYY-MM-DD)
- Located in "Personal Data" section on employee cards
- Used for age calculation and birthday event detection
- Not shown in summary table by default

### URL-Based Routing

All views are accessible via bookmarkable URLs with persistent state:

**Routes:**
- `/` - Dashboard (home page)
- `/cards` - Employee cards view (auto-loads first employee)
- `/cards/:id` - Employee cards view with specific employee (e.g., `/cards/5`)
- `/table` - Summary table view
- `/reports` - Custom reports with advanced filtering and CSV export
- `/import` - CSV import page with template download
- `/logs` - Audit logs view

**Features:**
- Refresh page at `/cards/5` automatically restores employee ID 5
- Direct links work for sharing specific employee cards
- First employee auto-loads when navigating to `/cards` without ID
- All navigation uses Vue Router for smooth transitions

### Custom Reports

Create custom filtered reports with advanced filtering and CSV export capabilities.

**Features:**
- **Advanced filtering** - Filter by any field with multiple conditions (contains, equals, not equals, empty, not empty)
- **Multiple filters** - Combine multiple filters with AND logic
- **Date range filtering** - Filter date fields by range
- **Column selection** - Choose which fields to include in export
- **Preview table** - See filtered results before export (max 100 rows preview)
- **CSV export** - Export filtered data with proper UTF-8 BOM encoding
- **Filename format** - `report_YYYY-MM-DD_HH-mm-ss.csv` with timestamp

**Filter builder:**
- Dynamic field selector dropdown (all fields from schema)
- Condition selector: contains, equals, not equals, empty, not empty
- Value input adapts to field type (text, select, date)
- "Add Filter" and "Clear Filters" buttons

### CSV Import

CSV import has been moved to a dedicated Import page (`/import` route) with improved UX.

**Import page features:**
- Upload CSV files for bulk import
- Download current template with all schema fields
- Template auto-syncs with `fields_schema.csv` on server startup
- Import instructions and validation

Template available at `/import` page or `data/employees_import_sample.csv`.

**Important:** The template file includes UTF-8 BOM and correct encoding for Excel compatibility. Use it as a reference for proper formatting.

**Import Rules:**
- UTF-8 with BOM encoding, `;` delimiter, first row must be headers
- Headers must match English column names from `employees.csv`
- Partial columns allowed - missing fields will be empty
- Required fields: at least `last_name` or `first_name`
- `employee_id` is optional:
  - If empty: auto-generated (next sequential number)
  - If filled and exists: row skipped
- Date format: `YYYY-MM-DD` (e.g., `foreign_passport_issue_date`)
- Import includes all employee fields: personal data, employment, contact (phone, phone_note), education, documents, etc.

### Dictionary Management

All dropdown values in forms are managed via `data/dictionaries.csv`:

1. Open `dictionaries.csv` in Excel
2. Add new rows with:
   - `dictionary_id` - next sequential number
   - `dictionary_type` - type (gender, blood_group, etc.)
   - `value` - value to save in database
   - `label` - display text
   - `order_index` - sort order
3. Save with UTF-8 BOM encoding
4. Refresh the browser page

## API Endpoints

- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details (returns single employee object)
- `POST /api/employees` - Create employee (accepts single employee object)
- `PUT /api/employees/:id` - Update employee (accepts single employee object)
- `DELETE /api/employees/:id` - Delete employee
- `POST /api/employees/:id/files` - Upload document (PDF/images) with optional issue_date and expiry_date
- `DELETE /api/employees/:id/files/:fieldName` - Delete employee document
- `GET /api/document-expiry` - Get document expiry events (today and next 7 days)
- `GET /api/document-overdue` - Get overdue document events (past expiry date)
- `GET /api/birthday-events` - Get birthday events (today and next 7 days)
- `GET /api/retirement-events` - Get retirement events (employees reaching retirement age)
- `GET /api/config` - Get system configuration (key-value object from config.csv)
- `GET /api/reports/custom` - Generate custom filtered report (accepts filter parameters)
- `GET /api/reports/statuses?type=current|month` - Get status report data (current or month)
- `POST /api/employees/:id/open-folder` - Open employee's document folder in OS file explorer
- `POST /api/employees/import` - Bulk import from CSV
- `GET /api/dictionaries` - Get all reference data
- `GET /api/fields-schema` - Get dynamic UI schema (field types, labels, options)
- `POST /api/open-data-folder` - Open data folder in OS file explorer

## Production Deployment

### Initial Installation

```bash
git clone <repository-url>
cd crm_manufactur
cp data/fields_schema.template.csv data/fields_schema.csv
./run.sh
```

### Updating from GitHub

Since `fields_schema.csv` is in `.gitignore`, your local schema changes won't conflict with updates:

```bash
git pull origin master
./stop.sh
./run.sh
```

**Automatic schema migration:**
- On startup, server automatically compares `fields_schema.csv` with `employees.csv`
- If schema has new fields - they're added to `employees.csv` with empty values
- All existing data is preserved without changes
- Migration happens transparently on first start after update

**Manual schema update (optional):**
If new version adds important fields to `fields_schema.template.csv`:

```bash
# View changes in template
git diff data/fields_schema.template.csv

# Manually add needed fields to your local fields_schema.csv
nano data/fields_schema.csv
```

## Development

For detailed architecture and development guidelines, see [CLAUDE.md](CLAUDE.md).

## Testing

The project includes comprehensive end-to-end (E2E) tests using [Playwright](https://playwright.dev/).

### Running Tests

**Prerequisites:** Start the application servers first:

```bash
./run.sh
```

**Run all tests:**

```bash
npm run test:e2e
```

**Run tests interactively (UI mode):**

```bash
npm run test:e2e:ui
```

**Run tests with visible browser:**

```bash
npm run test:e2e:headed
```

**Run specific test file:**

```bash
npm run test:e2e tests/e2e/employee-crud.spec.js
```

### Test Coverage

The test suite covers all major user flows:

- Employee CRUD operations (create, read, update, delete)
- Document upload and management (PDF + images with dates)
- Table view with multi-select filters and inline editing
- Custom reports with advanced filters and CSV export
- CSV import (valid/invalid data, template download)
- Dashboard statistics, timeline, and notifications
- Status changes with date ranges and automatic restoration
- Retirement notifications with auto-dismiss
- Audit logs viewing and search

### Documentation

For detailed testing documentation, debugging tips, and best practices, see [tests/README.md](tests/README.md).

## Known Limitations

### Concurrent Editing

**Issue:** If two users edit the same employee simultaneously, one update may be lost (last-write-wins).

**Why it happens:**
- The system uses write locks to prevent CSV file corruption
- However, locks only protect the write operation, not the full read-modify-write cycle
- Both users can read the same data, make different changes, and the last save overwrites the first

**Example:**
```
User A: Opens employee card, changes salary from $1000 to $1500
User B: Opens same employee card (also sees salary $1000), changes position
User A: Saves changes → salary becomes $1500
User B: Saves changes → salary reverts to $1000 (overwrites A's change)
```

**How to avoid this:**

1. **Coordinate with your team** - avoid editing the same employee at the same time
2. **Refresh before editing** - click the refresh button (🔄) to get latest data
3. **Verify after saving** - check that your changes were applied correctly
4. **Check audit logs** - if changes are missing, review the Logs tab to diagnose

**Current design rationale:** This system is designed for small teams (5-10 users) where concurrent edits to the same employee are rare. The simple CSV-based approach prioritizes ease of use and Excel compatibility over advanced concurrency control.

**For larger teams:** Consider implementing transaction-level locking or migrating to a relational database with proper ACID guarantees.

See [CLAUDE.md](CLAUDE.md) for detailed technical explanation and improvement options.

## License

MIT
