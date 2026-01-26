# CSV CRM (Vue + Node)

**[Русская версия / Russian version](README.ru.md)**

Local CRM system that stores data in CSV files and PDF documents. CSV files can be safely edited in Excel and changes reload automatically when you refresh the UI.

## Features

- **CSV-based storage** - no database required, edit data directly in Excel
- **Dynamic UI** - entire form and table structure controlled by `fields_schema.csv`
- **Sequential numeric IDs** - simple employee IDs (1, 2, 3...)
- **File management** - upload and store PDF documents per employee
- **Summary table** - inline editing via double-click, multi-select filters with empty value support
- **Automatic audit logging** - all changes tracked in `logs.csv` with field-level details
- **CSV import** - bulk import employees from CSV files
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
│   ├── employees.csv              # Core employee data (37 fields) - gitignored
│   ├── fields_schema.csv          # Meta-schema: field types, labels, options, UI config
│   ├── logs.csv                   # Audit log of all changes - gitignored
│   ├── employees_import_sample.csv # Import template with UTF-8 BOM
│   └── dictionaries.csv           # (legacy, kept for compatibility)
├── files/                         # Uploaded PDF documents - gitignored
│   └── employee_[ID]/
├── server/                        # Express.js backend
└── client/                        # Vue.js frontend
```

## Quick Start

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

- **employees.csv** - Main employee records (37 fields):
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
  25. `workplace_location` - Workplace location
  26. `residence_place` - Residence place
  27. `registration_place` - Registration place
  28. `driver_license_file` - Driver's license (file)
  29. `id_certificate_file` - ID certificate (file)
  30. `foreign_passport_number` - Foreign passport number
  31. `foreign_passport_issue_date` - Foreign passport issue date
  32. `foreign_passport_file` - Foreign passport (file)
  33. `criminal_record_file` - Criminal record certificate (file)
  34. `phone` - Phone number
  35. `phone_note` - Phone note
  36. `education` - Education
  37. `notes` - Notes

- **fields_schema.csv** - **Meta-schema for UI control** (8 columns):
  - `field_order` - Sequential number (1-37)
  - `field_name` - Technical field name
  - `field_label` - Display label (in Russian)
  - `field_type` - Input type: `text`, `select`, `textarea`, `number`, `email`, `tel`, `date`, `file`
  - `field_options` - Options for select (pipe-separated), e.g.: `Working|Fired|On leave`
  - `show_in_table` - Show in summary table: `yes` / `no`
  - `field_group` - Group name for employee card
  - `editable_in_table` - Allow inline editing: `yes` / `no`
  - **To change UI, simply edit this file and reload the page!**

- **logs.csv** - Audit log of all changes (9 columns):
  - `log_id` - Log entry ID
  - `timestamp` - Timestamp (ISO 8601)
  - `action` - Operation type: `CREATE`, `UPDATE`, `DELETE`
  - `employee_id` - Employee ID
  - `employee_name` - Full name at time of change
  - `field_name` - Changed field (for UPDATE)
  - `old_value` - Old value
  - `new_value` - New value
  - `details` - Change description

- **dictionaries.csv** - (legacy, replaced by `fields_schema.csv`):
  - Kept for backward compatibility but not used
  - All dropdown options now in `fields_schema.csv` → `field_options`

## Features in Detail

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

### File Uploads

**Dynamic document types:** All fields with type `file` in `fields_schema.csv` automatically become available for upload in the Documents section.

**Features:**
- Upload PDF documents per employee
- Files saved with proper names based on field type (e.g., `driver_license_file.pdf`, `id_certificate_file.pdf`)
- "Open Folder" button in Documents section opens employee's folder in OS file explorer
- File paths automatically written to corresponding columns in `employees.csv`
- Temporary file handling ensures correct naming even when form data is delayed

**Adding new document types:**
Simply add a new row to `fields_schema.csv` with `field_type=file` - no code changes needed!

### CSV Import

Template available in UI or at `data/employees_import_sample.csv`.

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
- `POST /api/employees/:id/files` - Upload PDF document
- `DELETE /api/employees/:id/files/:fieldName` - Delete employee document
- `POST /api/employees/:id/open-folder` - Open employee's document folder in OS file explorer
- `POST /api/employees/import` - Bulk import from CSV
- `GET /api/dictionaries` - Get all reference data
- `GET /api/fields-schema` - Get dynamic UI schema (field types, labels, options)
- `POST /api/open-data-folder` - Open data folder in OS file explorer

## Development

For detailed architecture and development guidelines, see [CLAUDE.md](CLAUDE.md).

## License

MIT
