# Refactor monolithic files into modules

## Overview
- Split two monolithic files (`server/src/index.js` at 1,716 lines and `client/src/App.vue` at 4,018 lines) into modular architecture
- Problem: Both files concentrate all logic in single files, causing high cognitive load, merge conflicts, and difficult testing
- Backend: Extract 36 API routes into route modules, utilities, and middleware
- Frontend: Extract 9 views into separate Vue components, shared logic into composables

## Context (from discovery)
- **Files involved**: `server/src/index.js`, `client/src/App.vue`, `client/src/main.js`
- **Related patterns**: Express route handlers, Vue Composition API with `<script setup>`
- **Dependencies**: store.js, csv.js, docx-generator.js, declension.js (backend); api.js (frontend)
- **Existing tests**: 7 unit/integration tests (server/test/), 15 E2E specs (tests/e2e/)
- **Current routing**: All routes in main.js point to App component, view switching via `currentView` computed from `route.name`

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Make small, focused changes — one route group or one view per task
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
- **CRITICAL: all tests must pass before starting next task** — no exceptions
- **CRITICAL: update this plan file when scope changes during implementation**
- Run tests after each change
- Maintain backward compatibility — all existing E2E tests must continue to pass
- Backend refactoring first, then frontend

## Testing Strategy
- **Unit tests**: Run with `cd server && npm test` after each backend task
- **Integration tests**: Run with `cd server && npm run test:integration` after backend tasks that change API routes
- **E2E tests**: Run with `npm run test:e2e` after each task to verify no regressions
- All 15 E2E specs must pass throughout the refactoring — they are the regression safety net

## Progress Tracking
- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope
- Keep plan in sync with actual work done

## Implementation Steps

### Phase 1: Backend Route Extraction

### Task 1: Extract utility functions and multer configs
- [x] Create `server/src/utils.js` — move `getOpenCommand()`, `openFolder()`, `getNextId()`, `normalizeEmployeeInput()` from index.js
- [x] Create `server/src/upload-config.js` — move `importUpload`, `templateUpload`, and employee file upload multer configurations (accept `appConfig` as parameter)
- [x] Update `server/src/index.js` — import utilities and multer configs from new modules
- [x] Verify server starts and responds to `/api/health`
- [x] Write unit tests for `getNextId()` and `normalizeEmployeeInput()` in `server/test/utils.test.js`
- [x] Run all tests — must pass before next task

### Task 2: Extract dashboard and config routes
- [x] Create `server/src/routes/dashboard.js` — export a function that takes `(app)` and registers: `GET /api/health`, `GET /api/dashboard/stats`, `GET /api/dashboard/events`, `GET /api/document-expiry`, `GET /api/document-overdue`, `GET /api/birthday-events`, `GET /api/retirement-events`, `GET /api/config`
- [x] Update `server/src/index.js` — remove extracted routes, call `registerDashboardRoutes(app)` instead
- [x] Verify all dashboard E2E tests pass (`tests/e2e/dashboard.spec.js`)
- [x] Run all tests — must pass before next task

### Task 3: Extract report and export routes
- [x] Create `server/src/routes/reports.js` — export function registering: `GET /api/reports/statuses`, `GET /api/reports/custom`, `GET /api/export`
- [x] Update `server/src/index.js` — remove extracted routes, call `registerReportRoutes(app)`
- [x] Verify reports E2E tests pass (`tests/e2e/reports.spec.js`)
- [x] Run all tests — must pass before next task

### Task 4: Extract employee CRUD routes
- [x] Create `server/src/routes/employees.js` — export function registering: `GET /api/employees`, `GET /api/employees/:id`, `POST /api/employees`, `PUT /api/employees/:id`, `DELETE /api/employees/:id`
- [x] Move date validation logic and field change detection into route module (or shared utility if reused)
- [x] Update `server/src/index.js` — remove extracted routes, call `registerEmployeeRoutes(app)`
- [x] Verify employee E2E tests pass (`tests/e2e/employee-crud.spec.js`, `tests/e2e/birth-date-validation.spec.js`, `tests/e2e/status-retirement.spec.js`)
- [x] Run all tests — must pass before next task

### Task 5: Extract employee file and import routes
- [x] Create `server/src/routes/employee-files.js` — export function registering: `POST /api/employees/:id/files`, `DELETE /api/employees/:id/files/:fieldName`, `POST /api/employees/:id/open-folder`, `POST /api/employees/import`, `GET /api/download/import-template`
- [x] Update `server/src/index.js` — remove extracted routes, call `registerEmployeeFileRoutes(app)`
- [x] Verify import and documents E2E tests pass (`tests/e2e/import.spec.js`, `tests/e2e/documents.spec.js`)
- [x] Run all tests — must pass before next task

### Task 6: Extract template routes
- [x] Create `server/src/routes/templates.js` — export function registering: `GET /api/templates`, `GET /api/templates/:id`, `POST /api/templates`, `PUT /api/templates/:id`, `DELETE /api/templates/:id`, `POST /api/templates/:id/upload`, `POST /api/templates/:id/open-file`, `POST /api/templates/:id/reextract`, `POST /api/templates/:id/generate`
- [x] Update `server/src/index.js` — remove extracted routes, call `registerTemplateRoutes(app)`
- [x] Verify template E2E tests pass (`tests/e2e/templates-crud.spec.js`, `tests/e2e/templates-upload.spec.js`, `tests/e2e/templates-generation.spec.js`, `tests/e2e/templates-modal-simple.spec.js`)
- [x] Run all tests — must pass before next task

### Task 7: Extract document history, logs, and utility routes
- [x] Create `server/src/routes/documents.js` — export function registering: `GET /api/documents`, `GET /api/documents/:id/download`
- [x] Create `server/src/routes/logs.js` — export function registering: `GET /api/logs`
- [x] Create `server/src/routes/misc.js` — export function registering: `POST /api/open-data-folder`, `GET /api/fields-schema`, `GET /api/placeholder-preview/:employeeId?`
- [x] Update `server/src/index.js` — remove all remaining routes, call registration functions
- [x] Verify index.js is now ~50-80 lines (setup + imports + registration calls + listen)
- [x] Verify document history E2E tests pass (`tests/e2e/document-history.spec.js`)
- [x] Verify logs E2E tests pass (`tests/e2e/logs.spec.js`)
- [x] Run all tests — must pass before next task

### Task 8: Backend cleanup and verification
- [x] Review `server/src/index.js` — ensure it only contains setup, middleware, route registration, and listen
- [x] Verify no dead code or unused imports remain in any backend file
- [x] Run full unit test suite: `cd server && npm test`
- [x] Run full integration test suite: `cd server && npm run test:integration`
- [x] Run full E2E test suite: `npm run test:e2e`
- [x] All tests must pass

### Phase 2: Frontend View Extraction

### Task 9: Set up frontend module structure and extract first view (Logs)
- [x] Create `client/src/views/` directory
- [x] Create `client/src/composables/` directory
- [x] Extract `LogsView.vue` from App.vue — move logs-related state (`logs`, `logsLoading`, `logsOffset`, `logsLimit`, `logsTotal`) and methods (`loadLogs`, pagination) into the component
- [x] Update `client/src/main.js` — change logs route to point to `LogsView` component instead of `App`
- [x] Remove logs-related code from App.vue (state, methods, template section at line ~3815)
- [x] Verify logs E2E test passes (`tests/e2e/logs.spec.js`)
- [x] Run all tests — must pass before next task

### Task 10: Extract ImportView
- [x] Create `client/src/views/ImportView.vue` — move import-related state and methods from App.vue
- [x] Update `client/src/main.js` — change import route to point to `ImportView`
- [x] Remove import-related code from App.vue (template section at line ~3479)
- [x] Verify import E2E test passes (`tests/e2e/import.spec.js`)
- [x] Run all tests — must pass before next task

### Task 11: Extract DocumentHistoryView
- [x] Create `client/src/views/DocumentHistoryView.vue` — move document history state (filters, pagination, loading) and methods from App.vue
- [x] Update `client/src/main.js` — change document-history route to point to `DocumentHistoryView`
- [x] Remove document-history code from App.vue (template section at line ~3625)
- [x] Verify document history E2E test passes (`tests/e2e/document-history.spec.js`)
- [x] Run all tests — must pass before next task

### Task 12: Extract TemplatesView
- [x] Create `client/src/views/TemplatesView.vue` — move templates state (templates list, dialogs, upload modal) and methods from App.vue
- [x] Update `client/src/main.js` — change templates route to point to `TemplatesView`
- [x] Remove templates-related code from App.vue (template section at line ~3550)
- [x] Verify templates E2E tests pass (`tests/e2e/templates-crud.spec.js`, `tests/e2e/templates-upload.spec.js`, `tests/e2e/templates-generation.spec.js`, `tests/e2e/templates-modal-simple.spec.js`)
- [x] Run all tests — must pass before next task

### Task 13: Extract ReportsView
- [x] Create `client/src/views/ReportsView.vue` — move reports state (filters, results, columns, sorting) and methods from App.vue
- [x] Create `client/src/composables/useFieldsSchema.js` — extract shared schema loading logic (used by multiple views: reports, cards, table, placeholder-reference)
- [x] Update `client/src/main.js` — change reports route to point to `ReportsView`
- [x] Remove reports-related code from App.vue (template section at line ~3321)
- [x] Verify reports E2E test passes (`tests/e2e/reports.spec.js`)
- [x] Run all tests — must pass before next task

### Task 14: Extract DashboardView
- [ ] Create `client/src/views/DashboardView.vue` — move dashboard state (events, refresh interval, notifications, status changes) and methods from App.vue
- [ ] Update `client/src/main.js` — change dashboard route to point to `DashboardView`
- [ ] Remove dashboard-related code from App.vue (template section at line ~2669, notification modals)
- [ ] Verify dashboard E2E test passes (`tests/e2e/dashboard.spec.js`)
- [ ] Run all tests — must pass before next task

### Task 15: Extract TableView
- [ ] Create `client/src/views/TableView.vue` — move table state (column filters, sorting, editing cells) and methods from App.vue
- [ ] Reuse `useFieldsSchema.js` composable for schema
- [ ] Update `client/src/main.js` — change table route to point to `TableView`
- [ ] Remove table-related code from App.vue (template section at line ~3172)
- [ ] Verify table E2E tests pass (`tests/e2e/table-filters.spec.js`)
- [ ] Run all tests — must pass before next task

### Task 16: Extract PlaceholderReferenceView
- [ ] Create `client/src/views/PlaceholderReferenceView.vue` — move placeholder preview state and methods from App.vue
- [ ] Update `client/src/main.js` — change placeholder-reference route to point to `PlaceholderReferenceView`
- [ ] Remove placeholder-reference code from App.vue
- [ ] Run all tests — must pass before next task

### Task 17: Extract EmployeeCardsView (largest view)
- [ ] Create `client/src/composables/useEmployeeForm.js` — extract form state, dirty tracking, snapshot management, unsaved changes logic
- [ ] Create `client/src/views/EmployeeCardsView.vue` — move employee cards state (selectedId, searchTerm, form, file fields) and methods from App.vue
- [ ] Handle navigation guards for unsaved changes within the new component
- [ ] Update `client/src/main.js` — change cards route to point to `EmployeeCardsView`
- [ ] Remove employee cards code from App.vue (template section at line ~2826, form, sidebar)
- [ ] Verify employee E2E tests pass (`tests/e2e/employee-crud.spec.js`, `tests/e2e/birth-date-validation.spec.js`, `tests/e2e/status-retirement.spec.js`, `tests/e2e/documents.spec.js`)
- [ ] Run all tests — must pass before next task

### Task 18: Clean up App.vue and finalize routing
- [ ] Review App.vue — should now contain only: navigation/sidebar, shared layout, and minimal shared state
- [ ] Remove all dead code, unused imports, and orphaned methods from App.vue
- [ ] Verify App.vue is under ~500 lines
- [ ] Update `client/src/main.js` — ensure all routes point to correct view components
- [ ] Run full E2E test suite: `npm run test:e2e` — all 15 specs must pass
- [ ] Run full unit/integration test suite: `cd server && npm test && npm run test:integration`

### Task 19: Verify acceptance criteria
- [ ] Verify `server/src/index.js` is under 100 lines (setup + registration only)
- [ ] Verify `client/src/App.vue` is under 500 lines (layout + navigation only)
- [ ] Verify all 36 API routes still respond correctly
- [ ] Verify all 9 frontend views render and function correctly
- [ ] Run full test suite (unit + integration + E2E)
- [ ] Run linter if configured — all issues must be fixed

### Task 20: [Final] Update documentation
- [ ] Update CLAUDE.md project structure section to reflect new file layout
- [ ] Update CLAUDE.md backend patterns section to document route module pattern
- [ ] Update CLAUDE.md frontend patterns section to document view/composable extraction
- [ ] Update README.md project structure if it lists file layout

*Note: ralphex automatically moves completed plans to `docs/plans/completed/`*

## Technical Details

### Backend Route Module Pattern
Each route module exports a registration function:
```javascript
// server/src/routes/dashboard.js
export function registerDashboardRoutes(app) {
  app.get("/api/health", (req, res) => { ... });
  app.get("/api/dashboard/stats", async (_req, res) => { ... });
  // ...
}
```

Index.js becomes:
```javascript
import { registerDashboardRoutes } from "./routes/dashboard.js";
// ...
registerDashboardRoutes(app);
// ...
app.listen(port, () => { ... });
```

### Frontend View Component Pattern
Each view is a standalone Vue component with its own state:
```javascript
// client/src/views/LogsView.vue
<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api";
// View-specific state and methods
</script>
```

Routes in main.js point to individual components:
```javascript
import LogsView from "./views/LogsView.vue";
const routes = [
  { path: "/logs", name: "logs", component: LogsView },
  // ...
];
```

### Shared State via Composables
Logic needed by multiple views extracted into composables:
```javascript
// client/src/composables/useFieldsSchema.js
export function useFieldsSchema() {
  const allFieldsSchema = ref([]);
  const fieldGroups = ref([]);
  // ... loading logic
  return { allFieldsSchema, fieldGroups, getFieldType, getFieldLabel };
}
```

## Post-Completion

**Manual verification**:
- Navigate through all 9 views in browser, verify UI renders correctly
- Test employee CRUD: create, edit, save, delete
- Test template upload and document generation
- Test dashboard notifications and auto-refresh
- Verify unsaved changes warning still works on employee cards
- Test import/export workflows
