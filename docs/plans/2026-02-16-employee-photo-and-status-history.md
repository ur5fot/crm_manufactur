# Employee Photo and Status History

## Overview
Two features for the employee card view:

1. **Employee Photo**: Dedicated photo upload/display area in the top-left corner of the employee card. Users can upload, change, and delete a photo. The photo is stored per-employee and displayed as an image preview. Not shown in the documents table.

2. **Employment Status History**: A separate `status_history.csv` records every employment status change. An icon button near the employment status field opens a popup showing the full status change timeline in a readable format.

## Context (from discovery)
- **Card view**: `client/src/views/EmployeeCardsView.vue` — right panel has field groups, documents table below
- **File management**: `server/src/routes/employee-files.js` — handles file upload/delete to `files/employee_{id}/`
- **Upload config**: `server/src/upload-config.js` — already allows JPG, PNG, GIF, WebP
- **Schema**: `data/fields_schema.template.csv` — 8 columns (field_order, field_name, field_label, field_type, field_options, show_in_table, field_group, editable_in_table)
- **Schema logic**: `server/src/schema.js` — `loadDocumentFields()` filters by `field_type === 'file'`, `loadEmployeeColumns()` auto-adds `_issue_date`/`_expiry_date` only for `field_type === 'file'`
- **Employee update**: `server/src/routes/employees.js` — detects changed fields and logs them
- **Store**: `server/src/store.js` — CSV read/write with promise-based file locks
- **Log columns**: log_id, timestamp, action, employee_id, employee_name, field_name, old_value, new_value, details
- **Existing status fields**: employment_status (select), status_start_date, status_end_date

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Make small, focused changes
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
- **CRITICAL: all tests must pass before starting next task** — no exceptions
- **CRITICAL: update this plan file when scope changes during implementation**
- Run tests after each change
- Maintain backward compatibility

## Testing Strategy
- **Unit tests**: Required for every task — backend logic in `server/test/`
- **E2E tests**: Add Playwright tests for UI changes in `tests/e2e/`
- Unit test commands: `cd server && npm test`
- Integration test commands: `cd server && npm run test:integration`
- E2E test commands: `npm run test:e2e`

## Progress Tracking
- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope

## Implementation Steps

### Task 1: Add photo field to schema and backend photo endpoints
- [x] Add `photo` field to `data/fields_schema.template.csv` with `field_type: photo` (new type, distinct from `file` — won't appear in documents table, no companion date fields auto-generated)
- [x] Add `photo` to `DEFAULT_EMPLOYEE_COLUMNS` in `server/src/schema.js`
- [x] Update `loadEmployeeColumns()` in `server/src/schema.js` to push `photo` type fields without `_issue_date`/`_expiry_date` companions (handle `field_type === 'photo'` same as text — just the field itself)
- [x] Add `POST /api/employees/:id/photo` endpoint in `server/src/routes/employee-files.js` — accepts image file (JPG/PNG/GIF/WebP), saves as `photo.{ext}` in `files/employee_{id}/`, stores relative path in employee's `photo` field, deletes old photo file if exists, logs UPDATE action
- [x] Add `DELETE /api/employees/:id/photo` endpoint in `server/src/routes/employee-files.js` — deletes photo file, clears `photo` field in employee record, logs UPDATE action
- [x] Add `uploadEmployeePhoto(id, formData)` and `deleteEmployeePhoto(id)` to `client/src/api.js`
- [x] Write unit tests for photo upload/delete endpoints in `server/test/photo-api.test.js` (success and error cases: missing file, invalid type, employee not found)
- [x] Run tests — must pass before next task

### Task 2: Frontend photo display and management in employee card
- [x] Add photo display area to the top of the employee card in `EmployeeCardsView.vue` — show photo image (from `/files/employee_{id}/photo.{ext}`) or placeholder avatar icon when no photo
- [x] Add upload button (visible when no photo or on hover) — opens file picker for images, calls `api.uploadEmployeePhoto()`, refreshes display
- [x] Add change/delete controls (visible on hover over existing photo) — change replaces photo via upload, delete calls `api.deleteEmployeePhoto()`
- [x] Style photo area: circular or rounded rectangle, ~120x120px, positioned top-left of card header area, responsive
- [x] Handle loading states and errors (upload failure toast/message)
- [x] Add E2E test in `tests/e2e/employee-photo.spec.js` — test photo upload, display, and delete
- [x] Run tests — must pass before next task

### Task 3: Backend status history storage and API
- [x] Define `STATUS_HISTORY_COLUMNS` in `server/src/schema.js`: `history_id`, `employee_id`, `old_status`, `new_status`, `old_start_date`, `old_end_date`, `new_start_date`, `new_end_date`, `changed_at`, `changed_by`
- [x] Add `status_history.csv` initialization in `server/src/store.js` — `ensureCsvFile()` pattern, add `statusHistoryWriteLock`, add `loadStatusHistory()` and `saveStatusHistory()` functions
- [x] Add `addStatusHistoryEntry(entry)` function in `server/src/store.js` — appends new entry with auto-increment `history_id`, uses write lock
- [x] Modify employee update logic in `server/src/routes/employees.js` — when `employment_status` changes, call `addStatusHistoryEntry()` with old/new status, old/new start/end dates, timestamp
- [x] Also record status history when status is auto-reset by system (in the expired status check logic) — N/A: no auto-reset logic exists in codebase yet
- [x] Add `GET /api/employees/:id/status-history` endpoint in `server/src/routes/employees.js` — returns all status history entries for the employee, sorted by `changed_at` descending
- [x] Add `getEmployeeStatusHistory(id)` to `client/src/api.js`
- [x] Write unit tests in `server/test/status-history.test.js` — test addStatusHistoryEntry, test history retrieval, test recording on status change
- [x] Run tests — must pass before next task

### Task 4: Frontend status history popup in employee card
- [x] Add a small history icon button (e.g., clock icon) next to the `employment_status` field in `EmployeeCardsView.vue`
- [x] On click, fetch status history via `api.getEmployeeStatusHistory(id)` and show in a modal popup
- [x] Popup content: table or timeline showing each status change — columns: date/time, old status, new status, start date, end date, changed by
- [x] Format dates as DD.MM.YYYY, timestamps as DD.MM.YYYY HH:MM
- [x] Show "no history" message if empty
- [x] Style popup using existing modal pattern (`vacation-notification-overlay` / `vacation-notification-card`)
- [x] Support dark theme
- [x] Add E2E test in `tests/e2e/status-history.spec.js` — test popup opens, displays history after status change
- [x] Run tests — must pass before next task

### Task 5: Verify acceptance criteria
- [x] Verify photo upload/change/delete works end-to-end
- [x] Verify photo displays correctly for existing and new employees
- [x] Verify photo placeholder shown when no photo
- [x] Verify status history records created on status change
- [x] Verify status history popup shows correct data
- [x] Verify dark theme support for both features
- [x] Run full test suite (unit tests): `cd server && npm test`
- [x] Run integration tests: `cd server && npm run test:integration`
- [x] Run E2E tests: `npm run test:e2e`
- [x] Verify test coverage meets project standard (80%+)

### Task 6: [Final] Update documentation
- [ ] Update `CLAUDE.md` — add photo field type documentation, status history CSV structure, new API endpoints
- [ ] Update `README.md` if needed — add photo and status history to feature list

*Note: ralphex automatically moves completed plans to `docs/plans/completed/`*

## Technical Details

### Photo Field
- **Schema type**: `photo` (new type) — not `file`, so it won't:
  - Appear in documents table (frontend filters `field.type === 'file'`)
  - Get companion `_issue_date`/`_expiry_date` columns (schema.js only adds those for `file` type)
  - Appear in document field list (backend `loadDocumentFields()` filters `field_type === 'file'`)
- **Storage**: `files/employee_{id}/photo.{ext}` (ext preserved from upload)
- **CSV value**: relative path like `employee_123/photo.jpg`
- **Allowed types**: JPG, JPEG, PNG, GIF, WebP (already in upload-config.js ALLOWED_FILE_EXTENSIONS)
- **Size limit**: Same as other files (max_file_upload_mb from config.csv)

### Status History CSV Structure
```
history_id;employee_id;old_status;new_status;old_start_date;old_end_date;new_start_date;new_end_date;changed_at;changed_by
1;123;Працює;На лікарняному;2025-01-01;;2026-02-16;;2026-02-16T10:30:00.000Z;system
```

### Status History API Response
```json
{
  "history": [
    {
      "history_id": "2",
      "employee_id": "123",
      "old_status": "На лікарняному",
      "new_status": "Працює",
      "old_start_date": "2026-02-16",
      "old_end_date": "",
      "new_start_date": "2026-02-20",
      "new_end_date": "",
      "changed_at": "2026-02-20T09:00:00.000Z",
      "changed_by": "system"
    }
  ]
}
```

## Post-Completion

**Manual verification**:
- Test photo upload with various image formats (JPG, PNG, WebP)
- Test photo display at different screen sizes
- Test status history popup with many entries (scrolling)
- Verify dark theme contrast for photo placeholder and history popup
- Test with employee that has no status changes (empty history)
