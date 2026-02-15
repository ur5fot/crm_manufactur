# UI Navigation Refactoring and Search Improvements

## Overview
Refactor the CRM Manufacturing System to improve navigation structure, enhance search functionality across multiple views, clean up test data, fix theme styling issues, and remove hardcoded values. This includes combining menu items, adding granular search capabilities, and code refactoring for maintainability.

## Context
- Files involved:
  - Frontend: `client/src/App.vue`, `client/src/views/EmployeeCardsView.vue`, `client/src/styles.css`, `client/src/api.js`
  - Backend: `server/src/routes/*.js`, test files in `tests/e2e/`
  - Data: `data/templates.csv`, `data/generated_documents.csv`
  - Configuration: `playwright.config.js`
- Related patterns: Vue 3 Composition API, Bootstrap UI components, modular route structure
- Dependencies: None (uses existing stack)

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Follow existing Vue.js and Express.js patterns
- Maintain backwards compatibility with existing data
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Clean up test data from database

**Files:**
- Modify: `data/templates.csv`
- Modify: `data/generated_documents.csv`
- Delete: test DOCX files in `files/templates/` and `files/documents/`

- [x] identify test templates and documents (those created by E2E tests with names containing "test", "тест", timestamps)
- [x] manually delete test template records from templates.csv (keep header, remove test rows)
- [x] manually delete test document records from generated_documents.csv (keep header, remove test rows)
- [x] delete corresponding DOCX files from files/templates/ and files/documents/ folders
- [x] verify data files are still valid CSV format with UTF-8 BOM
- [x] start application and verify no errors loading cleaned data
- [x] run E2E tests to verify they can create fresh test data - must pass

### Task 2: Add search within employee list sidebar (cards view)

**Files:**
- Modify: `client/src/views/EmployeeCardsView.vue`

Current state: cardSearchTerm exists and filters employees list
Required: verify it searches across all visible employee fields in sidebar (last_name, first_name, middle_name, employee_id, employment_status)

- [x] review current filteredEmployeesForCards computed property implementation
- [x] verify search matches across: last_name, first_name, middle_name, employee_id, employment_status
- [x] add unit test or E2E test for employee list search functionality
- [x] test searching by partial name, employee ID, and status
- [x] run full E2E test suite - must pass

### Task 3: Add search within current employee card fields

**Files:**
- Modify: `client/src/views/EmployeeCardsView.vue`

Add new search input that filters visible form fields within the current employee card based on field labels and values.

- [x] add new ref cardFieldSearchTerm for searching within current employee's fields
- [x] add computed property filteredFieldGroups that filters fieldGroups based on search term
- [x] search logic: match against field labels (from schema) and field values (from form data)
- [x] add search input UI in employee card section (above field groups)
- [x] add clear button for field search input
- [x] update E2E test card-search.spec.js to cover within-card field search
- [x] run full E2E test suite - must pass

### Task 4: Combine Templates and Document History into one navigation section

**Files:**
- Modify: `client/src/App.vue`
- Create: `client/src/views/DocumentsView.vue`
- Modify: `client/src/main.js` (routes)

- [x] create new DocumentsView.vue component with tabbed interface
- [x] add two tabs: "Шаблони" (templates) and "Історія документів" (document history)
- [x] embed TemplatesView and DocumentHistoryView as child components within tabs
- [x] update App.vue: remove separate "templates" and "document-history" tabs
- [x] add new tab "Документи" that routes to documents view
- [x] update router in main.js: add /documents route with DocumentsView component
- [x] test navigation to new combined section
- [x] update E2E tests that navigate to templates or document history
- [x] run full E2E test suite - must pass

### Task 5: Combine Logs and Import into System Settings dropdown

**Files:**
- Modify: `client/src/App.vue`
- Create: `client/src/views/SystemSettingsView.vue`
- Modify: `client/src/main.js` (routes)

- [x] create SystemSettingsView.vue with tabbed interface
- [x] add two tabs: "Імпорт" and "Логи"
- [x] embed ImportView and LogsView as child components within tabs
- [x] update App.vue: remove "import" and "logs" tabs from main tab bar
- [x] add dropdown menu (three dots icon) in topbar-actions area
- [x] dropdown menu items: "Налаштування системи" (routes to /system-settings), "Відкрити папку даних" (existing functionality)
- [x] style dropdown to match existing theme
- [x] update router in main.js: add /system-settings route
- [x] update E2E tests that navigate to import or logs
- [x] run full E2E test suite - must pass

### Task 6: Verify document filename includes employee last name (already implemented)

**Files:**
- Review: `server/src/routes/templates.js` (line 362-364)

- [x] verify generateDocx already includes sanitizedLastName in filename
- [x] verify format: `{TemplateName}_{LastName}_{employee_id}_{timestamp}.docx`
- [x] test document generation from cards view and verify filename pattern
- [x] verify E2E tests for document generation pass with current implementation
- [x] document this behavior in CLAUDE.md if not already documented
- [x] run E2E templates-generation.spec.js - must pass

### Task 7: Review and fix dark/light theme styling

**Files:**
- Modify: `client/src/styles.css`

- [x] manually test dark theme: check all views for readability and contrast
- [x] manually test light theme: check all views for readability and contrast
- [x] identify any elements with poor contrast or missing theme variables
- [x] fix dropdown menus, modals, form inputs, buttons in both themes
- [x] verify global search dropdown styling in both themes
- [x] verify new Documents and System Settings views in both themes
- [x] update theme-toggle.spec.js E2E test if needed
- [x] run theme-toggle.spec.js E2E test - must pass

### Task 8: Remove hardcoded URLs in E2E tests

**Files:**
- Modify: all test files in `tests/e2e/` with hardcoded localhost URLs
- Modify: `playwright.config.js`

- [x] add baseURL to playwright.config.js use object with API and frontend base URLs
- [x] create test helper or config for API base URL (e.g., const API_URL = process.env.API_URL || 'http://localhost:3000')
- [x] search for all instances of 'http://localhost:3000' and 'http://localhost:5173' in tests
- [x] replace with config-based URLs or page.goto with relative paths
- [x] verify all E2E tests still pass with new URL pattern
- [x] run full E2E test suite - must pass

### Task 9: Refactor frontend code for maintainability

**Files:**
- Modify: `client/src/views/EmployeeCardsView.vue`
- Modify: `client/src/App.vue`
- Modify: `client/src/api.js`

- [x] extract hardcoded field names in EmployeeCardsView to constants or schema-based config
- [x] consolidate duplicate display name logic (displayName function) into a shared utility
- [x] review and simplify complex computed properties (break into smaller functions if needed)
- [x] extract magic numbers (debounce timeouts, pagination limits) to named constants
- [x] add JSDoc comments to complex functions where helpful
- [x] verify no regressions after refactoring
- [x] run full E2E test suite - must pass

### Task 10: Refactor backend code for maintainability

**Files:**
- Modify: `server/src/routes/*.js`
- Modify: `server/src/utils.js`

- [ ] extract repeated validation patterns (employee_id required, template_id required) into middleware or utility functions
- [ ] consolidate duplicate employee lookup logic into reusable functions
- [ ] extract magic numbers (pagination limits, default values) to named constants
- [ ] review error messages for consistency (Ukrainian for user-facing, English for technical)
- [ ] add JSDoc comments to complex route handlers
- [ ] verify no regressions after refactoring
- [ ] run backend unit tests and E2E test suite - must pass

### Task 11: Verify acceptance criteria

- [ ] manual test: clean database has no test templates or documents
- [ ] manual test: employee list search filters employees in cards sidebar
- [ ] manual test: within-card field search filters form fields by label and value
- [ ] manual test: global search finds employees, templates, and documents across entire site
- [ ] manual test: Documents tab contains Templates and Document History sub-tabs
- [ ] manual test: System Settings (three dots menu) contains Import and Logs sub-tabs
- [ ] manual test: generated documents include employee last name in filename
- [ ] manual test: dark theme readable and consistent across all views
- [ ] manual test: light theme readable and consistent across all views
- [ ] run full E2E test suite (npm run test:e2e) - must pass
- [ ] run backend unit tests (cd server && npm test) - must pass

### Task 12: Update documentation

- [ ] update README.md: document new navigation structure (Documents, System Settings)
- [ ] update README.md: document search capabilities (global, employee list, within-card)
- [ ] update CLAUDE.md: document refactored code patterns if significantly changed
- [ ] update CLAUDE.md: document new view components (DocumentsView, SystemSettingsView)
- [ ] move this plan to `docs/plans/completed/`
