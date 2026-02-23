# ID-Based Field Schema Architecture

## Overview

Refactor the CRM field system from fragile `field_name`-based references to a stable `field_id`-based architecture. Currently, `field_name` (e.g., `birth_date`, `employment_status`) serves simultaneously as CSV column header, JSON key, DOCX placeholder, business logic lookup, and audit trail reference. Renaming any field breaks the entire system.

**Goal**: Allow free renaming of `field_name` (CSV column headers, labels) while keeping `field_id` and `role` stable. All business logic, DOCX placeholders, and inter-system references use `field_id` or `role` instead of `field_name`.

**Key decisions**:
- `field_id` format: `f_<original_field_name>` (e.g., `f_last_name`, `f_birth_date`) — stable, human-readable, never changes after creation
- `role` column: semantic role for ~16 critical fields used in business logic (STATUS, BIRTH_DATE, LAST_NAME, etc.)
- DOCX placeholders: transition to `{f_last_name}` format, with backwards compatibility for old `{last_name}` format
- Auto-migration: on server start, detect field_name renames by comparing field_id mapping and auto-rename CSV columns
- Field Schema Editor UI: in-app page for renaming fields with impact preview (affected employees, templates, logs)

## Context (from discovery)

**Files/components involved**:
- `data/fields_schema.template.csv` — schema definition (add field_id, role columns)
- `server/src/schema.js` — schema loading, DEFAULT columns, FIELD_LABELS, column constants
- `server/src/store.js` — ~30 hardcoded field_name references (status, birth_date, names, dates)
- `server/src/routes/employees.js` — status validation, name building (~10 references)
- `server/src/routes/misc.js` — search, placeholder reference (~8 references)
- `server/src/routes/employee-files.js` — photo/file field references (~5 references)
- `server/src/declension.js` — name/grade/position declension (~20 references)
- `server/src/utils.js` — buildFullName utility (~3 references)
- `server/src/docx-generator.js` — placeholder extraction and data preparation (~10 references)
- `client/src/composables/useFieldsSchema.js` — schema loading for frontend
- `client/src/composables/useStatusManagement.js` — status field lookup
- `client/src/utils/employee.js` — displayName utility
- `client/src/views/EmployeeCardsView.vue` — fallback field list
- `client/src/views/DashboardView.vue` — status/position field references
- `client/src/views/SystemSettingsView.vue` — add Field Schema Editor tab
- NEW: `client/src/views/FieldSchemaEditorView.vue` — UI for field renaming with impact preview
- NEW: `client/src/composables/useFieldSchemaEditor.js` — field schema editor state management

**Related patterns found**:
- Role-based lookup replaces `schema.find(f => f.field_name === 'employment_status')` → `schema.find(f => f.role === 'STATUS')`
- Field ID mapping: `field_id` ↔ `field_name` stored in `data/field_mapping.csv` for rename detection
- Backwards-compatible DOCX: prepareData() generates both `{f_last_name}` and `{last_name}` keys

**Dependencies**: None — this is a standalone refactoring of existing infrastructure.

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Make small, focused changes
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
- **CRITICAL: all tests must pass before starting next task** — no exceptions
- **CRITICAL: update this plan file when scope changes during implementation**
- Run tests after each change
- Maintain backward compatibility throughout (old field_name references still work during transition)

## Testing Strategy

- **Unit tests**: `server/test/` — test schema utilities, role-based lookups, migration logic, DOCX generator changes
  - Run: `cd server && npm test`
- **Integration tests**: `server/test/` — test API endpoints with new schema
  - Run: `cd server && npm run test:integration`
- **E2E tests**: `tests/e2e/` — verify full workflows still work after refactoring
  - Run: `npm run test:e2e`

## Progress Tracking

- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope

## Roles Reference

| Role | Current field_name | field_id | Purpose |
|------|-------------------|----------|---------|
| PHOTO | photo | f_photo | Employee photo field |
| EMPLOYEE_ID | employee_id | f_employee_id | Primary key |
| LAST_NAME | last_name | f_last_name | Surname (display, declension) |
| FIRST_NAME | first_name | f_first_name | Given name (display, declension) |
| MIDDLE_NAME | middle_name | f_middle_name | Patronymic (display, declension) |
| BIRTH_DATE | birth_date | f_birth_date | Birthday/retirement calculations |
| GENDER | gender | f_gender | Gender for declension |
| STATUS | employment_status | f_employment_status | Current employment status |
| STATUS_START | status_start_date | f_status_start_date | Status start date |
| STATUS_END | status_end_date | f_status_end_date | Status end date |
| GRADE | grade | f_grade | Military grade (declension) |
| POSITION | position | f_position | Military position (declension) |
| INDECL_NAME | indeclinable_name | f_indeclinable_name | Flag: surname not declined |
| INDECL_FIRST | indeclinable_first_name | f_indeclinable_first_name | Flag: first name not declined |
| INDECL_GRADE | indeclinable_grade | f_indeclinable_grade | Flag: grade not declined |
| INDECL_POSITION | indeclinable_position | f_indeclinable_position | Flag: position not declined |

Fields without a role (e.g., department, education, salary_amount) are regular data fields — no hardcoded business logic references them by name.

## Implementation Steps

### Task 1: Add field_id and role columns to fields_schema

- [x] Update `data/fields_schema.template.csv`: add `field_id` and `role` columns to all rows
  - field_id = `f_<field_name>` for every field
  - role = one of the 16 roles above for critical fields, empty for regular fields
  - New column order: `field_id;field_order;field_name;field_label;field_type;field_options;show_in_table;field_group;editable_in_table;role`
- [x] Update `FIELD_SCHEMA_COLUMNS` in `server/src/schema.js` to include `field_id` and `role`
- [x] Update `loadEmployeeColumns()` in `server/src/schema.js` to read and cache field_id mapping alongside column names
- [x] Update `syncFieldsSchemaWithTemplate()` in `server/src/store.js` to handle new columns during merge
- [x] Ensure `migrateEmployeesSchema()` in `server/src/store.js` still works with new schema format
- [x] Write unit tests for schema loading with field_id and role columns
- [x] Run `cd server && npm test` — must pass before next task

### Task 2: Create role-based field resolution utilities

- [x] Create `server/src/field-utils.js` with exported utility functions:
  - `ROLES` constant object: `{ PHOTO: 'PHOTO', EMPLOYEE_ID: 'EMPLOYEE_ID', LAST_NAME: 'LAST_NAME', ... }`
  - `getFieldByRole(schema, role)` → returns full field object or null
  - `getFieldNameByRole(schema, role)` → returns field_name string or null
  - `getFieldIdByRole(schema, role)` → returns field_id string or null
  - `buildFieldIdToNameMap(schema)` → returns Map<field_id, field_name>
  - `buildFieldNameToIdMap(schema)` → returns Map<field_name, field_id>
  - `buildNameFields(schema)` → returns `{ lastName, firstName, middleName }` field_name values (for name display)
  - `buildStatusFields(schema)` → returns `{ status, startDate, endDate }` field_name values
- [x] Export utilities from `field-utils.js`
- [x] Write comprehensive unit tests in `server/test/field-utils.test.js`:
  - Test getFieldByRole with valid/invalid roles
  - Test getFieldNameByRole with valid/invalid roles
  - Test buildFieldIdToNameMap correctness
  - Test buildNameFields and buildStatusFields
  - Test with empty/missing role fields (graceful fallback)
- [x] Run `cd server && npm test` — must pass before next task

### Task 3: Replace hardcoded field_name lookups in store.js

Replace all hardcoded `field_name === 'employment_status'` / `emp.birth_date` / `emp.last_name` patterns with role-based lookups.

- [ ] Add schema loading at module level or pass schema to functions that need role lookups
- [ ] Replace `employment_status` hardcoded lookups (~4 places):
  - `getDashboardStats()` line ~343: `schema.find(f => f.field_name === 'employment_status')` → `getFieldByRole(schema, ROLES.STATUS)`
  - `getDashboardEvents()` line ~530: same pattern
  - `syncStatusEventsForEmployee()` line ~1669: same pattern
  - All `emp.employment_status` → `emp[statusFieldName]` using resolved field name
- [ ] Replace `birth_date` hardcoded lookups (~6 places):
  - `getRetirementEvents()` lines ~790-842: `emp.birth_date` → `emp[birthDateFieldName]`
  - `getBirthdayEvents()` lines ~885-938: same pattern
- [ ] Replace `last_name`, `first_name`, `middle_name` hardcoded lookups (~8 places):
  - All name-building patterns `[emp.last_name, emp.first_name, emp.middle_name]` → use `buildNameFields(schema)` utility
  - Create helper: `buildEmployeeName(emp, schema)` in field-utils.js
- [ ] Replace `status_start_date`, `status_end_date` hardcoded lookups (~10 places):
  - `syncStatusEventsForEmployee()`: use `buildStatusFields(schema)` to get field names
  - `getDashboardEvents()`: same
  - All `emp.status_start_date` / `emp.status_end_date` → `emp[startDateFieldName]`
- [ ] Replace `active` field checks — keep as-is (system field, not user-configurable)
- [ ] Write/update unit tests for modified store functions
- [ ] Run `cd server && npm test` — must pass before next task

### Task 4: Replace hardcoded field_name lookups in routes and declension

- [ ] `server/src/routes/employees.js`:
  - `validateStatusEventInput()` line ~81: replace `field_name === 'employment_status'` with role-based lookup
  - Status history recording: replace hardcoded `employment_status`, `status_start_date`, `status_end_date` references
  - Employee name building for logs: use `buildEmployeeName()` utility
- [ ] `server/src/routes/misc.js`:
  - Global search line ~87: replace `schema.filter(f => f.field_type !== 'file')` → keep (this is type-based, not name-based, already correct)
  - Placeholder reference: replace hardcoded `full_name`, `last_name` labels with schema-driven lookup
- [ ] `server/src/routes/employee-files.js`:
  - Replace `{ photo: relativePath }` with role-based field name lookup
  - Replace name building for log messages with `buildEmployeeName()`
- [ ] `server/src/declension.js`:
  - `generateDeclinedNames()`: replace `data.last_name`, `data.first_name`, `data.middle_name` with role-resolved field names
  - Replace `data.indeclinable_name`, `data.indeclinable_first_name` with role-resolved field names
  - Replace `data.gender` with role-resolved field name
  - `generateDeclinedGradePosition()`: replace `data.grade`, `data.position` with role-resolved field names
  - Replace `data.indeclinable_grade`, `data.indeclinable_position` with role-resolved field names
  - **Key change**: declension functions receive schema as parameter; output placeholder keys use field_id prefix (e.g., `f_last_name_genitive` instead of `last_name_genitive`)
- [ ] `server/src/utils.js`:
  - Replace `buildFullName()` to use role-based name field resolution
- [ ] Write/update unit tests for:
  - declension with role-based field resolution
  - utils.buildFullName with role-based resolution
  - routes that changed
- [ ] Run `cd server && npm test` and `cd server && npm run test:integration` — must pass before next task

### Task 5: Implement field_mapping tracking and auto-rename on startup

- [ ] Create `data/field_mapping.csv` with columns: `field_id;field_name` — snapshot of current field_id → field_name mapping
- [ ] Add `FIELD_MAPPING_COLUMNS` to `server/src/schema.js`: `["field_id", "field_name"]`
- [ ] Add `loadFieldMapping()` and `saveFieldMapping()` to `server/src/store.js`
- [ ] Create `server/src/auto-migrate.js` with `runAutoMigration()`:
  1. Load `fields_schema.csv` (current state: field_id + field_name)
  2. Load `data/field_mapping.csv` (previous state: field_id + old field_name)
  3. If field_mapping.csv doesn't exist: create it from current schema, return (first run)
  4. Compare: for each field_id, check if field_name changed
  5. If renames detected:
     a. Rename columns in `employees.csv` (load all rows, rename keys, save)
     b. Rename columns in `employees_remote.csv` (same process)
     c. Update `placeholder_fields` in `templates.csv` (replace old field_name with new)
     d. Update `field_name` column in `logs.csv` (replace old field_name with new)
     e. Auto-generate `_issue_date` and `_expiry_date` column renames for file-type fields
  6. Save updated `data/field_mapping.csv`
  7. Log all renames performed
- [ ] Call `runAutoMigration()` during server startup in `server/src/index.js` (before route registration, after schema load)
- [ ] Write comprehensive unit tests in `server/test/auto-migrate.test.js`:
  - Test first run (creates field_mapping.csv)
  - Test no renames (field_mapping matches schema)
  - Test single field rename (employees.csv column renamed)
  - Test file field rename (auto-renames _issue_date and _expiry_date columns)
  - Test templates.csv placeholder_fields update
  - Test logs.csv field_name column update
  - Test error handling (missing files, corrupt data)
- [ ] Run `cd server && npm test` — must pass before next task

### Task 6: Switch DOCX generation to field_id-based placeholders

- [ ] Update `prepareData()` in `server/src/docx-generator.js`:
  - Accept schema as parameter
  - Build field_name → field_id mapping from schema
  - For each employee field: add BOTH `{field_id}` key (primary) AND `{field_name}` key (backwards compatibility)
  - Example: employee has `birth_date: "1990-05-15"` → prepared data gets `f_birth_date: "1990-05-15"` AND `birth_date: "1990-05-15"`
- [ ] Update declension placeholder keys:
  - `generateDeclinedNames()` output: `f_last_name_genitive` (primary) + `last_name_genitive` (compat)
  - `generateDeclinedGradePosition()` output: `f_grade_genitive` (primary) + `grade_genitive` (compat)
  - `full_name` computed placeholder: `f_full_name` (primary) + `full_name` (compat)
- [ ] Update case variant generation:
  - Generate `{f_last_name_upper}` and `{last_name_upper}` (both)
  - Generate `{f_last_name_cap}` and `{last_name_cap}` (both)
- [ ] Update special placeholders:
  - Keep `{current_date}` and `{current_datetime}` as-is (no field_id for these)
- [ ] Update `extractPlaceholders()`:
  - Return extracted placeholder names as-is (they come from DOCX content)
  - Add validation: flag placeholders that match neither field_id nor field_name
- [ ] Update `data_snapshot` in generated_documents.csv:
  - Store with field_id keys (stable across renames)
  - Include field_name → field_id mapping in snapshot for historical reference
- [ ] Update placeholder reference endpoint (`GET /api/placeholder-preview`):
  - Show field_id as primary placeholder format (e.g., `{f_last_name}`)
  - Show field_name as legacy format (e.g., `{last_name}`)
  - Group: add note about migration to field_id format
- [ ] Write/update unit tests in `server/test/docx-generator.test.js`:
  - Test prepareData() generates both field_id and field_name keys
  - Test declension placeholders use field_id prefix
  - Test backwards compatibility (old {last_name} placeholders still work)
  - Test extractPlaceholders() with mixed old/new format
- [ ] Run `cd server && npm test` — must pass before next task

### Task 7: Update frontend

- [ ] Update `client/src/composables/useFieldsSchema.js`:
  - Include `fieldId` and `role` in field objects returned by `loadSchema()`
  - Add `getFieldByRole(role)` utility function
  - Add `getFieldNameByRole(role)` utility function
  - Export role constants: `ROLES` object matching backend
- [ ] Update `client/src/composables/useStatusManagement.js`:
  - Replace `allFieldsSchema.value.find(f => f.key === 'employment_status')` with `getFieldByRole('STATUS')`
- [ ] Update `client/src/utils/employee.js`:
  - Replace hardcoded `employee.last_name, employee.first_name, employee.middle_name` with schema-driven name field resolution
  - Accept schema parameter or use singleton schema from useFieldsSchema
- [ ] Update `client/src/views/EmployeeCardsView.vue`:
  - Remove hardcoded `employeeFields` fallback list (lines 18-36), use schema-driven field list
- [ ] Update `client/src/views/DashboardView.vue`:
  - Replace hardcoded `emp.position` references with role-based field lookup
  - Replace hardcoded `employment_status` field lookup
- [ ] Update `client/src/views/PlaceholderReferenceView.vue`:
  - Display field_id as primary placeholder format
  - Add visual indicator for new vs legacy format
- [ ] Run E2E tests: `npm run test:e2e` — must pass before next task

### Task 8: Create production migration script

- [ ] Create `server/src/migrate-to-field-id.js` — one-time migration script:
  1. Read current `data/fields_schema.csv`
  2. Check if `field_id` column already exists (skip if migrated)
  3. Generate `field_id = f_<field_name>` for each field
  4. Assign `role` values to the 16 critical fields (see Roles Reference above)
  5. Write updated `data/fields_schema.csv` with new columns
  6. Create `data/field_mapping.csv` (initial snapshot)
  7. Log migration summary
- [ ] Add migration to `run.sh` startup sequence:
  - Run migration script after `sync-template.js` and before server start
  - Migration is idempotent (safe to run multiple times)
- [ ] Update `fields_schema.template.csv` (already done in Task 1, verify consistency)
- [ ] Write unit test for migration script:
  - Test migration on schema without field_id (adds columns)
  - Test migration on schema with field_id (no-op)
  - Test role assignment correctness
- [ ] Run `cd server && npm test` — must pass before next task

### Task 9: Update DEFAULT fallback lists and cleanup

- [ ] Review `DEFAULT_EMPLOYEE_COLUMNS` in `server/src/schema.js`:
  - These are field_name values (CSV column headers) — keep as-is for fallback
  - Add comment explaining they must match fields_schema.template.csv field_name values
- [ ] Review `FIELD_LABELS` in `server/src/schema.js`:
  - Deprecate: add comment that labels should come from fields_schema.csv `field_label` column
  - Keep for backwards compatibility but mark as deprecated
- [ ] Remove any remaining hardcoded field_name references found during implementation
- [ ] Update CI workflow (`.github/workflows/tests.yml`):
  - Ensure migration script runs during CI setup
  - Verify field_mapping.csv is created during test setup
- [ ] Run full test suite: `cd server && npm test` and `cd server && npm run test:integration` and `npm run test:e2e`

### Task 10: Field Schema Management UI

Add a UI page in SystemSettings for editing fields_schema — renaming fields, changing labels, reordering, with preview of impact and confirmation.

- [ ] Create new API endpoint `GET /api/fields-schema/details`:
  - Returns full schema with field_id, role, field_name, field_label, field_type, field_options, field_group, field_order
  - Includes impact stats per field: count of employees with non-empty values, count of templates using this placeholder, count of log entries referencing this field
- [ ] Create new API endpoint `PUT /api/fields-schema`:
  - Accepts updated schema array (field_id is immutable, field_name/field_label/field_order/field_options can change)
  - Validates: no duplicate field_name, no empty field_name, no reserved characters in field_name
  - Validates: role fields cannot be deleted (only renamed)
  - Triggers auto-rename migration immediately (not on next restart)
  - Returns: migration summary (list of renames performed, rows affected per CSV file)
  - Creates audit log entry
- [ ] Create new API endpoint `GET /api/fields-schema/rename-preview`:
  - Query param: `field_id` and `new_field_name`
  - Returns impact preview: number of employees.csv rows, templates affected, log entries, DOCX placeholder warnings
  - Does NOT apply changes — read-only preview
- [ ] Create `client/src/composables/useFieldSchemaEditor.js`:
  - Load full schema with impact stats
  - Track edits (dirty state per field)
  - Rename preview request before apply
  - Apply changes with confirmation modal
  - Reset/cancel functionality
- [ ] Create `client/src/views/FieldSchemaEditorView.vue`:
  - Table showing all fields: field_id (read-only), field_name (editable), field_label (editable), field_type (read-only), field_group (editable), field_order (drag or number)
  - Color-coded role badge for fields with roles (non-removable)
  - Inline editing for field_name and field_label
  - "Preview changes" button → shows modal with:
    - List of field_name renames detected
    - Per-rename: employees affected, templates affected, logs affected
    - Warning for DOCX templates that use old placeholder names
  - "Apply changes" button → confirmation dialog → calls PUT endpoint
  - "Cancel" button → reverts all edits
  - Add new field button (generates field_id = `f_<field_name>`, no role)
- [ ] Add FieldSchemaEditorView as a tab in `SystemSettingsView.vue`:
  - New tab: "Схема полів" (Field Schema)
  - Tab order: Імпорт | Логи | Схема полів
- [ ] Add route for direct access: `/field-schema` → FieldSchemaEditorView
- [ ] Write E2E tests in `tests/e2e/field-schema-editor.spec.js`:
  - Test: load schema editor, verify fields displayed
  - Test: rename field_label, preview, apply, verify label changed
  - Test: rename field_name, preview shows impact, apply, verify CSV columns renamed
  - Test: cancel reverts changes
  - Test: cannot delete role fields
  - Test: cannot set duplicate field_name
- [ ] Run `npm run test:e2e` — must pass before next task

### Task 11: Verify acceptance criteria

- [ ] Verify: renaming a field_name in fields_schema.csv auto-renames CSV columns on server restart
- [ ] Verify: renaming a field_name via UI triggers migration and updates all CSVs
- [ ] Verify: all business logic uses role-based lookups (no hardcoded field_name in store/routes/declension)
- [ ] Verify: DOCX generation works with both {f_field_name} and {field_name} placeholders
- [ ] Verify: existing production data survives migration without data loss
- [ ] Verify: frontend displays correct data after field_name rename
- [ ] Verify: placeholder reference page shows field_id format as primary
- [ ] Verify: UI preview correctly shows rename impact (employees, templates, logs affected)
- [ ] Run full test suite (unit + integration + E2E)
- [ ] Run linter — all issues must be fixed

### Task 12: [Final] Update documentation

- [ ] Update `CLAUDE.md`:
  - Document field_id and role columns in Data Storage Architecture section
  - Document auto-migration behavior in Key Technical Decisions
  - Document role-based lookup pattern in Backend Patterns
  - Document field_id placeholder format in Placeholder Syntax section
  - Update fields_schema.csv documentation with new columns
  - Document Field Schema Editor UI in Frontend Patterns section
  - Add FieldSchemaEditorView to Project Structure and Routing
- [ ] Update `README.md` if user-facing API changes (placeholder format documentation, field schema editor)
- [ ] Archive this plan to `docs/plans/completed/`

*Note: ralphex automatically moves completed plans to `docs/plans/completed/`*

## Technical Details

### fields_schema.csv new format

```csv
field_id;field_order;field_name;field_label;field_type;field_options;show_in_table;field_group;editable_in_table;role
f_photo;0;photo;Фото;photo;;no;Особисті дані;no;PHOTO
f_employee_id;1;employee_id;ID співробітника;text;;no;Особисті дані;no;EMPLOYEE_ID
f_last_name;2;last_name;Прізвище;text;;yes;Особисті дані;yes;LAST_NAME
f_first_name;3;first_name;Ім'я;text;;yes;Особисті дані;yes;FIRST_NAME
f_middle_name;4;middle_name;По батькові;text;;yes;Особисті дані;yes;MIDDLE_NAME
f_birth_date;5;birth_date;Дата народження;date;;no;Особисті дані;no;BIRTH_DATE
f_employment_status;6;employment_status;Статус роботи;select;Працює|Звільнений|Відпустка|Лікарняний|Відкомандирований;yes;Особисті дані;no;STATUS
f_department;10;department;Підрозділ;text;;no;Посада та робота;no;
f_grade;11;grade;Посада;text;;no;Посада та робота;no;GRADE
f_position;12;position;Звання;text;;no;Посада та робота;no;POSITION
...
```

### field_mapping.csv format

```csv
field_id;field_name
f_photo;photo
f_employee_id;employee_id
f_last_name;last_name
f_first_name;first_name
...
```

This file is auto-generated on first run and updated after each successful rename migration.

### Auto-rename algorithm

```
On server startup:
1. Load fields_schema.csv → Map<field_id, current_field_name>
2. Load field_mapping.csv → Map<field_id, previous_field_name>
3. For each field_id in schema:
   if current_field_name !== previous_field_name:
     renames[previous_field_name] = current_field_name
4. If renames is empty → done
5. For each CSV file (employees, employees_remote, templates, logs):
   Apply column renames
6. Save updated field_mapping.csv
```

### DOCX placeholder backwards compatibility

```javascript
// In prepareData():
const idToName = buildFieldIdToNameMap(schema);
const nameToId = buildFieldNameToIdMap(schema);

for (const [fieldName, value] of Object.entries(employeeData)) {
  const fieldId = nameToId.get(fieldName);
  if (fieldId) {
    prepared[fieldId] = safeValue;       // Primary: {f_last_name}
  }
  prepared[fieldName] = safeValue;       // Legacy: {last_name}
}
```

This ensures old templates with `{last_name}` still work, while new templates can use `{f_last_name}`.

### Declension placeholder output example

```javascript
// Before: last_name_genitive, full_name_dative
// After:  f_last_name_genitive (primary) + last_name_genitive (compat)

result[`f_last_name_${suffix}`] = declinedValue;    // Primary
result[`last_name_${suffix}`] = declinedValue;       // Backwards compat
result[`f_full_name_${suffix}`] = fullNameValue;     // Primary
result[`full_name_${suffix}`] = fullNameValue;       // Backwards compat
```

### Field Schema Editor UI

**API endpoints**:

```
GET  /api/fields-schema/details        — full schema + impact stats per field
GET  /api/fields-schema/rename-preview  — preview rename impact (read-only)
PUT  /api/fields-schema                 — apply schema changes + trigger migration
```

**Rename preview response example**:
```json
{
  "renames": [
    {
      "field_id": "f_birth_date",
      "old_name": "birth_date",
      "new_name": "date_of_birth",
      "impact": {
        "employees_affected": 142,
        "employees_remote_affected": 23,
        "templates_with_placeholder": 3,
        "log_entries_affected": 87,
        "docx_warning": "3 шаблони використовують {birth_date} — після перейменування вони будуть працювати через зворотну сумісність {field_name}"
      }
    }
  ]
}
```

**UI flow**:
1. User opens "Схема полів" tab in System Settings
2. Sees table: field_id | field_name | field_label | type | group | role
3. Clicks on field_name cell → inline edit
4. Changes `birth_date` → `date_of_birth`
5. Clicks "Попередній перегляд змін" → modal shows impact
6. Reviews: 142 employees, 3 templates, 87 logs will be updated
7. Clicks "Застосувати" → confirmation dialog
8. Backend runs migration immediately, returns summary
9. UI refreshes with updated schema

## Post-Completion

**Manual verification**:
- Test renaming a field in fields_schema.csv (e.g., `birth_date` → `date_of_birth`) and restarting server
- Verify employees.csv column is renamed
- Verify old DOCX templates with `{birth_date}` still generate correctly
- Verify new DOCX templates with `{f_birth_date}` generate correctly
- Verify dashboard, reports, and all views display correct data after rename

**Production deployment**:
- Backup all CSV files before deploying
- Migration script runs automatically on first start
- Verify field_mapping.csv is created
- Verify no data loss in employees.csv
