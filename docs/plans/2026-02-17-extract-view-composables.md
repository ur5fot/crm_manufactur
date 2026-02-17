# Extract Composables from Large Vue Views

## Overview
- Refactor the 5 largest Vue view components by extracting logic into composables
- Reduce EmployeeCardsView (1,402 lines) and DashboardView (1,023 lines) to manageable sizes
- Follow the existing composable pattern established by `useFieldsSchema.js` and `useEmployeeForm.js`
- Extract 14 composables total across all 5 views, grouping related state + computed + functions

## Context (from discovery)
- Files/components involved:
  - `client/src/views/EmployeeCardsView.vue` (1,402 lines) - 4 composables to extract
  - `client/src/views/DashboardView.vue` (1,023 lines) - 5 composables to extract
  - `client/src/views/ReportsView.vue` (415 lines) - 1 composable to extract
  - `client/src/views/TemplatesView.vue` (397 lines) - 2 composables to extract
  - `client/src/views/TableView.vue` (351 lines) - 2 composables to extract
  - `client/src/composables/` - destination for all new composables
- Related patterns found:
  - `client/src/composables/useFieldsSchema.js` (97 lines, singleton pattern)
  - `client/src/composables/useEmployeeForm.js` (151 lines, returns refs + functions)
- Dependencies identified:
  - All composables import from `client/src/api.js`
  - Some composables depend on `useFieldsSchema` or `useEmployeeForm`

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Make small, focused changes - one composable extraction per task where practical
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
  - Write E2E tests to verify UI behavior is unchanged after refactoring
  - Run existing E2E tests to verify no regressions
- **CRITICAL: all tests must pass before starting next task** - no exceptions
- **CRITICAL: update this plan file when scope changes during implementation**
- Run tests after each change
- Maintain backward compatibility - no user-visible changes

## Testing Strategy
- **Unit tests**: Not applicable for composable extraction (no new business logic)
- **E2E tests**: Run full Playwright suite after each task to verify no regressions
- **Verification**: Each extracted composable should produce identical behavior to inline code
- **Test commands**:
  - `cd server && npm test` - backend unit tests (should remain unaffected)
  - `npm run test:e2e` - full E2E suite (primary validation)

## Progress Tracking
- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope
- Keep plan in sync with actual work done

## Implementation Steps

### Task 1: Extract useEmployeePhoto from EmployeeCardsView
- [x] Create `client/src/composables/useEmployeePhoto.js` with:
  - State: `photoUploading`, `photoError`, `photoInputRef`, `photoVersion`
  - Computed: `photoUrl(form)` - photo URL with cache-busting
  - Functions: `sidebarPhotoUrl(photoPath)`, `triggerPhotoUpload()`, `handlePhotoUpload(event, form, savedFormSnapshot, selectedId)`, `deletePhoto(form, savedFormSnapshot, selectedId)`
  - Accept dependencies via parameters: `api` access, form refs
- [x] Update `EmployeeCardsView.vue` to import and use `useEmployeePhoto`
- [x] Remove extracted code from EmployeeCardsView script section
- [x] Verify photo upload, display, and delete work in browser
- [x] Run E2E tests: `npm run test:e2e` - must pass before next task

### Task 2: Extract useEmployeeDocuments from EmployeeCardsView
- [x] Create `client/src/composables/useEmployeeDocuments.js` with:
  - State: `showDocUploadPopup`, `docUploadForm` (reactive), `docUploadSaving`, `showDocEditDatesPopup`, `docEditDatesForm` (reactive), `docEditDatesSaving`, `showClearConfirmPopup`
  - Functions: `openDocUploadPopup(doc)`, `closeDocUploadPopup()`, `onDocUploadFileChange(event)`, `submitDocUpload(form, employees, selectedId, loadEmployees)`, `openDocEditDatesPopup(doc)`, `closeDocEditDatesPopup()`, `submitDocEditDates(form, employees, selectedId, loadEmployees)`, `openDocument(fieldKey, form)`, `deleteDocument(doc, form, selectedId, loadEmployees)`, `openEmployeeFolder(selectedId)`
  - Utility: `fileUrl(path)`, `formatDocDate(dateStr)`, `isDocExpiringSoon(doc)`, `isDocExpired(doc)`
- [x] Update `EmployeeCardsView.vue` to import and use `useEmployeeDocuments`
- [x] Remove extracted code from EmployeeCardsView script section
- [x] Verify document upload, date editing, open, delete work in browser
- [x] Run E2E tests: `npm run test:e2e` - must pass before next task

### Task 3: Extract useStatusManagement from EmployeeCardsView
- [x] Create `client/src/composables/useStatusManagement.js` with:
  - State: `showStatusChangePopup`, `statusChangeForm` (reactive), `showStatusHistoryPopup`, `statusHistoryLoading`, `statusHistory`
  - Computed (accept allFieldsSchema as param): `employmentOptions`, `workingStatus`, `statusChangeOptions`
  - Functions: `openStatusChangePopup(form)`, `closeStatusChangePopup()`, `applyStatusChange(form, selectedId, employees, saving, errorMessage, loadEmployees)`, `resetStatus(form, selectedId, employees, saving, errorMessage, loadEmployees)`, `openStatusHistoryPopup(selectedId)`, `closeStatusHistoryPopup()`
  - Utility: `formatHistoryTimestamp(isoStr)`, `formatHistoryDate(dateStr)`
- [x] Update `EmployeeCardsView.vue` to import and use `useStatusManagement`
- [x] Remove extracted code from EmployeeCardsView script section
- [x] Verify status change, reset, and history popup work in browser
- [x] Run E2E tests: `npm run test:e2e` - must pass before next task

### Task 4: Extract useDocumentGeneration from EmployeeCardsView
- [x] Create `client/src/composables/useDocumentGeneration.js` with:
  - State: `templates`
  - Functions: `loadTemplates()`, `generateDocumentForEmployee(template, selectedId)`
- [x] Update `EmployeeCardsView.vue` to import and use `useDocumentGeneration`
- [x] Remove extracted code from EmployeeCardsView script section
- [x] Verify template list loads and document generation works in browser
- [x] Run E2E tests: `npm run test:e2e` - must pass before next task

### Task 5: Extract useDismissedEvents from DashboardView
- [x] Create `client/src/composables/useDismissedEvents.js` with:
  - State: `dismissedEvents` (Set ref)
  - Functions: `generateEventId(type, employeeId, date)`, `loadDismissedEvents()`, `dismissEvent(eventId)`
  - Pure localStorage-based composable with no external dependencies
- [x] Update `DashboardView.vue` to import and use `useDismissedEvents`
- [x] Remove extracted code from DashboardView script section
- [x] Verify dismiss functionality works in browser (dismiss notification, refresh page, verify still dismissed)
- [x] Run E2E tests: `npm run test:e2e` - must pass before next task

### Task 6: Extract useDashboardNotifications from DashboardView
- [x] Create `client/src/composables/useDashboardNotifications.js` with:
  - State: `statusReturning`, `statusStarting`, `showStatusNotification`, `docExpiryToday`, `docExpiryWeek`, `showDocExpiryNotification`, `birthdayToday`, `birthdayNext7Days`, `showBirthdayNotification`, `retirementToday`, `retirementThisMonth`, `showRetirementNotification`
  - Module-level deduplication state: `notifiedEmployeeIds`, `notifiedDate`, `docExpiryNotifiedDate`, `birthdayNotifiedDate`, `retirementNotifiedIds`, `retirementNotifiedDate`
  - Computed (all 8 filtered* properties using dismissedEvents from `useDismissedEvents`)
  - Functions: all close* and dismiss* functions, `checkStatusChanges()`, `checkDocumentExpiry()`, `checkBirthdayEvents()`, `checkRetirementEvents()`
  - Accept dependencies: `employees`, `employmentOptions`, `workingStatus`, dismissed events composable
- [x] Update `DashboardView.vue` to import and use `useDashboardNotifications`
- [x] Remove extracted code from DashboardView script section
- [x] Verify all 4 notification types work in browser (status, doc expiry, birthday, retirement)
- [x] Run E2E tests: `npm run test:e2e` - must pass before next task

### Task 7: Extract useDashboardStats and useDashboardTimeline from DashboardView
- [x] Create `client/src/composables/useDashboardStats.js` with:
  - State: `expandedCard`
  - Computed: `dashboardStats(employees, employmentOptions)`, `expandedEmployees(employees)`
  - Functions: `toggleStatCard()`, `statusCardColor()`
- [x] Create `client/src/composables/useDashboardTimeline.js` with:
  - State: `dashboardEvents`, `dashboardOverdueEvents`
  - Functions: `loadDashboardEvents()`, `loadOverdueDocuments()`, `formatEventDate()`, `daysFromNowLabel()`, `timelineEventEmoji()`, `timelineEventDesc()`, `statusEmoji()`, `docExpiryEmoji()`
- [x] Update `DashboardView.vue` to import and use both composables
- [x] Remove extracted code from DashboardView script section
- [x] Verify dashboard stats cards and timeline display correctly in browser
- [x] Run E2E tests: `npm run test:e2e` - must pass before next task

### Task 8: Extract useDashboardReport from DashboardView
- [x] Create `client/src/composables/useDashboardReport.js` with:
  - State: `activeReport`, `reportData`, `reportLoading`
  - Computed: `absentEmployeesCount`, `statusChangesThisMonthCount`
  - Functions: `toggleReport(type)`
- [x] Update `DashboardView.vue` to import and use `useDashboardReport`
- [x] Remove extracted code from DashboardView script section
- [x] Verify report toggle (current/month) works in browser
- [x] Run E2E tests: `npm run test:e2e` - must pass before next task

### Task 9: Extract useCustomReport from ReportsView
- [ ] Create `client/src/composables/useCustomReport.js` with:
  - State: `customFilters`, `customReportResults`, `customReportLoading`, `selectedColumns`, `reportSortColumn`, `reportSortDirection`, `columnSearchTerm`, `errorMessage`
  - Computed: `filteredColumnsForSelector`
  - Functions: `addCustomFilter()`, `removeCustomFilter(index)`, `clearCustomFilters()`, `runCustomReport()`, `exportCustomReportCSV()`, `sortReportPreview(fieldKey)`, `filterConditionOptions(filter)`
  - Watch: deep watch on customFilters for condition reset
  - Accept dependencies: `allFieldsSchema`, `documentFields`, `getFieldType`, `appConfig`
- [ ] Update `ReportsView.vue` to import and use `useCustomReport`
- [ ] Remove extracted code from ReportsView script section
- [ ] Verify filter builder, report execution, sorting, and CSV export work in browser
- [ ] Run E2E tests: `npm run test:e2e` - must pass before next task

### Task 10: Extract useTemplatesManagement and useTemplateUpload from TemplatesView
- [ ] Create `client/src/composables/useTemplatesManagement.js` with:
  - State: `templates`, `loading`, `showTemplateDialog`, `templateDialogMode`, `templateForm` (reactive)
  - Functions: `loadTemplates()`, `openCreateTemplateDialog()`, `editTemplate(template)`, `saveTemplate()`, `closeTemplateDialog()`, `deleteTemplate(template)`, `openTemplateDocx(template)`, `reextractTemplatePlaceholders()`
- [ ] Create `client/src/composables/useTemplateUpload.js` with:
  - State: `showUploadTemplateModal`, `uploadTemplateId`, `uploadTemplateName`, `selectedTemplateFile`
  - Functions: `uploadTemplateFile(template)`, `closeUploadTemplateModal()`, `onTemplateFileSelected(event)`, `uploadTemplateDocx(loadTemplates)`
- [ ] Update `TemplatesView.vue` to import and use both composables
- [ ] Remove extracted code from TemplatesView script section
- [ ] Verify template CRUD and DOCX upload work in browser
- [ ] Run E2E tests: `npm run test:e2e` - must pass before next task

### Task 11: Extract useTableInlineEdit and useTableColumnFilters from TableView
- [ ] Create `client/src/composables/useTableInlineEdit.js` with:
  - State: `editingCells` (reactive)
  - Functions: `startEditCell(employeeId, fieldName, currentValue)`, `cancelEditCell(employeeId, fieldName)`, `isEditingCell(employeeId, fieldName)`, `getEditValue(employeeId, fieldName)`, `saveCell(employee, fieldName, employees, summaryColumns)`
- [ ] Create `client/src/composables/useTableColumnFilters.js` with:
  - State: `columnFilters` (reactive)
  - Functions: `toggleFilter(fieldName, value)`, `isFilterChecked(fieldName, value)`, `clearAllFilters()`, `getActiveFiltersCount()`, `hasActiveFilters(fieldName)`, `getColumnFilterCount(fieldName)`
- [ ] Update `TableView.vue` to import and use both composables
- [ ] Remove extracted code from TableView script section
- [ ] Verify inline cell editing and column filters work in browser
- [ ] Run E2E tests: `npm run test:e2e` - must pass before next task

### Task 12: Verify acceptance criteria
- [ ] Verify all 5 views are significantly reduced in size (target: no view over 600 lines)
- [ ] Verify all 14 composables follow the existing pattern from `useFieldsSchema.js` / `useEmployeeForm.js`
- [ ] Run full E2E test suite: `npm run test:e2e`
- [ ] Run backend unit tests: `cd server && npm test`
- [ ] Verify no user-visible behavior changes (all features work identically)
- [ ] Verify test coverage meets project standard (80%+)

### Task 13: [Final] Update documentation
- [ ] Update CLAUDE.md composables section with new composable descriptions
- [ ] Update CLAUDE.md frontend patterns if new patterns emerged during refactoring

*Note: ralphex automatically moves completed plans to `docs/plans/completed/`*

## Technical Details

### Composable Interface Pattern
Each composable follows the established pattern:
```javascript
// client/src/composables/useXxx.js
import { ref, computed, reactive } from "vue";
import { api } from "../api";

export function useXxx(/* dependencies */) {
  // Reactive state
  const stateA = ref(initialValue);

  // Computed properties
  const derivedA = computed(() => /* ... */);

  // Functions
  function doSomething() { /* ... */ }

  // Return public API
  return {
    stateA,
    derivedA,
    doSomething,
  };
}
```

### Dependency Injection Strategy
- Composables receive external dependencies via function parameters
- This keeps composables testable and decoupled
- Example: `useEmployeePhoto(form, savedFormSnapshot, selectedId)` rather than importing these from another composable internally
- For composables that depend on other composables (e.g., `useDashboardNotifications` needs `useDismissedEvents`), the parent view wires them together

### Expected Size Reduction
| View | Before | After (est.) | Reduction |
|------|--------|--------------|-----------|
| EmployeeCardsView | 1,402 | ~550 | ~60% |
| DashboardView | 1,023 | ~400 | ~61% |
| ReportsView | 415 | ~260 | ~37% |
| TemplatesView | 397 | ~210 | ~47% |
| TableView | 351 | ~240 | ~32% |

## Post-Completion

**Manual verification** (if applicable):
- Test all interactive features in browser across views
- Verify dark/light theme still works with all views
- Check responsive behavior on mobile viewport
