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
- [ ] Add /reports route to Vue Router configuration
- [ ] Create Reports view section in template
- [ ] Add "Звіти" tab button to navigation bar
- [ ] Implement filter builder UI:
  - Dynamic field selector dropdown (all fields from fields_schema)
  - Condition selector (contains, equals, not equals, empty, not empty)
  - Value input (text, select, date based on field type)
  - "Додати фільтр" and "Очистити фільтри" buttons
  - Support multiple filters (AND logic)
- [ ] Add date range filter (optional, for any date field)
- [ ] Add column selector (checkboxes to choose which fields to include in export)
- [ ] Implement preview table showing filtered results (paginated, max 100 rows preview)
- [ ] Add "Експорт в CSV" button
- [ ] Backend: Add GET /api/reports/custom endpoint accepting filter parameters
- [ ] Backend: Implement filtering logic in store.js (getCustomReport function)
- [ ] Backend: Return filtered employee data as JSON
- [ ] Frontend: Generate CSV from filtered data (reuse CSV export logic from table view)
- [ ] Frontend: Trigger download with proper filename (report_YYYY-MM-DD_HH-mm-ss.csv)
- [ ] Test filter builder with various field types (text, select, date, file)
- [ ] Test multiple filter combinations
- [ ] Test date range filtering
- [ ] Test column selector includes/excludes correct fields
- [ ] Test CSV export contains correct data with UTF-8 BOM
- [ ] Test empty results scenario

---

### TASK 3: Redesign Delete and Clear buttons in Cards view

**Files:**
- Modify: `client/src/App.vue`
- Modify: `client/src/styles.css`

**Subtasks:**
- [ ] Change "Видалити співробітника" button to icon-only (🗑️ trash icon)
- [ ] Change "Очистити форму" button to icon-only (🧹 broom icon or ✖️ X icon)
- [ ] Position buttons side-by-side (flexbox row with gap)
- [ ] Add title attribute to buttons for tooltip on hover (preserves accessibility)
- [ ] Add visual separation between these buttons and other action buttons
- [ ] Add subtle styling to prevent accidental clicks:
  - Smaller size than primary action buttons
  - Less prominent color (gray instead of blue)
  - Require hover state before full opacity
- [ ] Test buttons display correctly in Cards view
- [ ] Test tooltips appear on hover
- [ ] Test buttons are not easily clicked by accident

---

### TASK 4: Add confirmation dialog before clearing employee form

**Files:**
- Modify: `client/src/App.vue`

**Subtasks:**
- [ ] Create confirmation dialog component/section (reuse popup pattern from status change)
- [ ] Show dialog when "Очистити форму" button clicked
- [ ] Dialog message: "Ви впевнені, що хочете очистити форму? Всі незбережені дані будуть втрачені."
- [ ] Dialog buttons: "Так, очистити" and "Скасувати"
- [ ] Only clear form if user confirms "Так"
- [ ] Test dialog appears when clear button clicked
- [ ] Test "Так" button clears form
- [ ] Test "Скасувати" button closes dialog without clearing

---

### TASK 5: Redesign tab bar - swap refresh button with navigation, use icons

**Files:**
- Modify: `client/src/App.vue`
- Modify: `client/src/styles.css`

**Subtasks:**
- [ ] Move "Оновити" button from top-right to tab bar (leftmost or rightmost position)
- [ ] Change "Оновити" to icon-only (🔄 refresh icon)
- [ ] Change "Новий працівник" button to icon-only (➕ plus icon or 👤➕ person-plus)
- [ ] Reposition "Новий працівник" button:
  - Place next to navigation tabs (not at top-right)
  - Visually separate from view tabs (different color or divider)
- [ ] Ensure tab bar remains horizontal flexbox with proper spacing
- [ ] Add title attributes for accessibility
- [ ] Test refresh button reloads data correctly
- [ ] Test "Новий працівник" button clears form and navigates to /cards
- [ ] Test tab bar layout works on different screen sizes

---

### TASK 6: Move CSV import section to separate Import page

**Files:**
- Modify: `client/src/App.vue`

**Subtasks:**
- [ ] Add /import route to Vue Router configuration
- [ ] Create Import view section in template
- [ ] Add "Імпорт" tab button to navigation bar
- [ ] Move CSV file upload input and import button from employee card to Import page
- [ ] Move import instructions text to Import page
- [ ] Add "Завантажити шаблон CSV" button to download employees_import_sample.csv
- [ ] Keep import logic in same methods (importCSV, etc.)
- [ ] Update API call to use relative path /data/employees_import_sample.csv
- [ ] Remove CSV import section from employee card template
- [ ] Test navigation to /import page
- [ ] Test CSV file upload works from Import page
- [ ] Test template download works
- [ ] Test import validation and error messages

---

### TASK 7: Implement unsaved changes warning before navigation

**Files:**
- Modify: `client/src/App.vue`

**Subtasks:**
- [ ] Add reactive flag isFormDirty (tracks if employee form has unsaved changes)
- [ ] Set isFormDirty = true when any form field changes (watch formData)
- [ ] Reset isFormDirty = false when:
  - Employee saved successfully
  - Form cleared intentionally
  - New employee created
- [ ] Add Vue Router navigation guard (beforeRouteLeave equivalent)
- [ ] Show confirmation dialog when user tries to navigate away with unsaved changes:
  - Message: "У вас є незбережені зміни: [список змінених полів]. Зберегти перед виходом?"
  - Buttons: "Зберегти і продовжити", "Продовжити без збереження", "Скасувати"
  - List changed fields in message for transparency
- [ ] Handle browser refresh/close (window.beforeunload event)
- [ ] Test dialog appears when navigating away with unsaved changes
- [ ] Test "Зберегти" button saves and navigates
- [ ] Test "Продовжити" button navigates without saving
- [ ] Test "Скасувати" button stays on current page
- [ ] Test no dialog when no changes exist
- [ ] Test browser refresh warning

---

### TASK 8: Auto-sync employees_import_sample.csv with fields_schema.csv on startup

**Files:**
- Modify: `run.sh`
- Modify: `server/src/store.js`
- Create: `server/src/sync-template.js`

**Subtasks:**
- [ ] Add syncCSVTemplate function to store.js:
  - Read fields_schema.csv to get current EMPLOYEE_COLUMNS
  - Read employees_import_sample.csv
  - Compare headers
  - Add missing columns to template (append to header row)
  - Remove obsolete columns not in schema
  - Write updated template with UTF-8 BOM
  - Log sync results (added/removed columns)
- [ ] Create server/src/sync-template.js entry point:
  - Import store functions
  - Call syncCSVTemplate
  - Exit with appropriate status code
- [ ] Add template sync step to run.sh:
  - Run Node script before starting servers: node server/src/sync-template.js
  - Display sync output to console
- [ ] Add startup message: "Синхронізація шаблону CSV..."
- [ ] Test sync adds new columns from schema
- [ ] Test sync removes obsolete columns
- [ ] Test sync preserves UTF-8 BOM encoding
- [ ] Test run.sh executes sync before starting servers
- [ ] Test manual schema changes reflect in template after restart

---

## Final Validation

- [ ] Manual test: Dashboard loads with "Хто відсутній зараз" report auto-expanded
- [ ] Manual test: Navigate between all views (Dashboard, Cards, Table, Reports, Import, Logs)
- [ ] Manual test: Create employee, edit, save, verify no unsaved warning
- [ ] Manual test: Edit employee, navigate away, verify unsaved warning appears
- [ ] Manual test: Clear form button shows confirmation dialog
- [ ] Manual test: Delete button icon works correctly
- [ ] Manual test: Custom reports filtering and CSV export work correctly
- [ ] Manual test: Import page CSV upload works
- [ ] Manual test: Template download contains current schema columns
- [ ] Run full test suite (if automated tests exist)
- [ ] Verify all UI text in Russian
- [ ] Verify icon buttons have tooltips

## Documentation

- [ ] Update README.md: Add /reports and /import routes documentation
- [ ] Update README.uk.md: Add /reports and /import routes documentation (Ukrainian)
- [ ] Update CLAUDE.md:
  - Document new routes /reports and /import
  - Document custom reports API endpoint
  - Document CSV template sync on startup
  - Document unsaved changes warning pattern
  - Document icon-only button pattern
  - Document auto-expand report on Dashboard pattern
- [ ] Move this plan to `docs/plans/completed/`
