# UI/UX Improvements: Dashboard Report, Form Safety, Button Redesign, Custom Reports, CSV Import Management

**Created:** 2026-02-10

This plan implements 8 improvements to the CRM UI:

1. Dashboard - auto-show "Who is absent now" report on load
2. Cards view - redesign Delete and Clear buttons (icons only, side-by-side, accident prevention)
3. Cards view - confirmation dialog before clearing form
4. Tab bar redesign - swap "Оновити" with navigation, change to icon-based
5. Move CSV import section from employee card to separate Import page
6. Auto-sync employees_import_sample.csv with fields_schema.csv on run.sh startup
7. Unsaved changes warning when navigating away from employee card
8. Custom reports page with advanced filtering and CSV export

## Context

**Files involved:**
- Modify: `client/src/App.vue` (main UI changes)
- Modify: `client/src/api.js` (new API endpoints for custom reports)
- Modify: `server/src/index.js` (new API endpoints)
- Modify: `server/src/store.js` (report generation, CSV template sync)
- Modify: `run.sh` (add CSV template sync step)
- Create: `server/src/sync-template.js` (standalone script for CSV template sync)

**Related patterns:**
- Vue Router navigation (/, /cards, /table, /logs) - add /reports and /import
- Dashboard expandable sections - reuse toggleReport pattern
- Multi-select filters pattern from table view - reuse for custom reports
- CSV export pattern from table view - extend for custom reports
- Confirmation dialogs - similar to status change popup pattern

**Dependencies:** None (uses existing libraries)

## Implementation Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Follow existing Vue 3 Composition API patterns
- Maintain Russian UI language
- All buttons use icon-first design where specified
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Tasks

### TASK 1: Auto-show "Who is absent now" report on Dashboard load

**Files:**
- Modify: `client/src/App.vue`

**Subtasks:**
- [x] Add onMounted hook or update existing loadEmployees function to auto-expand "Хто відсутній зараз" report
- [x] Call toggleReport('current') automatically after employees loaded on Dashboard view
- [x] Ensure report only auto-expands on Dashboard, not on other views
- [x] Test Dashboard loads with "Хто відсутній зараз" report expanded
- [x] Test report shows correct employees (employment_status != options[0])
- [x] Test employee name links navigate to correct card
- [x] Test report remains collapsed on page reload if user manually collapsed it (optional persistence)

---

### TASK 2: Create Custom Reports page with advanced filtering and CSV export

**Files:**
- Modify: `client/src/App.vue`
- Modify: `client/src/api.js`
- Modify: `server/src/index.js`
- Modify: `server/src/store.js`

**Subtasks:**
- [x] Add /reports route to Vue Router configuration
- [x] Create Reports view section in template
- [x] Add "Звіти" tab button to navigation bar
- [x] Implement filter builder UI:
  - Dynamic field selector dropdown (all fields from fields_schema)
  - Condition selector (contains, equals, not equals, empty, not empty)
  - Value input (text, select, date based on field type)
  - "Додати фільтр" and "Очистити фільтри" buttons
  - Support multiple filters (AND logic)
- [x] Add date range filter (optional, for any date field)
- [x] Add column selector (checkboxes to choose which fields to include in export)
- [x] Implement preview table showing filtered results (paginated, max 100 rows preview)
- [x] Add "Експорт в CSV" button
- [x] Backend: Add GET /api/reports/custom endpoint accepting filter parameters
- [x] Backend: Implement filtering logic in store.js (getCustomReport function)
- [x] Backend: Return filtered employee data as JSON
- [x] Frontend: Generate CSV from filtered data (reuse CSV export logic from table view)
- [x] Frontend: Trigger download with proper filename (report_YYYY-MM-DD_HH-mm-ss.csv)
- [x] Test filter builder with various field types (text, select, date, file)
- [x] Test multiple filter combinations
- [x] Test date range filtering
- [x] Test column selector includes/excludes correct fields
- [x] Test CSV export contains correct data with UTF-8 BOM
- [x] Test empty results scenario

---

### TASK 3: Redesign Delete and Clear buttons in Cards view

**Files:**
- Modify: `client/src/App.vue`
- Modify: `client/src/styles.css`

**Subtasks:**
- [x] Change "Видалити співробітника" button to icon-only (🗑️ trash icon)
- [x] Change "Очистити форму" button to icon-only (🧹 broom icon or ✖️ X icon)
- [x] Position buttons side-by-side (flexbox row with gap)
- [x] Add title attribute to buttons for tooltip on hover (preserves accessibility)
- [x] Add visual separation between these buttons and other action buttons
- [x] Add subtle styling to prevent accidental clicks:
  - Smaller size than primary action buttons
  - Less prominent color (gray instead of blue)
  - Require hover state before full opacity
- [x] Test buttons display correctly in Cards view
- [x] Test tooltips appear on hover
- [x] Test buttons are not easily clicked by accident

---

### TASK 4: Add confirmation dialog before clearing employee form

**Files:**
- Modify: `client/src/App.vue`

**Subtasks:**
- [x] Create confirmation dialog component/section (reuse popup pattern from status change)
- [x] Show dialog when "Очистити форму" button clicked
- [x] Dialog message: "Ви впевнені, що хочете очистити форму? Всі незбережені дані будуть втрачені."
- [x] Dialog buttons: "Так, очистити" and "Скасувати"
- [x] Only clear form if user confirms "Так"
- [x] Test dialog appears when clear button clicked
- [x] Test "Так" button clears form
- [x] Test "Скасувати" button closes dialog without clearing

---

### TASK 5: Redesign tab bar - swap refresh button with navigation, use icons

**Files:**
- Modify: `client/src/App.vue`
- Modify: `client/src/styles.css`

**Subtasks:**
- [x] Move "Оновити" button from top-right to tab bar (leftmost or rightmost position)
- [x] Change "Оновити" to icon-only (🔄 refresh icon)
- [x] Change "Новий працівник" button to icon-only (➕ plus icon or 👤➕ person-plus)
- [x] Reposition "Новий працівник" button:
  - Place next to navigation tabs (not at top-right)
  - Visually separate from view tabs (different color or divider)
- [x] Ensure tab bar remains horizontal flexbox with proper spacing
- [x] Add title attributes for accessibility
- [x] Test refresh button reloads data correctly
- [x] Test "Новий працівник" button clears form and navigates to /cards
- [x] Test tab bar layout works on different screen sizes

---

### TASK 6: Move CSV import section to separate Import page

**Files:**
- Modify: `client/src/App.vue`

**Subtasks:**
- [x] Add /import route to Vue Router configuration
- [x] Create Import view section in template
- [x] Add "Імпорт" tab button to navigation bar
- [x] Move CSV file upload input and import button from employee card to Import page
- [x] Move import instructions text to Import page
- [x] Add "Завантажити шаблон CSV" button to download employees_import_sample.csv
- [x] Keep import logic in same methods (importCSV, etc.)
- [x] Update API call to use relative path /data/employees_import_sample.csv
- [x] Remove CSV import section from employee card template
- [x] Test navigation to /import page
- [x] Test CSV file upload works from Import page
- [x] Test template download works
- [x] Test import validation and error messages

---

### TASK 7: Implement unsaved changes warning before navigation

**Files:**
- Modify: `client/src/App.vue`

**Subtasks:**
- [x] Add reactive flag isFormDirty (tracks if employee form has unsaved changes)
- [x] Set isFormDirty = true when any form field changes (watch formData)
- [x] Reset isFormDirty = false when:
  - Employee saved successfully
  - Form cleared intentionally
  - New employee created
- [x] Add Vue Router navigation guard (beforeRouteLeave equivalent)
- [x] Show confirmation dialog when user tries to navigate away with unsaved changes:
  - Message: "У вас є незбережені зміни: [список змінених полів]. Зберегти перед виходом?"
  - Buttons: "Зберегти і продовжити", "Продовжити без збереження", "Скасувати"
  - List changed fields in message for transparency
- [x] Handle browser refresh/close (window.beforeunload event)
- [x] Test dialog appears when navigating away with unsaved changes
- [x] Test "Зберегти" button saves and navigates
- [x] Test "Продовжити" button navigates without saving
- [x] Test "Скасувати" button stays on current page
- [x] Test no dialog when no changes exist
- [x] Test browser refresh warning

---

### TASK 8: Auto-sync employees_import_sample.csv with fields_schema.csv on startup

**Files:**
- Modify: `run.sh`
- Modify: `server/src/store.js`
- Create: `server/src/sync-template.js`

**Subtasks:**
- [x] Add syncCSVTemplate function to store.js:
  - Read fields_schema.csv to get current EMPLOYEE_COLUMNS
  - Read employees_import_sample.csv
  - Compare headers
  - Add missing columns to template (append to header row)
  - Remove obsolete columns not in schema
  - Write updated template with UTF-8 BOM
  - Log sync results (added/removed columns)
- [x] Create server/src/sync-template.js entry point:
  - Import store functions
  - Call syncCSVTemplate
  - Exit with appropriate status code
- [x] Add template sync step to run.sh:
  - Run Node script before starting servers: node server/src/sync-template.js
  - Display sync output to console
- [x] Add startup message: "Синхронізація шаблону CSV..."
- [x] Test sync adds new columns from schema
- [x] Test sync removes obsolete columns
- [x] Test sync preserves UTF-8 BOM encoding
- [x] Test run.sh executes sync before starting servers
- [x] Test manual schema changes reflect in template after restart

---

## Final Validation

- [x] Manual test: Dashboard loads with "Хто відсутній зараз" report auto-expanded
- [x] Manual test: Navigate between all views (Dashboard, Cards, Table, Reports, Import, Logs)
- [x] Manual test: Create employee, edit, save, verify no unsaved warning
- [x] Manual test: Edit employee, navigate away, verify unsaved warning appears
- [x] Manual test: Clear form button shows confirmation dialog
- [x] Manual test: Delete button icon works correctly
- [x] Manual test: Custom reports filtering and CSV export work correctly
- [x] Manual test: Import page CSV upload works
- [x] Manual test: Template download contains current schema columns
- [x] Run full test suite (if automated tests exist)
- [x] Verify all UI text in Russian
- [x] Verify icon buttons have tooltips

## Documentation

- [x] Update README.md: Add /reports and /import routes documentation
- [x] Update README.uk.md: Add /reports and /import routes documentation (Ukrainian)
- [x] Update CLAUDE.md:
  - Document new routes /reports and /import
  - Document custom reports API endpoint
  - Document CSV template sync on startup
  - Document unsaved changes warning pattern
  - Document icon-only button pattern
  - Document auto-expand report on Dashboard pattern
- [x] Move this plan to `docs/plans/completed/`
