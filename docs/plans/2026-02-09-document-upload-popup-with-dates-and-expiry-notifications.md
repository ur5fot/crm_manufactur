# Document Management Enhancement: Upload Popup with Dates and Expiry Notifications

## Summary

Add document upload popup with registration/expiry dates, document expiry notifications (similar to status change notifications), accept images in addition to PDFs, and suggest new document types.

## Proposed New Document Types for fields_schema

- `military_id_file` - Військовий квиток (Military ID)
- `medical_certificate_file` - Медична довідка (Medical certificate)
- `insurance_file` - Страховий поліс (Insurance policy)
- `education_diploma_file` - Диплом про освіту (Education diploma)

(User can accept, modify, or reject any of these during implementation)

## Architecture

### Data Storage

For each `field_type=file` field, add 2 companion columns to employees.csv:
- `{field_name}_issue_date` (date) - Registration/issue date
- `{field_name}_expiry_date` (date) - Expiry date

These companion fields will be auto-generated in the schema loading logic (NOT manually added to fields_schema.csv) - they are derived from file fields. This keeps fields_schema clean and avoids 14+ manual rows.

### Files Involved

- `server/src/schema.js` - Auto-generate date companion columns for file fields
- `server/src/store.js` - Add getDashboardDocumentExpiryEvents(), migrate employees.csv to add new columns
- `server/src/index.js` - Extend file upload endpoint to accept issue_date/expiry_date, add document expiry API endpoint, accept images
- `client/src/App.vue` - Upload popup with date fields, document expiry notifications, accept images
- `data/fields_schema.template.csv` - Add proposed new document types

### Related Patterns

- Status change popup (showStatusChangePopup) - reuse modal pattern
- Status notifications (checkStatusChanges) - reuse notification pattern
- Dynamic document fields from fields_schema - existing convention

## Implementation Strategy

- **Testing approach**: Manual testing (this is a monolithic Vue app with no test framework set up)
- Follow existing patterns: popup modals, notification system, dynamic schema
- Keep changes minimal - reuse existing CSS classes and modal patterns
- Complete each task fully before moving to the next

## Tasks

### Task 1: Backend - Auto-generate document date columns

**Files:**
- Modify: `server/src/schema.js`
- Modify: `server/src/store.js`

- [x] In schema.js, when loading EMPLOYEE_COLUMNS from fields_schema, for each field with field_type=file, auto-append `{field_name}_issue_date` and `{field_name}_expiry_date` to the columns list
- [x] In store.js `initializeEmployeeColumns()`, ensure the auto-migration adds these new columns to employees.csv header
- [x] Test: restart server, verify employees.csv gets new date columns added to header

### Task 2: Backend - Extend file upload endpoint and add document expiry API

**Files:**
- Modify: `server/src/index.js`
- Modify: `server/src/store.js`

- [ ] Modify POST /api/employees/:id/files to accept `issue_date` and `expiry_date` in request body, save them to the employee record
- [ ] Accept images in addition to PDFs (jpg, jpeg, png, gif, webp) - update multer config and default extension
- [ ] Add GET /api/document-expiry endpoint in store.js: `getDocumentExpiryEvents()` - scans all employees for documents with expiry_date approaching (today or within 7 days), returns structured data with employee name, document label, expiry date
- [ ] Wire up the new endpoint in index.js
- [ ] Test: upload a file with dates via API, verify dates stored in employees.csv

### Task 3: Frontend - Document upload popup with date fields

**Files:**
- Modify: `client/src/App.vue`

- [ ] Replace inline file input with "Завантажити" button that opens a popup modal
- [ ] Create document upload popup (reuse vacation-notification-modal CSS pattern) with:
  - Document name shown in header
  - File picker (accept PDF + images)
  - Issue date input (type=date, optional)
  - Expiry date input (type=date, optional)
  - "Завантажити" and "Скасувати" buttons
- [ ] On upload, send file + issue_date + expiry_date to the existing file upload endpoint
- [ ] Show issue_date and expiry_date in the documents table for uploaded documents (add columns or show below filename)
- [ ] Allow editing dates for already-uploaded documents without re-uploading the file
- [ ] Test: open popup, select file, fill dates, upload, verify dates shown in table

### Task 4: Frontend - Document expiry notifications

**Files:**
- Modify: `client/src/App.vue`
- Modify: `client/src/api.js`

- [ ] Add api.getDocumentExpiry() in api.js
- [ ] Add checkDocumentExpiry() function similar to checkStatusChanges() - called on loadEmployees()
- [ ] Show notification popup when documents expire today or within 7 days:
  - Title: "Сповіщення про закінчення терміну дії документів"
  - List: employee name, document type, expiry date
  - Emoji: document emoji (📄) for expiring, warning (⚠️) for expired today
- [ ] Add document expiry events to dashboard timeline (getDashboardEvents extended or separate section)
- [ ] Test: set a document expiry_date to today, reload page, verify notification appears

### Task 5: Update fields_schema template with new document types

**Files:**
- Modify: `data/fields_schema.template.csv`

- [ ] Add proposed document types (military_id_file, medical_certificate_file, insurance_file, education_diploma_file) to fields_schema.template.csv with field_type=file, field_group=Документи
- [ ] Update field_order numbers accordingly
- [ ] Test: copy template to fields_schema.csv, verify new document types appear in UI

### Task 6: Documentation update

- [ ] Update CLAUDE.md with document dates architecture, new columns convention, document expiry notifications
- [ ] Update README.md and README.uk.md with new document management features

## Final Validation

- [ ] Manual test: full flow - upload document with dates, verify popup, verify dates saved
- [ ] Manual test: set expiry date to today, reload, verify notification
- [ ] Manual test: dashboard shows document expiry in timeline
- [ ] Manual test: images (jpg/png) upload works alongside PDF
- [ ] Manual test: existing documents still work (backwards compatibility)
- [ ] Verify server restarts cleanly with new schema columns
