# Plan: Templates System Improvements - Multi-phase Code Review

## Description
Multi-phase code review completed - Templates system improvements

What has been implemented:
- Complete templates CRUD system with backend and frontend
- DOCX template upload and placeholder extraction
- Document generation from templates using employee data
- Document download functionality
- Soft delete with audit logging
- E2E tests for CRUD and upload flows

What needs to be added:
- E2E tests for document generation and download
- Unit tests for DOCX generator module
- Integration tests for templates API
- Document history view (frontend and backend)
- Documentation and future enhancements backlog

## Files Involved
- Create: `tests/e2e/templates-generation.spec.js` (E2E test for document generation and download)
- Create: `server/test/docx-generator.test.js` (unit tests for DOCX module)
- Create: `server/test/templates-api.test.js` (integration tests for API)
- Modify: `client/src/App.vue` (add document history view)
- Modify: `server/src/index.js` (add document history API)
- Create: `docs/templates-system-improvements.md` (future enhancements backlog)

## Related Patterns
- Existing E2E tests pattern: `tests/e2e/templates-crud.spec.js`, `tests/e2e/templates-upload.spec.js`
- Backend unit tests pattern: To be established
- CSV-based data storage with write locks
- Soft delete pattern (active='yes'/'no')
- Audit logging for all operations

## Approach
- Testing approach: Regular (implement E2E and unit tests for existing code)
- Complete each task fully before moving to the next
- CRITICAL: every task MUST include new/updated tests
- CRITICAL: all tests must pass before starting next task

---

## Tasks

### Task 1: Document Generation E2E Test

**Files:**
- Create: `tests/e2e/templates-generation.spec.js`

- [x] Create E2E test file for document generation flow
- [x] Test: Navigate to employee card with template that has DOCX file
- [x] Test: Click generate document button
- [x] Test: Verify success alert appears
- [x] Test: Verify document download starts automatically
- [x] Test: Verify generated document appears in generated_documents.csv
- [x] Test: Error case - try to generate without DOCX file
- [x] Test: Error case - employee not saved
- [x] Run test: `npm run test:e2e -- templates-generation.spec.js`

---

### Task 2: Document Download E2E Test

**Files:**
- Modify: `tests/e2e/templates-generation.spec.js`

- [x] Add test for direct document download via API
- [x] Create a test document in generated_documents.csv
- [x] Test: GET /api/documents/:id/download returns 200 with DOCX
- [x] Test: Verify Content-Type header is `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- [x] Test: Verify Content-Disposition header has filename
- [x] Test: 404 error when document_id doesn't exist
- [x] Test: 404 error when document file missing from disk
- [x] Run test: `npm run test:e2e -- templates-generation.spec.js`

---

### Task 3: DOCX Generator Unit Tests

**Files:**
- Create: `server/test/docx-generator.test.js`

- [x] Create unit test file for docx-generator module
- [x] Test: extractPlaceholders() returns correct placeholder list
- [x] Test: extractPlaceholders() with template without placeholders
- [x] Test: extractPlaceholders() throws error for non-existent file
- [x] Test: extractPlaceholders() throws error for invalid DOCX
- [x] Test: generateDocx() creates valid DOCX file
- [x] Test: generateDocx() replaces placeholders correctly
- [x] Test: generateDocx() handles null/undefined values as empty string
- [x] Test: generateDocx() adds current_date placeholder
- [x] Test: generateDocx() adds current_datetime placeholder
- [x] Test: generateDocx() throws error for non-existent template
- [x] Test: generateDocx() creates output directory if missing
- [x] Run tests: `cd server && npm test -- docx-generator.test.js`

---

### Task 4: Templates API Integration Tests

**Files:**
- Create: `server/test/templates-api.test.js`

- [x] Create integration test file for templates API
- [x] Test: POST /api/templates creates template with auto-increment ID
- [x] Test: POST /api/templates validates required fields
- [x] Test: POST /api/templates creates audit log entry
- [x] Test: GET /api/templates returns only active templates
- [x] Test: GET /api/templates/:id returns 404 for non-existent
- [x] Test: PUT /api/templates/:id updates template
- [x] Test: PUT /api/templates/:id doesn't allow changing docx_filename
- [x] Test: DELETE /api/templates/:id soft deletes (active='no')
- [x] Test: POST /api/templates/:id/upload validates DOCX extension
- [x] Test: POST /api/templates/:id/upload extracts placeholders
- [x] Test: POST /api/templates/:id/upload respects file size limit
- [x] Test: POST /api/templates/:id/generate validates employee_id
- [x] Test: POST /api/templates/:id/generate creates document record
- [x] Test: Concurrent document generation doesn't corrupt CSV
- [x] Run tests: `cd server && npm test -- templates-api.test.js`

---

### Task 5: Document History View (Frontend)

**Files:**
- Modify: `client/src/App.vue`
- Modify: `client/src/api.js`

- [x] Add "Історія документів" tab to navigation
- [x] Add route handling for /document-history view
- [x] Add getGeneratedDocuments() API method
- [x] Create document history table component
- [x] Show columns: ID, Template, Employee, Generated Date, Generated By, Actions
- [x] Add download button for each document
- [x] Add filter by template dropdown
- [x] Add filter by employee search
- [x] Add date range filter
- [x] Add pagination (show 50 per page)
- [x] Test navigation and filtering

---

### Task 6: Document History API (Backend)

**Files:**
- Modify: `server/src/index.js`

- [x] Add GET /api/documents route (list all generated documents)
- [x] Support query params: template_id, employee_id, start_date, end_date
- [x] Join with templates.csv to include template_name
- [x] Join with employees.csv to include employee name
- [x] Sort by generation_date DESC (newest first)
- [x] Support pagination: offset, limit params
- [x] Return total count for pagination
- [x] Test with curl and various filters
- [x] Verify performance with large generated_documents.csv

---

### Task 7: Cleanup & Documentation

**Files:**
- Create: `docs/templates-system-improvements.md`

- [x] Document completed implementation
- [x] Create backlog of future enhancements:
  - Batch document generation
  - Template versioning
  - Custom fields beyond employee data
  - Template usage statistics
  - Automatic cleanup of old documents
  - Document re-generation capability
- [x] Document API endpoints in README
- [x] Add example template DOCX to repository
- [x] Document placeholder syntax and special fields
- [x] Move templates-system.md to docs/plans/completed/

---

## Verification

- [ ] Run full E2E test suite: `npm run test:e2e`
- [ ] Run server unit tests: `cd server && npm test`
- [ ] Verify all templates tests pass
- [ ] Manual test: create template, upload DOCX, generate document
- [ ] Manual test: download generated document and verify content
- [ ] Check logs.csv for proper audit trail
- [ ] Verify generated_documents.csv has data_snapshot
- [ ] Test concurrent generation (2+ users generating simultaneously)
