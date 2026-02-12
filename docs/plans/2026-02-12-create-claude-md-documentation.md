# Create comprehensive CLAUDE.md documentation file for the CRM Manufacturing System project

## Overview
Create a CLAUDE.md file that documents the architecture, technical decisions, code patterns, and development workflows for the CRM Manufacturing System.

## Context
- Files involved:
  - Create: `CLAUDE.md` (root directory)
  - Reference: `README.md`, `docs/plans/completed/*.md`, `server/src/index.js`, `server/src/store.js`, `client/src/App.vue`
- Related patterns: Documentation pattern from completed plans (references to CLAUDE.md sections)
- Dependencies: None

## Approach
- Review approach: Analyze existing code and completed plans to extract patterns
- Write comprehensive CLAUDE.md covering all aspects of the project
- No testing required (documentation task)

---

## TASK 1: Create CLAUDE.md - Project Overview and Architecture

**Files:**
- Create: `CLAUDE.md`

**Steps:**
- [x] Create CLAUDE.md in root directory
- [x] Add project overview section (CRM Manufacturing System description)
- [x] Document technology stack (Node.js, Express, Vue.js, CSV storage)
- [x] Document project structure (client/, server/, data/, files/, tests/, docs/)
- [x] Document data storage architecture (CSV files with file locking)
- [x] Document file organization (templates, documents, employee folders)

---

## TASK 2: Document Key Technical Decisions

**Files:**
- Modify: `CLAUDE.md`

**Steps:**
- [x] Add "Key Technical Decisions" section
- [x] Document CSV-based storage rationale and limitations (suitable for <10k employees)
- [x] Document file locking pattern for concurrent writes (employeeWriteLock, templatesWriteLock, etc.)
- [x] Document soft delete pattern (active='yes'/'no' instead of hard deletes)
- [x] Document audit logging for all operations (logs.csv)
- [x] Document UTF-8 BOM and semicolon delimiter conventions
- [x] Document auto-increment ID pattern for entities
- [x] Document security decisions (path traversal protection, input validation, file size limits)

---

## TASK 3: Document Backend Code Patterns

**Files:**
- Modify: `CLAUDE.md`

**Steps:**
- [x] Add "Backend Patterns" section
- [x] Document API route structure and conventions
- [x] Document CSV read/write patterns (loadX, saveX functions in store.js)
- [x] Document multer file upload pattern and configuration
- [x] Document error handling and HTTP status codes
- [x] Document data validation patterns
- [x] Document joining data from multiple CSV files pattern
- [x] Document DOCX generation pattern (docxtemplater usage)
- [x] Document placeholder extraction and replacement

---

## TASK 4: Document Frontend Code Patterns

**Files:**
- Modify: `CLAUDE.md`

**Steps:**
- [x] Add "Frontend Patterns" section
- [x] Document Vue.js 3 Composition API usage
- [x] Document routing structure (/cards, /reports, /import, /logs, /dashboard, /templates, /document-history)
- [x] Document API client pattern (api.js)
- [x] Document form validation and unsaved changes warning
- [x] Document modal/popup patterns (templates, status change, document upload)
- [x] Document table filtering and pagination patterns
- [x] Document dynamic field schema loading from fields_schema.csv
- [x] Document Bootstrap UI components usage

---

## TASK 5: Document Testing Approach

**Files:**
- Modify: `CLAUDE.md`

**Steps:**
- [x] Add "Testing" section
- [x] Document E2E testing with Playwright (tests/e2e/)
- [x] Document test structure and naming conventions
- [x] Document unit/integration tests (server/test/)
- [x] Document test data fixtures pattern
- [x] Document test commands (npm run test:e2e, cd server && npm test)
- [x] Document testing approach: Regular (code first, then tests)
- [x] Document test coverage expectations (80%+)
- [x] Document critical rule: all tests must pass before moving to next task

---

## TASK 6: Document API Endpoints

**Files:**
- Modify: `CLAUDE.md`

**Steps:**
- [x] Add "API Structure" section
- [x] Document employees API endpoints (CRUD, import, export)
- [x] Document templates API endpoints (CRUD, upload, generate)
- [x] Document documents API endpoints (list with filters, download)
- [x] Document logs API endpoint
- [x] Document dashboard/stats API endpoints
- [x] Document config API endpoints
- [x] Document file management endpoints (open folder)
- [x] Reference README.md for detailed API documentation

---

## TASK 7: Document Development Workflow

**Files:**
- Modify: `CLAUDE.md`

**Steps:**
- [x] Add "Development Workflow" section
- [x] Document how to run the application (./run.sh, or separate server/client commands)
- [x] Document how to stop the application (./stop.sh)
- [x] Document development mode (npm run dev)
- [x] Document port configuration (server: 3000, client: 5173)
- [x] Document plan-based development approach (docs/plans/)
- [x] Document plan structure and completion checklist
- [x] Document when to update CLAUDE.md (internal patterns change)
- [x] Document when to update README.md (user-facing changes)

---

## TASK 8: Document Special Features

**Files:**
- Modify: `CLAUDE.md`

**Steps:**
- [x] Add "Special Features" section
- [x] Document templates system (DOCX upload, placeholder extraction, generation)
- [x] Document placeholder syntax ({field_name}, {current_date}, {current_datetime})
- [x] Document document history tracking with data snapshots
- [x] Document status change system (employment_status, status_start_date, status_end_date)
- [x] Document automatic status reset when end date expires
- [x] Document dashboard notifications (birthdays, retirements, document expiry, status changes)
- [x] Document document expiry tracking and notifications
- [x] Document custom reports with dynamic filters

---

## TASK 9: Document Code Style and Conventions

**Files:**
- Modify: `CLAUDE.md`

**Steps:**
- [x] Add "Code Style and Conventions" section
- [x] Document naming conventions (snake_case for CSV fields, camelCase for JS)
- [x] Document file naming patterns (employee_{id}, template_{id}_{timestamp}.docx)
- [x] Document date format conventions (YYYY-MM-DD for storage, DD.MM.YYYY for display)
- [x] Document timestamp format (ISO 8601)
- [x] Document comments and documentation style
- [x] Document error message patterns (Ukrainian language for user-facing messages)
- [x] Document console.log conventions for debugging

---

## TASK 10: Document Future Enhancement Patterns

**Files:**
- Modify: `CLAUDE.md`

**Steps:**
- [x] Add "Future Enhancements" section
- [x] Document migration path to database (SQLite, PostgreSQL)
- [x] Reference docs/templates-system-improvements.md for backlog
- [x] Document scalability considerations
- [x] Document potential performance optimizations
- [x] Add note about maintaining documentation when adding features

---

## Verification

- [ ] CLAUDE.md file exists in root directory
- [ ] All major sections are complete and comprehensive
- [ ] Documentation accurately reflects current implementation
- [ ] Cross-references to README.md are correct
- [ ] Code examples (if any) are valid
- [ ] Markdown formatting is correct and renders properly

---

## Post-completion

- [ ] No README.md update needed (this is internal documentation)
- [ ] Move this plan to `docs/plans/completed/`
