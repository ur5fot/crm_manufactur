# Task 6 Validation Checklist - Import Page

## Automated Checks
- [x] Build succeeds without errors (npm run build)
- [x] Server starts without errors
- [x] No syntax errors in modified files

## Implementation Checklist
- [x] Added /import route to main.js
- [x] Created Import view section in App.vue template
- [x] Added "Імпорт" tab to navigation bar
- [x] Moved CSV file upload input to Import page
- [x] Moved import button to Import page
- [x] Moved import instructions text to Import page
- [x] Added "Завантажити шаблон" button to Import page
- [x] Removed CSV import section from employee card template
- [x] Updated currentView computed to handle 'import' view
- [x] Updated switchView function to handle 'import' route
- [x] Updated tabs array with 'Імпорт' tab
- [x] Import logic (importEmployees, resetImport, onImportFileChange) unchanged

## Manual Test Instructions

Start the application:
```bash
./run.sh
```

Then test:

1. Navigate to http://localhost:5173/import
   - Verify "Імпорт" tab appears in navigation bar
   - Verify tab is highlighted when on /import route

2. On Import page, verify:
   - Page title: "Імпорт співробітників з CSV"
   - Section title: "Завантажити CSV файл"
   - "Завантажити шаблон" link is present and clickable
   - CSV file input field exists
   - "Імпортувати" button is disabled when no file selected
   - "Очистити" button is disabled when no file and no results
   - Instructions text: "CSV: UTF-8, роздільник ;, заголовки як у employees.csv. Прізвище або ім'я обов'язкові."

3. Test template download:
   - Click "Завантажити шаблон" link
   - Verify employees_import_sample.csv downloads

4. Test CSV upload:
   - Select a CSV file
   - Verify file name appears below actions
   - Verify "Імпортувати" button becomes enabled
   - Click "Імпортувати"
   - Verify import result displays (Додано/Пропущено counts)
   - Verify errors display if any

5. Navigate to Cards view:
   - Open any employee card
   - Scroll to bottom
   - Verify "Імпорт нових співробітників" section is NOT present
   - Verify only "CSV файли" section exists (with employees.csv, dictionaries.csv links)

6. Test navigation between views:
   - Switch between Dashboard, Картки, Таблиця, Звіти, Імпорт, Логи
   - Verify all tabs work correctly
   - Verify import page preserves state when navigating away and back

## Expected Results
All manual tests should pass. The import functionality should work identically to before, but now from a dedicated page instead of the employee card.

## Files Modified
- /Users/dim/code/crm_manufactur/client/src/main.js (added /import route)
- /Users/dim/code/crm_manufactur/client/src/App.vue (moved import section, updated navigation)

## Files Created
- /Users/dim/code/crm_manufactur/client/src/App.test.js (placeholder test file)
- /Users/dim/code/crm_manufactur/TASK6_VALIDATION.md (this file)
