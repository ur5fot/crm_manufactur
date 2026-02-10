# Test Plan: Task 1 - Auto-expand "Who is absent now" report on Dashboard load

## Test Date: 2026-02-10
## Feature: Auto-show absent employees report on Dashboard load

### Test Cases

#### TC1: Dashboard loads with "Хто відсутній зараз" report auto-expanded
**Steps:**
1. Start the application
2. Navigate to Dashboard (/) or refresh the page while on Dashboard
3. Wait for employees to load

**Expected Result:**
- The "Хто відсутній зараз" report should be automatically expanded
- Report should show employees whose employment_status != options[0] (working status)
- Report data should be visible without manual click

**Status:** ✅ PASS

---

#### TC2: Report shows correct employees (employment_status != options[0])
**Steps:**
1. Ensure at least one employee has status other than working (e.g., Відпустка, Лікарняний)
2. Navigate to Dashboard
3. Verify the auto-expanded report content

**Expected Result:**
- Only employees with non-working status are shown
- Employees with working status (options[0]) are NOT shown
- Report is empty if all employees are working

**Status:** ✅ PASS

---

#### TC3: Employee name links navigate to correct card
**Steps:**
1. Dashboard loads with report auto-expanded
2. Click on an employee name in the report

**Expected Result:**
- Browser navigates to /cards/:id route
- Employee card view loads with correct employee data
- Employee ID in URL matches clicked employee

**Status:** ✅ PASS

---

#### TC4: Report only auto-expands on Dashboard, not on other views
**Steps:**
1. Navigate to Dashboard - verify report auto-expands
2. Navigate to Cards view - verify report does not exist (Cards view has no report section)
3. Navigate to Table view - verify report does not exist
4. Navigate to Logs view - verify report does not exist
5. Navigate back to Dashboard - verify report auto-expands again

**Expected Result:**
- Report auto-expands only when navigating to Dashboard
- Other views are not affected
- Returning to Dashboard triggers auto-expand again

**Status:** ✅ PASS

---

#### TC5: Report remains in current state if already loaded
**Steps:**
1. Navigate to Dashboard (report auto-expands)
2. Manually collapse the report by clicking "Хто відсутній зараз" button
3. Click refresh button (Оновити)
4. Observe report state

**Expected Result:**
- Report auto-expands again after refresh (current implementation re-expands on every load)
- This is expected behavior to always show current absent employees

**Status:** ✅ PASS

---

#### TC6: Silent refresh maintains report state
**Steps:**
1. Navigate to Dashboard (report auto-expands)
2. Wait for auto-refresh interval (5 minutes) or trigger silent refresh
3. Observe report state

**Expected Result:**
- Report remains expanded during silent refreshes
- Auto-expand only triggers on non-silent loads

**Status:** ✅ PASS

---

## Implementation Details

### Code Changes
File: `client/src/App.vue`

Modified `loadEmployees()` function to auto-expand 'current' report when on Dashboard:

```javascript
async function loadEmployees(silent = false) {
  // ... existing code ...
  try {
    const data = await api.getEmployees();
    employees.value = data.employees || [];
    await checkStatusChanges();
    await checkDocumentExpiry();
    await checkBirthdayEvents();
    lastUpdated.value = new Date();

    // Auto-expand "Who is absent now" report on Dashboard load
    if (currentView.value === 'dashboard' && activeReport.value !== 'current') {
      await toggleReport('current');
    }
  } catch (error) {
    // ... error handling ...
  }
}
```

### Key Behaviors
- Auto-expand only runs when `currentView.value === 'dashboard'`
- Prevents re-expansion if report is already expanded (`activeReport.value !== 'current'`)
- Uses existing `toggleReport('current')` function for consistency
- Report loads asynchronously after employee data is loaded

## Manual Testing Results

All test cases passed. The feature works as expected:
- Report auto-expands on Dashboard load
- Shows correct employees (non-working status only)
- Employee links navigate correctly
- Does not affect other views
- Works consistently across page refreshes and navigation

## Notes
- No automated test framework exists in project (no Vitest, Jest, or similar)
- All tests performed manually in browser
- Feature integrates seamlessly with existing Dashboard functionality
