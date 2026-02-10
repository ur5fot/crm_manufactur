# Comprehensive Project Testing - Verify CRM System Against Documentation

This plan uses multiple AI agents to systematically test all features documented in CLAUDE.md and README.md to ensure the application works as specified.

## Context

- Files involved: All files (server/src/*, client/src/*, data/*, run.sh, stop.sh)
- Related patterns: Manual testing with AI verification
- Dependencies: Running application (./run.sh), test data in data/ directory

## Approach

- Testing approach: Manual testing with AI agent verification (no automated test suite exists)
- Each task will be verified by running the application and testing features systematically
- Document all findings in a test report

## Tasks

### TASK 1: Environment Setup and Initial Verification

**Files:**
- Verify: run.sh, stop.sh
- Verify: server/package.json, client/package.json
- Verify: data/fields_schema.csv, data/config.csv

**Steps:**
- [x] Stop any running instances with ./stop.sh
- [x] Clean start with ./run.sh in DEV mode
- [x] Verify backend starts on port 3000
- [x] Verify frontend starts on port 5173
- [x] Verify http://localhost:5173 loads successfully
- [x] Check browser console for errors
- [x] Verify data files exist: employees.csv, fields_schema.csv, config.csv, logs.csv
- [x] Document any startup issues or warnings

### TASK 2: Backend API Endpoints Testing

**Files:**
- Test: server/src/index.js (all API endpoints)
- Test: server/src/store.js (data operations)
- Test: server/src/csv.js (CSV operations)
- Test: server/src/schema.js (schema validation)

**Steps:**
- [ ] Test GET /api/employees - verify returns employee array
- [ ] Test GET /api/employees/:id - verify returns single employee
- [ ] Test POST /api/employees - create test employee, verify ID generation
- [ ] Test PUT /api/employees/:id - update test employee, verify changes persist
- [ ] Test DELETE /api/employees/:id - delete test employee, verify file cleanup
- [ ] Test GET /api/fields-schema - verify returns schema with groups, tableFields, allFields
- [ ] Test GET /api/config - verify returns config object from config.csv
- [ ] Test GET /api/logs - verify returns audit log entries sorted by timestamp desc
- [ ] Test GET /api/document-expiry - verify returns expiry events (today + 7 days)
- [ ] Test GET /api/birthday-events - verify returns birthday events (today + 7 days)
- [ ] Test GET /api/reports/custom - verify filtering with conditions (contains, equals, empty, etc.)
- [ ] Test POST /api/employees/:id/files - upload PDF and image files with dates
- [ ] Test DELETE /api/employees/:id/files/:fieldName - delete document
- [ ] Test POST /api/employees/:id/open-folder - verify folder opens in OS
- [ ] Test POST /api/open-data-folder - verify data folder opens in OS
- [ ] Test POST /api/employees/import - import CSV with valid and invalid data
- [ ] Verify all responses have correct status codes
- [ ] Verify all operations log to logs.csv
- [ ] Document any API failures or unexpected behaviors

### TASK 3: Dashboard View Testing

**Files:**
- Test: client/src/App.vue (Dashboard section)
- Verify: Dashboard stat cards, timeline, auto-refresh, reports

**Steps:**
- [ ] Navigate to / (home/dashboard)
- [ ] Verify stat cards display (Total, per-status counts)
- [ ] Click each stat card, verify inline expand shows filtered employee list
- [ ] Verify only one card expanded at a time (accordion behavior)
- [ ] Click employee name in expanded list, verify navigates to /cards/:id
- [ ] Verify "Хто відсутній зараз" report auto-expands on mount
- [ ] Verify timeline has two columns: "Сьогодні" and "Найближчі 7 днів"
- [ ] Verify timeline shows status change events with correct emoji (✈️, 🏥, ℹ️)
- [ ] Verify timeline shows document expiry events (⚠️ today, 📄 within 7 days)
- [ ] Verify timeline shows birthday events (🎂 today, 🎉 upcoming)
- [ ] Click employee name in timeline, verify navigates to card
- [ ] Verify auto-refresh interval updates data
- [ ] Verify footer shows last update timestamp
- [ ] Verify no hardcoded status values (all from schema)
- [ ] Document any UI issues or missing features

### TASK 4: Employee Cards View Testing

**Files:**
- Test: client/src/App.vue (Cards view)
- Verify: Form fields, document uploads, status popup, validation

**Steps:**
- [ ] Navigate to /cards, verify auto-loads first employee
- [ ] Navigate to /cards/:id with specific ID, verify correct employee loads
- [ ] Verify all form fields render according to field_group from schema
- [ ] Verify field types match schema (text, select, textarea, date, email, tel, number)
- [ ] Verify dropdown options come from field_options in schema (no hardcoded values)
- [ ] Test "Новий працівник" (➕) button, verify creates new empty form
- [ ] Fill all fields for new employee, click "Зберегти", verify creates employee
- [ ] Verify auto-generated sequential numeric ID (not UUID)
- [ ] Edit existing employee fields, click "Зберегти", verify updates persist
- [ ] Verify changes logged to logs.csv with field-level tracking
- [ ] Test "Очистити форму" (🧹) button, verify confirmation dialog appears
- [ ] Confirm clear, verify form resets
- [ ] Test "Видалити співробітника" (🗑️) button, verify confirmation dialog
- [ ] Confirm delete, verify employee deleted and files removed
- [ ] Verify delete logged to logs.csv
- [ ] Test unsaved changes warning: edit field, try to navigate, verify dialog shows
- [ ] Verify dialog lists changed fields with labels
- [ ] Test all three dialog buttons: "Скасувати", "Продовжити без збереження", "Зберегти і продовжити"
- [ ] Edit field, refresh browser, verify browser beforeunload warning
- [ ] Verify ESC key closes dialogs
- [ ] Document any form issues or validation problems

### TASK 5: Document Management Testing

**Files:**
- Test: client/src/App.vue (Documents section)
- Test: server/src/index.js (file upload endpoints)
- Verify: Upload popup, dates, expiry tracking, folder operations

**Steps:**
- [ ] Navigate to employee card with documents section
- [ ] Verify all file fields from schema appear (field_type=file)
- [ ] Click "Завантажити" button for document, verify popup opens
- [ ] Upload PDF file, set issue_date and expiry_date, verify upload succeeds
- [ ] Verify file saved with correct name (field_name + extension)
- [ ] Verify file path written to employees.csv
- [ ] Verify dates saved to {field}_issue_date and {field}_expiry_date columns
- [ ] Upload image (jpg, png, gif, webp), verify upload succeeds
- [ ] Edit dates for existing document without re-uploading, verify dates update
- [ ] Click document link, verify opens in browser
- [ ] Click "Open Folder" button, verify opens employee folder in OS
- [ ] Delete document, verify file removed and path cleared in CSV
- [ ] Set expiry_date to today, reload page, verify expiry notification appears
- [ ] Set expiry_date to tomorrow, verify appears in timeline
- [ ] Verify document expiry emoji correct (⚠️ today, 📄 within 7 days)
- [ ] Test file size limit (10MB max), verify larger files rejected
- [ ] Test unsupported file types, verify rejected
- [ ] Document any document management issues

### TASK 6: Status Change System Testing

**Files:**
- Test: client/src/App.vue (Status change popup and checkStatusChanges)
- Test: server/src/store.js (status field updates)
- Verify: Popup, automatic status restore, notifications, positional convention

**Steps:**
- [ ] Navigate to employee card
- [ ] Verify employment_status field is read-only
- [ ] Click "Змінити статус" button, verify popup opens
- [ ] Verify popup shows all status options EXCEPT options[0] (working status)
- [ ] Select status (e.g., vacation/options[2]), set start_date and end_date
- [ ] Click "Застосувати", verify status updates
- [ ] Verify status_start_date and status_end_date saved to CSV
- [ ] Verify status field hidden from form (no field_group)
- [ ] Set end_date to yesterday, reload page
- [ ] Verify checkStatusChanges() auto-restores options[0] (working status)
- [ ] Verify status_start_date and status_end_date cleared
- [ ] Set status change for today, reload page
- [ ] Verify notification popup appears with correct emoji (✈️ vacation, 🏥 sick leave, ℹ️ other)
- [ ] Verify notification shows two sections: "changing today" and "returning today"
- [ ] Verify timeline shows status events with correct dates
- [ ] Click "Скинути статус" button, verify restores options[0] and clears dates
- [ ] Verify all status values come from schema (no hardcoded strings)
- [ ] Test with different status types (sick leave, vacation, custom)
- [ ] Document any status management issues

### TASK 7: Birthday Notifications Testing

**Files:**
- Test: client/src/App.vue (checkBirthdayEvents function)
- Test: server/src/index.js (GET /api/birthday-events)
- Verify: Notification popup, timeline integration, age calculation

**Steps:**
- [ ] Create/edit employee with birth_date set to today
- [ ] Reload page, verify birthday notification popup appears
- [ ] Verify popup shows 🎂 emoji for today's birthday
- [ ] Verify popup shows employee name and calculated age
- [ ] Create employee with birth_date set to tomorrow
- [ ] Reload page, verify birthday appears in timeline "Сьогодні" section (if today)
- [ ] Create employee with birth_date in 5 days
- [ ] Verify appears in timeline "Найближчі 7 днів" section with 🎉 emoji
- [ ] Click employee name in timeline, verify navigates to card
- [ ] Verify birthday events appear alongside status and document events
- [ ] Test age calculation with various birth years
- [ ] Test leap year birthdays (Feb 29)
- [ ] Document any birthday tracking issues

### TASK 8: Summary Table View Testing

**Files:**
- Test: client/src/App.vue (Table view)
- Verify: Inline editing, filters, empty value filter, ID navigation

**Steps:**
- [ ] Navigate to /table
- [ ] Verify table shows only columns with show_in_table=yes from schema
- [ ] Verify ID column center-aligned with title attribute
- [ ] Double-click on cell with editable_in_table=yes, verify inline editing activates
- [ ] Edit value, press Enter or click outside, verify saves and updates CSV
- [ ] Double-click on ID cell, verify navigates to /cards/:id
- [ ] Test multi-select filters for select fields
- [ ] Check multiple values in one filter, verify OR logic (shows rows matching any)
- [ ] Test "(Пусто)" empty value checkbox, verify filters rows with empty values
- [ ] Apply multiple column filters, verify AND logic (all filters must match)
- [ ] Click "Clear Filters" button, verify all filters reset
- [ ] Verify filter state persists when navigating away and back
- [ ] Verify columnFilters uses __EMPTY__ sentinel for empty checks
- [ ] Test table with 100+ employees, verify performance
- [ ] Document any table issues or filter bugs

### TASK 9: Custom Reports Testing

**Files:**
- Test: client/src/App.vue (Reports view)
- Test: server/src/index.js (GET /api/reports/custom)
- Verify: Filter builder, preview, CSV export, column selection

**Steps:**
- [ ] Navigate to /reports
- [ ] Verify filter builder shows all fields from schema
- [ ] Add filter: select field, select condition (contains, equals, not_equals, empty, not_empty)
- [ ] For text field, select "contains", enter value, click "Додати фільтр"
- [ ] Verify filter appears in active filters list with ✖️ remove button
- [ ] For select field, verify condition dropdown shows field options
- [ ] For date field, verify date picker appears for value input
- [ ] Add multiple filters, verify preview table shows results (max 100 rows)
- [ ] Verify AND logic (all filters must match)
- [ ] Test "empty" and "not_empty" conditions (value input should be disabled)
- [ ] Remove filter by clicking ✖️, verify preview updates
- [ ] Click "Очистити фільтри", verify all filters cleared
- [ ] Select/deselect columns in column selector
- [ ] Click "Експорт в CSV", verify downloads file
- [ ] Verify filename format: report_YYYY-MM-DD_HH-mm-ss.csv
- [ ] Open exported CSV in Excel, verify UTF-8 BOM encoding (no garbled Cyrillic)
- [ ] Verify only selected columns included
- [ ] Verify filtered data matches preview
- [ ] Test with complex filters (5+ conditions), verify performance
- [ ] Document any report generation issues

### TASK 10: CSV Import Testing

**Files:**
- Test: client/src/App.vue (Import view)
- Test: server/src/index.js (POST /api/employees/import)
- Test: server/src/sync-template.js (template sync)
- Verify: Template download, upload, validation, error handling

**Steps:**
- [ ] Navigate to /import
- [ ] Verify "Імпорт" tab appears in navigation
- [ ] Click "Завантажити шаблон CSV", verify downloads employees_import_sample.csv
- [ ] Open template in Excel, verify UTF-8 BOM encoding (no garbled text)
- [ ] Verify template headers match current schema (all fields from fields_schema.csv)
- [ ] Verify template auto-synced on server startup (run.sh calls sync-template.js)
- [ ] Create valid CSV: fill last_name, first_name, leave employee_id empty
- [ ] Upload CSV, verify import succeeds
- [ ] Verify auto-generated sequential IDs
- [ ] Verify all fields imported correctly (check employees.csv)
- [ ] Create CSV with existing employee_id, verify row skipped
- [ ] Create CSV with invalid data (wrong date format, invalid select value)
- [ ] Upload, verify validation errors shown with clear messages
- [ ] Create CSV with partial columns (only required fields)
- [ ] Upload, verify succeeds with empty values for missing fields
- [ ] Create CSV with wrong encoding (no BOM), verify handles correctly or shows error
- [ ] Verify import results show: rows added, rows skipped, errors
- [ ] Check logs.csv, verify CREATE entries for imported employees
- [ ] Document any import issues or validation problems

### TASK 11: Audit Logs Testing

**Files:**
- Test: client/src/App.vue (Logs view)
- Test: server/src/store.js (writeLog, cleanupLogs)
- Test: data/logs.csv
- Verify: Log entries, auto-cleanup, sorting, field labels

**Steps:**
- [ ] Navigate to /logs
- [ ] Verify logs displayed sorted by timestamp descending (newest first)
- [ ] Create employee, verify CREATE log entry with employee_id and name
- [ ] Update employee field, verify UPDATE log entry with field_name, old_value, new_value
- [ ] Verify field_name shows human-readable label (e.g., "Пригодность (fit_status)")
- [ ] Delete employee, verify DELETE log entry
- [ ] Upload document, verify UPDATE log for file field
- [ ] Verify log_id is sequential
- [ ] Check data/config.csv for max_log_entries value
- [ ] Count rows in logs.csv, verify auto-cleanup when exceeds max_log_entries
- [ ] Trigger cleanup by creating many log entries (update employee 1000+ times)
- [ ] Verify oldest entries removed, newest preserved
- [ ] Verify logs.csv maintains UTF-8 BOM encoding
- [ ] Test log search/filter if implemented
- [ ] Document any logging issues or missing entries

### TASK 12: URL Routing and Navigation Testing

**Files:**
- Test: client/src/main.js (Vue Router setup)
- Test: client/src/App.vue (route handling)
- Verify: All routes, persistent state, direct links, auto-load

**Steps:**
- [ ] Test route / - verify dashboard loads
- [ ] Test route /cards - verify cards view loads, first employee auto-loaded
- [ ] Test route /cards/:id - verify specific employee loads by ID
- [ ] Refresh page at /cards/5, verify employee 5 still loaded (persistent state)
- [ ] Test route /table - verify table view loads
- [ ] Test route /reports - verify reports view loads
- [ ] Test route /import - verify import view loads
- [ ] Test route /logs - verify logs view loads
- [ ] Test invalid route (e.g., /nonexistent), verify handles gracefully
- [ ] Navigate between routes using tab bar buttons
- [ ] Verify currentView reactive state updates correctly
- [ ] Test browser back/forward buttons, verify navigation works
- [ ] Copy URL from address bar, open in new tab, verify works
- [ ] Test route navigation with unsaved changes, verify warning dialog
- [ ] Verify all navigation uses router.push() not reactive variables
- [ ] Document any routing issues or broken links

### TASK 13: Data Model and CSV Operations Testing

**Files:**
- Test: server/src/csv.js (readCSV, writeCSV)
- Test: server/src/store.js (all CRUD operations)
- Test: data/employees.csv, data/fields_schema.csv, data/config.csv
- Verify: Row normalization, BOM encoding, delimiter, file paths

**Steps:**
- [ ] Read employees.csv in text editor, verify delimiter is ; (semicolon)
- [ ] Verify UTF-8 BOM present (hex editor or file command)
- [ ] Verify header row intact with all columns
- [ ] Create employee via API, verify row added to CSV
- [ ] Verify all columns present (row normalization with empty strings)
- [ ] Edit employees.csv directly in Excel, add/modify row
- [ ] Refresh browser, verify changes appear in UI
- [ ] Verify file paths stored as relative (files/employee_ID/filename.ext)
- [ ] Test with employee IDs: 1, 2, 3 (sequential numeric, not UUIDs)
- [ ] Delete employee via API, verify row removed from CSV
- [ ] Verify associated files directory deleted (files/employee_ID/)
- [ ] Edit fields_schema.csv, add new field
- [ ] Restart server, verify new field appears in UI
- [ ] Verify employees.csv auto-migrated with new column
- [ ] Edit config.csv, change max_log_entries
- [ ] Restart server, verify new config value used
- [ ] Test with special characters in values (quotes, semicolons, newlines)
- [ ] Verify CSV escaping/quoting works correctly
- [ ] Document any CSV parsing or encoding issues

### TASK 14: Dynamic UI Schema Testing

**Files:**
- Test: server/src/schema.js (loadFieldsSchema)
- Test: client/src/App.vue (schema-driven UI generation)
- Test: data/fields_schema.csv
- Verify: No hardcoded values, dynamic form groups, table columns, filters

**Steps:**
- [ ] Read fields_schema.csv, verify 8 columns: field_order, field_name, field_label, field_type, field_options, show_in_table, field_group, editable_in_table
- [ ] Verify GET /api/fields-schema returns structured data (groups, tableFields, allFields)
- [ ] Verify form groups in cards view match field_group from schema
- [ ] Verify field labels match field_label from schema (no hardcoded labels)
- [ ] Verify dropdown options match field_options from schema (pipe-separated)
- [ ] Verify table columns match show_in_table=yes fields
- [ ] Verify inline editing enabled only for editable_in_table=yes fields
- [ ] Verify field types rendered correctly (text, select, textarea, date, email, tel, number, file)
- [ ] Test positional convention for employment_status options:
  - options[0] = working status (e.g., "Працює")
  - options[1] = fired status
  - options[2] = vacation status (✈️ emoji)
  - options[3] = sick leave status (🏥 emoji)
- [ ] Verify dashboard stat cards use all employment_status options dynamically
- [ ] Verify no hardcoded status strings in code (search for "Працює", "Відпустка", etc.)
- [ ] Change field_label in schema, verify UI updates after reload
- [ ] Add new option to field_options, verify appears in dropdown
- [ ] Change show_in_table from yes to no, verify column hidden
- [ ] Verify file fields (field_type=file) auto-generate _issue_date and _expiry_date columns
- [ ] Document any hardcoded values or schema violations

### TASK 15: File Upload and Storage Testing

**Files:**
- Test: server/src/index.js (multer configuration)
- Test: files/ directory
- Verify: File naming, size limits, MIME types, folder structure

**Steps:**
- [ ] Upload PDF file via document upload popup
- [ ] Verify file saved to files/employee_ID/ directory
- [ ] Verify filename format: {field_name}.{original_extension} (e.g., driver_license_file.pdf)
- [ ] Verify temporary file (temp_{timestamp}.*) renamed correctly
- [ ] Upload JPG image, verify saved as {field_name}.jpg
- [ ] Upload PNG, GIF, WEBP images, verify all accepted
- [ ] Try to upload 11MB file (exceeds 10MB limit), verify rejected
- [ ] Try to upload .exe or .zip file, verify rejected
- [ ] Upload multiple documents for same employee, verify all saved
- [ ] Delete employee via API, verify entire files/employee_ID/ directory removed
- [ ] Upload document, manually delete file from disk
- [ ] Reload page, verify UI handles missing file gracefully
- [ ] Test POST /api/employees/:id/open-folder, verify opens folder in OS
- [ ] Test on different OS (macOS open, Linux xdg-open, Windows explorer)
- [ ] Verify relative paths in CSV work across different machines
- [ ] Document any file handling issues

### TASK 16: Configuration and Environment Testing

**Files:**
- Test: run.sh, stop.sh
- Test: server/package.json, client/package.json
- Test: client/vite.config.js
- Verify: Dev mode, prod mode, port configuration, proxy

**Steps:**
- [ ] Run ./stop.sh, verify stops all services
- [ ] Run ./run.sh (dev mode), verify backend on :3000, frontend on :5173
- [ ] Verify npm install runs automatically if node_modules missing
- [ ] Verify sync-template.js runs before starting services
- [ ] Test ./run.sh prod mode, verify backend on :3001, frontend on :5174
- [ ] Verify both modes work concurrently
- [ ] Check vite.config.js, verify proxy for /api, /files, /data to :3000
- [ ] Test API calls from frontend, verify proxy works
- [ ] Test hot module replacement (HMR) in dev mode
- [ ] Edit App.vue, verify changes reflect without full reload
- [ ] Kill backend process, verify frontend shows connection errors
- [ ] Restart backend, verify frontend reconnects
- [ ] Run npm run build in client/, verify production build succeeds
- [ ] Run npm run preview in client/, verify preview server works
- [ ] Document any configuration or startup issues

### TASK 17: Cross-Feature Integration Testing

**Files:**
- Test: All components together
- Verify: Data consistency, workflow completeness, edge cases

**Steps:**
- [ ] Complete workflow: Create employee → Upload documents → Set status → Verify logs
- [ ] Create employee on one view (cards), verify appears in table and dashboard
- [ ] Update employee in table (inline edit), verify reflected in cards view
- [ ] Set vacation status with end_date in 2 days, verify timeline shows correctly
- [ ] Wait/modify end_date to yesterday, reload, verify auto-restores working status
- [ ] Upload document with expiry_date today, verify appears in notifications and timeline
- [ ] Create employee with birthday today, verify birthday notification and timeline entry
- [ ] Delete employee with documents, verify all data removed (CSV row, files, logs)
- [ ] Import CSV with 50 employees, verify dashboard stats update
- [ ] Filter table by multiple criteria, verify report matches
- [ ] Export filtered report to CSV, reimport, verify data consistency
- [ ] Edit fields_schema.csv (add field), restart, verify UI updates without data loss
- [ ] Test with empty database (no employees), verify UI handles gracefully
- [ ] Test with 500+ employees, verify performance acceptable
- [ ] Test concurrent edits (two browser tabs), verify no data corruption
- [ ] Test browser refresh during unsaved edits, verify warning works
- [ ] Document any integration issues or data inconsistencies

### TASK 18: Documentation Verification

**Files:**
- Verify: CLAUDE.md, README.md, README.uk.md
- Check: All documented features exist and work as described

**Steps:**
- [ ] Read CLAUDE.md section by section
- [ ] For each documented feature, verify exists and works correctly
- [ ] Check API endpoints list against actual server/src/index.js routes
- [ ] Verify data model matches employees.csv columns
- [ ] Check CSV format notes against actual CSV files
- [ ] Verify startup commands work as documented
- [ ] Test all code examples in documentation
- [ ] Check README.md Quick Start section, verify steps work
- [ ] Verify README.uk.md matches README.md (same features)
- [ ] Check for outdated information or missing features
- [ ] Verify screenshots/examples (if any) are current
- [ ] Check .docs-sync.md checklist, verify sync status
- [ ] Document any discrepancies between docs and implementation

### FINAL TASK: Test Report Generation

**Files:**
- Create: docs/test-reports/2026-02-10-comprehensive-test-report.md

**Steps:**
- [ ] Compile all test results from Tasks 1-18
- [ ] Categorize findings: Working as documented, Issues found, Recommendations
- [ ] List all verified features with checkmarks
- [ ] List all bugs or issues with severity (Critical, High, Medium, Low)
- [ ] Provide reproduction steps for each issue
- [ ] Include screenshots or logs where relevant
- [ ] Suggest fixes or improvements
- [ ] Summarize overall project health
- [ ] Document test coverage: what was tested, what wasn't
- [ ] Create action items for any critical issues
- [ ] Save report to docs/test-reports/ directory
- [ ] Add summary to progress file

## Validation

- [ ] All 18 tasks completed
- [ ] All documented features tested
- [ ] Test report created with findings
- [ ] Any critical issues documented with reproduction steps

## Documentation

- [ ] Test report added to docs/test-reports/
- [ ] Update CLAUDE.md if testing reveals documentation errors
- [ ] Move this plan to docs/plans/completed/
