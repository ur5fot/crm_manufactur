# Add Theme Toggle, Card Search, and Global Search

## Overview
This plan implements three UI enhancements: dark/light theme toggle, field search in employee cards view, and global search across employees, templates, and documents.

## Context
- Files involved:
  - Modify: `client/src/App.vue` (theme toggle, global search UI, card search)
  - Modify: `client/src/styles.css` (dark theme CSS variables and styles)
  - Modify: `server/src/index.js` (global search API endpoint)
  - Modify: `client/src/api.js` (global search API client method)
- Related patterns:
  - Existing refresh button pattern in topbar (App.vue line 2658-2665)
  - Existing search pattern in table view (App.vue searchTerm ref)
  - Existing API endpoint patterns (server/src/index.js)
- Dependencies: None (uses existing libraries)

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- All existing E2E and unit tests must continue to pass
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Implement dark/light theme toggle

**Files:**
- Modify: `client/src/styles.css`
- Modify: `client/src/App.vue`

- [ ] Add dark theme CSS variables in styles.css after line 20 (dark color palette with [data-theme="dark"] selector)
- [ ] Add theme state management in App.vue script section (ref for current theme, load from localStorage)
- [ ] Add theme toggle button in topbar next to refresh button (use sun/moon emoji icons)
- [ ] Implement toggleTheme function (switch between light/dark, save to localStorage, update data-theme attribute on html element)
- [ ] Add CSS transitions for smooth theme switching
- [ ] Write E2E test in tests/e2e/theme-toggle.spec.js (verify button exists, click toggles theme, theme persists on reload)
- [ ] Run full E2E test suite with npm run test:e2e - must pass

### Task 2: Add field search in employee cards view

**Files:**
- Modify: `client/src/App.vue`

- [ ] Add cardSearchTerm ref in App.vue script section
- [ ] Add filteredEmployeesForCards computed property (filters employees list by cardSearchTerm across all text fields)
- [ ] Add search input in cards view sidebar before employee list (line ~3028, styled like existing search inputs)
- [ ] Update employee list to use filteredEmployeesForCards instead of employees
- [ ] Add clear search button (X icon) that appears when cardSearchTerm is not empty
- [ ] Write E2E test in tests/e2e/card-search.spec.js (navigate to cards, enter search term, verify filtered results, clear search)
- [ ] Run full E2E test suite with npm run test:e2e - must pass

### Task 3: Implement global search API endpoint

**Files:**
- Modify: `server/src/index.js`
- Modify: `client/src/api.js`

- [ ] Add GET /api/search endpoint in server/src/index.js (after line 220, before employee endpoints)
- [ ] Implement search logic: load employees, templates, generatedDocuments
- [ ] Search employees across all text fields (names, position, status, etc)
- [ ] Search templates by template_name and description
- [ ] Search documents by filename and employee names (join with employees)
- [ ] Return results grouped by type: {employees: [], templates: [], documents: []} with total counts
- [ ] Add query parameter validation (require q parameter, min length 2 chars)
- [ ] Add globalSearch method to client/src/api.js
- [ ] Write integration test in server/test/search-api.test.js (verify endpoint returns correct results for various queries)
- [ ] Run server tests with cd server && npm run test:integration - must pass

### Task 4: Add global search UI in header

**Files:**
- Modify: `client/src/App.vue`
- Modify: `client/src/styles.css`

- [ ] Add globalSearchTerm ref and globalSearchResults ref in App.vue script
- [ ] Add showGlobalSearchResults ref (boolean to control dropdown visibility)
- [ ] Add performGlobalSearch async function (calls api.globalSearch, updates results)
- [ ] Add debounced watch on globalSearchTerm (300ms delay, calls performGlobalSearch)
- [ ] Add search input in topbar header (after brand, before tab-bar, line ~2647)
- [ ] Add search results dropdown (positioned absolutely below search input)
- [ ] Group results by type (Співробітники, Шаблони, Документи) with counts
- [ ] Add click handlers: employees navigate to cards view, templates to templates view, documents download
- [ ] Add outside click handler to close dropdown when clicking elsewhere
- [ ] Add CSS styles for search input and dropdown in styles.css
- [ ] Write E2E test in tests/e2e/global-search.spec.js (enter search term, verify dropdown appears, click result navigates correctly)
- [ ] Run full E2E test suite with npm run test:e2e - must pass

### Task 5: Verify acceptance criteria

- [ ] Manual test: toggle theme and verify all pages render correctly in both modes
- [ ] Manual test: search in cards view filters employee list correctly
- [ ] Manual test: global search finds employees, templates, and documents
- [ ] Manual test: clicking global search results navigates/downloads correctly
- [ ] Run full E2E test suite: npm run test:e2e
- [ ] Run server integration tests: cd server && npm run test:integration
- [ ] Run server unit tests: cd server && npm test
- [ ] Verify no console errors in browser or server logs

### Task 6: Update documentation

- [ ] Update README.md user-facing features section (mention theme toggle, search features)
- [ ] Update CLAUDE.md Frontend Patterns section (document theme management pattern)
- [ ] Update CLAUDE.md API Structure section (document /api/search endpoint)
- [ ] Move this plan to docs/plans/completed/
