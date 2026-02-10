# Multi-feature enhancement: Dashboard overdue documents, advanced filters, retirement tracking, and UX improvements

- Files involved:
  - client/src/App.vue (dashboard, reports UI, filter logic)
  - server/src/index.js (API endpoints)
  - server/src/store.js (backend filter logic, retirement check, overdue documents)
  - data/config.csv (new config parameters)

- Related patterns:
  - Existing document expiry system (checkDocumentExpiry, getDocumentExpiryEvents)
  - Birthday events system (similar pattern for retirement)
  - Dashboard timeline cards structure
  - Custom reports filter builder
  - Config-driven behavior (max_log_entries pattern)

- Dependencies: None (uses existing Vue 3, Express, csv libraries)

## Approach

- Testing approach: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Follow existing patterns for timeline events, filters, and config usage
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Tasks

### TASK 1: Add overdue documents block to dashboard

**Files:**
- Modify: `server/src/store.js`
- Modify: `server/src/index.js`
- Modify: `client/src/App.vue`

- [x] Update getDocumentExpiryEvents() in store.js to include 'overdue' category (documents with expiry_date < today)
- [x] Add new API endpoint GET /api/document-overdue returning {overdue: [...]} with same structure as document-expiry
- [x] Add dashboardOverdueEvents ref in App.vue to store overdue documents
- [x] Add loadOverdueDocuments() function calling api.getDocumentOverdue()
- [x] Call loadOverdueDocuments() from loadDashboardData()
- [x] Add new timeline-card block "Прострочені документи" after existing timeline cards in dashboard view
- [x] Display overdue documents with warning emoji (⚠️), employee name (clickable link), document type, and expiry date
- [x] Add "Немає прострочених документів" empty state
- [x] Test: verify overdue documents appear on dashboard when expiry_date < today
- [x] Test: verify clicking employee name navigates to employee card
- [x] run npm test (if tests exist) - must pass before task 2

### TASK 2: Enhanced filter conditions based on field type

**Files:**
- Modify: `client/src/App.vue`
- Modify: `server/src/store.js`
- Modify: `server/src/index.js`

- [x] Add getFieldType(fieldName) computed function in App.vue returning field type from allFieldsSchema
- [x] Add computed property filterConditionOptions(filter) that returns condition options based on filter.field type:
  - text: contains (default), not_contains
  - number/salary: greater_than, less_than, equals
  - date: date_range (requires two inputs: from and to)
  - all types: empty, not_empty
- [x] Update filter-condition select to use v-for with filterConditionOptions(filter)
- [x] Update filter-value input rendering logic:
  - Show single text input for text conditions (contains, not_contains)
  - Show single number input (type=number) for number conditions
  - Show TWO date inputs (type=date) for date_range condition (filter.valueFrom, filter.valueTo)
  - Hide inputs for empty/not_empty conditions
- [x] Update customFilters data structure to support valueFrom/valueTo for date ranges
- [x] Update backend exportEmployees() in store.js to handle new condition types:
  - not_contains: check !haystack.includes(value)
  - greater_than: parseFloat(emp[field]) > parseFloat(value)
  - less_than: parseFloat(emp[field]) < parseFloat(value)
  - equals (number): parseFloat(emp[field]) === parseFloat(value)
  - date_range: emp[field] >= valueFrom && emp[field] <= valueTo
- [x] Update GET /api/reports/custom endpoint to pass new filter conditions to exportEmployees
- [x] Test: text field with contains/not_contains filters correctly
- [x] Test: number field with >/</= filters correctly
- [x] Test: date field with period from-to filters correctly
- [x] run npm test - must pass before task 3

### TASK 3: Move max file upload size to config.csv

**Files:**
- Modify: `data/config.csv`
- Modify: `server/src/index.js`

- [x] Add new row to config.csv: max_file_upload_mb;10;Maximum file upload size in megabytes
- [x] Load config in index.js at startup (after ensureDataDirs, before defining multer)
- [x] Store config in module-level variable: const appConfig = await loadConfig()
- [x] Update upload multer limits to use: fileSize: parseInt(appConfig.max_file_upload_mb || 10) * 1024 * 1024
- [x] Update importUpload multer limits similarly (or reuse same config value)
- [x] Add console.log on startup: "Max file upload size: {value}MB"
- [x] Test: upload file larger than configured limit fails with appropriate error
- [x] Test: upload file smaller than limit succeeds
- [x] run npm test - must pass before task 4

### TASK 4: Retirement age notification and auto-dismiss

**Files:**
- Modify: `data/config.csv`
- Modify: `server/src/store.js`
- Modify: `server/src/index.js`
- Modify: `client/src/App.vue`

- [ ] Add new row to config.csv: retirement_age_years;60;Retirement age in years for auto-dismiss notification
- [ ] Add getRetirementEvents() function in store.js similar to getBirthdayEvents:
  - Calculate age from birth_date field
  - Find employees reaching retirement_age_years today
  - Return {today: [...], thisMonth: [...]} with employee_id, name, age, birth_date
- [ ] Add new API endpoint GET /api/retirement-events in index.js
- [ ] Add checkRetirementEvents() function in App.vue similar to checkBirthdayEvents
- [ ] Call checkRetirementEvents() from loadEmployees()
- [ ] Add showRetirementNotification ref and retirementEvents ref
- [ ] Add notification modal "Сповіщення про вихід на пенсію" with sections:
  - Employees reaching retirement today: 👴 emoji, name, age
  - Employees reaching retirement this month: ℹ️ emoji, name, age, date
- [ ] Add auto-dismiss logic in checkRetirementEvents: if employee reaches retirement age today, update employment_status to options[1] (fired/dismissed)
- [ ] Log the auto-dismiss action to audit logs
- [ ] Test: employee turning 60 today triggers notification
- [ ] Test: employee turning 60 today auto-dismissed to fired status
- [ ] Test: retirement age configurable via config.csv
- [ ] run npm test - must pass before task 5

### TASK 5: Reports page preview table improvements

**Files:**
- Modify: `data/config.csv`
- Modify: `client/src/App.vue`

- [ ] Add new row to config.csv: max_report_preview_rows;100;Maximum rows shown in report preview table
- [ ] Load config in App.vue on mount via api.getConfig() and store in appConfig ref
- [ ] Add row numbering column as first column in preview table <th>№</th>
- [ ] Add row number in tbody: <td>{{ index + 1 }}</td>
- [ ] Add reportSortColumn ref (field key) and reportSortDirection ref ('asc' or 'desc')
- [ ] Add sortReportPreview(fieldKey) function that toggles sort direction and sorts customReportResults
- [ ] Make each <th> clickable with @click="sortReportPreview(field)" and show sort indicator (↑/↓)
- [ ] Update preview table to show only first N rows: customReportResults.slice(0, appConfig.max_report_preview_rows)
- [ ] Update status bar to show: "Знайдено записів: X (показано: Y)" where Y = min(X, max_preview_rows)
- [ ] Add subtle hint below column selector checkboxes: "💡 Підказка: звіт автоматично виконується після вибору колонок"
- [ ] Style hint as small gray text (font-size: 0.85rem, color: #666, margin-top: 0.5rem)
- [ ] Test: preview table shows max N rows even if results larger
- [ ] Test: clicking column header sorts preview table
- [ ] Test: row numbering displays correctly
- [ ] run npm test - must pass before task 6

### TASK 6: Move refresh button to far right in header

**Files:**
- Modify: `client/src/App.vue`

- [ ] Move refresh button code block from current position (before tab-divider) to after the v-for tabs loop
- [ ] Ensure refresh button remains inside .tab-bar container
- [ ] Verify button still uses class="tab-icon-btn refresh-btn" and title="Оновити дані"
- [ ] Test: refresh button appears at far right after Logs tab
- [ ] Test: refresh button functionality unchanged (calls refreshManually)
- [ ] run npm test - must pass before task 7

### TASK 7: Reports page column selector enhancements

**Files:**
- Modify: `client/src/App.vue`

- [ ] Add columnSearchTerm ref for filtering column checkboxes
- [ ] Add text input above column checkboxes: <input v-model="columnSearchTerm" placeholder="Пошук полів..." />
- [ ] Add computed property filteredColumnsForSelector that filters allFieldsSchema by columnSearchTerm (search in field.label)
- [ ] Update v-for in column checkboxes to use filteredColumnsForSelector instead of allFieldsSchema
- [ ] Add document date fields to allFieldsSchema or create separate list for date companions:
  - For each document field (field_type=file), add two entries: "{label} - Дата видачі", "{label} - Дата закінчення"
  - Map to field keys: "{field_key}_issue_date", "{field_key}_expiry_date"
- [ ] Ensure document date fields appear in column selector with proper labels
- [ ] Update selectedColumns to allow selecting date fields
- [ ] Update preview table and CSV export to include selected date fields
- [ ] Test: column search filters checkboxes correctly
- [ ] Test: document issue_date and expiry_date fields selectable and appear in export
- [ ] run npm test - must pass before task 8

### TASK 8: Dashboard reports show count

**Files:**
- Modify: `client/src/App.vue`

- [ ] Add computed property absentEmployeesCount returning dashboardReports.current.length
- [ ] Add computed property statusChangesThisMonthCount returning dashboardReports.month.length
- [ ] Update dashboard report section title "Хто відсутній зараз" to include count: "Хто відсутній зараз ({{ absentEmployeesCount }})"
- [ ] Update dashboard report section title "Зміни статусів цього місяця" to include count: "Зміни статусів цього місяця ({{ statusChangesThisMonthCount }})"
- [ ] Test: counts display correctly on dashboard
- [ ] Test: counts update when data changes
- [ ] run npm test - must pass

## Final Validation

- [ ] manual test: verify all 8 features work correctly in browser
- [ ] manual test: verify overdue documents block appears on dashboard with correct data
- [ ] manual test: verify filter conditions adapt to field types (text/number/date)
- [ ] manual test: verify file upload respects config.csv limit
- [ ] manual test: verify retirement notification appears and auto-dismisses employee
- [ ] manual test: verify report preview table has numbering, sorting, and max rows config
- [ ] manual test: verify refresh button moved to far right
- [ ] manual test: verify column selector has search and document date fields
- [ ] manual test: verify dashboard reports show counts
- [ ] run full test suite: npm test (if exists)
- [ ] verify no console errors in browser
- [ ] verify CSV files remain properly formatted with UTF-8 BOM

## Documentation

- [ ] update README.md with new config parameters (max_file_upload_mb, retirement_age_years, max_report_preview_rows)
- [ ] update README.uk.md with same config parameter docs (Ukrainian)
- [ ] update CLAUDE.md with new features:
  - Overdue documents timeline block
  - Enhanced filter conditions documentation
  - Retirement age tracking system
  - Report preview improvements
  - Column selector enhancements
- [ ] move this plan to docs/plans/completed/
