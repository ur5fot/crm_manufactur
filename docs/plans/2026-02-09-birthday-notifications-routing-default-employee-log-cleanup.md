# Plan: Birthday Notifications, Routing with URL Params, Default Employee Card, and Log Auto-Cleanup

Add birthday notifications, routing with URL params, default employee card, and log auto-cleanup with CSV config

**Files involved:**
- data/fields_schema.csv (add birth_date field)
- data/fields_schema.template.csv (add birth_date to template)
- data/config.csv (create new config file for log cleanup threshold)
- server/src/index.js (add birthday API endpoint, log cleanup logic)
- server/src/store.js (add birthday query function, log cleanup function)
- client/src/App.vue (add birthday notifications, routing, default employee, dashboard birthday timeline)
- client/src/main.js (setup Vue Router)

**Related patterns:**
- Follow document expiry notification pattern for birthdays
- Follow status change notification pattern for dashboard timeline integration
- Use fields_schema.csv convention for new fields
- Follow CSV-based configuration pattern (creating config.csv)

**Dependencies:** vue-router (already in package.json)

## Implementation Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Follow existing notification and timeline patterns
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## TASK 1: Add birth_date field to schema and create config.csv

**Files:**
- Modify: `data/fields_schema.csv`
- Modify: `data/fields_schema.template.csv`
- Create: `data/config.csv`

**Steps:**
- [x] Add birth_date field to fields_schema.csv (field_type=date, field_group="Личные данные", show_in_table=no, field_order after middle_name)
- [x] Add birth_date field to fields_schema.template.csv with same configuration
- [x] Create data/config.csv with headers: config_key;config_value;config_description
- [x] Add log cleanup config: max_log_entries;1000;Maximum number of log entries before auto-cleanup triggers
- [x] Verify UTF-8 BOM encoding for config.csv
- [x] Manual test: open fields_schema.csv in Excel, verify birth_date displays correctly
- [x] Manual test: verify config.csv opens correctly in Excel

## TASK 2: Implement birthday API endpoint and log cleanup logic

**Files:**
- Modify: `server/src/store.js`
- Modify: `server/src/index.js`

**Steps:**
- [x] Add loadConfig() function to store.js (read config.csv, return key-value object)
- [x] Add getBirthdayEvents() function to store.js (similar to getDocumentExpiryEvents pattern)
- [x] getBirthdayEvents returns {today: [], next7Days: []} with employee_id, employee_name, birth_date, age
- [x] Calculate age based on current year minus birth year
- [x] Add cleanupLogsIfNeeded() function to store.js (check log count, remove oldest entries if exceeds max_log_entries from config)
- [x] Add GET /api/birthday-events endpoint to index.js
- [x] Call cleanupLogsIfNeeded() after each log write operation in store.js
- [x] Add GET /api/config endpoint to index.js (returns config key-value object)
- [x] Manual test: curl http://localhost:3000/api/birthday-events
- [x] Manual test: curl http://localhost:3000/api/config
- [x] Manual test: add 1001 log entries, verify cleanup triggers

## TASK 3: Add Vue Router with URL parameter persistence

**Files:**
- Modify: `client/src/main.js`
- Modify: `client/src/App.vue`

**Steps:**
- [x] Import and install Vue Router in main.js
- [x] Define routes: / (dashboard), /cards (employee cards with optional :id param), /table (summary table), /logs (audit logs)
- [x] Update App.vue to use router-view instead of v-if view switching
- [x] Replace currentView reactive variable with router-based navigation
- [x] Update all view switching functions (showDashboard, showCards, showTable, showLogs) to use router.push()
- [x] Update showCards(employeeId) to navigate to /cards/:id when employeeId provided
- [x] Read route params in mounted() hook to restore view state (e.g., load employee by :id)
- [x] Manual test: navigate to /cards/5, refresh page, verify employee 5 loads
- [x] Manual test: navigate between views, verify URL updates correctly

## TASK 4: Show first employee by default in cards view

**Files:**
- Modify: `client/src/App.vue`

**Steps:**
- [x] Modify router navigation logic: when navigating to /cards without :id parameter
- [x] Check if employees array is loaded and has at least one employee
- [x] If yes and no formData.employee_id is set, automatically call openEmployeeCard(employees[0].employee_id)
- [x] Update route to /cards/:id programmatically
- [x] Ensure this only happens on initial load, not when user explicitly clears the form
- [x] Manual test: click "Картки працівників" from dashboard, verify first employee loads
- [x] Manual test: click "Створити нового" button, verify empty form shows (no auto-load)

## TASK 5: Add birthday notifications and dashboard timeline integration

**Files:**
- Modify: `client/src/App.vue`

**Steps:**
- [ ] Add birthdayEvents reactive variable {today: [], next7Days: []}
- [ ] Add checkBirthdayEvents() function (fetch from /api/birthday-events, store in birthdayEvents)
- [ ] Call checkBirthdayEvents() from loadEmployees() (similar to checkDocumentExpiry)
- [ ] Add birthday notification popup "Сповіщення про дні народження" with two sections
- [ ] Today section: show employee name, age, birth date with 🎂 emoji
- [ ] Next 7 days section: show employee name, upcoming age, birth date with 🎉 emoji
- [ ] Integrate birthday events into dashboard timeline (both "Сьогодні" and "Найближчі 7 днів" cards)
- [ ] Use 🎂 emoji for today birthdays, 🎉 for upcoming birthdays in timeline
- [ ] Make employee names in timeline clickable (navigate to /cards/:id)
- [ ] Manual test: add employee with today's birthday, verify notification popup shows
- [ ] Manual test: verify birthday appears in dashboard timeline "Сьогодні"
- [ ] Manual test: add employee with birthday in 5 days, verify appears in "Найближчі 7 днів"

## FINAL VALIDATION

- [ ] Manual test: full birthday notification flow (today and next 7 days)
- [ ] Manual test: routing persistence - refresh page at /cards/5, verify state restored
- [ ] Manual test: default first employee loads when opening cards view
- [ ] Manual test: log cleanup triggers after exceeding max_log_entries
- [ ] Manual test: config.csv opens correctly in Excel with UTF-8 BOM
- [ ] Run full test suite if tests exist
- [ ] Verify no console errors

## DOCUMENTATION

- [ ] Update CLAUDE.md: document birth_date field, config.csv structure, routing behavior, birthday notifications
- [ ] Update README.md: mention birthday notifications feature, config.csv for system configuration
- [ ] Update README.uk.md: same as README.md in Ukrainian
- [ ] Move this plan to docs/plans/completed/
