# Add "Don't Show Again" for Dashboard Notification Popups

## Overview
Add a "Don't show again" button to each dashboard notification popup (status changes, document expiry, birthdays, retirement). When clicked, the specific event notification will be permanently dismissed and stored in localStorage, preventing it from showing again even after page reload or dashboard navigation.

## Context
- Files involved: client/src/views/DashboardView.vue
- Related patterns: localStorage usage (see App.vue for theme management pattern)
- Dependencies: None

## Development Approach
- Testing approach: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Follow existing Vue 3 Composition API patterns
- Use localStorage for persistence (same pattern as theme toggle)
- CRITICAL: every task MUST include new/updated tests
- CRITICAL: all tests must pass before starting next task

## Implementation Steps

### Task 1: Add localStorage helper for dismissed events

**Files:**
- Modify: `client/src/views/DashboardView.vue`

- [x] add reactive ref for dismissed events: `const dismissedEvents = ref(new Set())`
- [x] add function to load dismissed events from localStorage on mount
- [x] add function to save dismissed event to localStorage and update ref
- [x] create stable event ID generator (combine event type + employee_id + date for uniqueness)
- [x] call load function in onMounted hook
- [x] write unit test for event ID generation logic (use existing test pattern from tests/e2e/)

### Task 2: Filter out dismissed events from display

**Files:**
- Modify: `client/src/views/DashboardView.vue`

- [x] add computed property to filter out dismissed events from each event type (birthdays, retirements, status changes, document expiry)
- [x] update template to use filtered event lists instead of raw event data
- [x] verify filtering logic works correctly (manual test: dismiss event, refresh page, confirm it stays hidden)
- [x] write E2E test: verify dismissed event persists after page reload (tests/e2e/dashboard.spec.js)

### Task 3: Add "Don't show again" button to notification popups

**Files:**
- Modify: `client/src/views/DashboardView.vue`

- [x] add "Більше не показувати" button to each notification popup/card
- [x] wire button click to call dismiss function with event ID
- [x] update button styling to match existing secondary button pattern
- [x] test button visibility and click behavior for each event type
- [x] write E2E test: click "Don't show again", verify event disappears immediately (tests/e2e/dashboard.spec.js)

### Task 4: Verify acceptance criteria

- [ ] manual test: dismiss each event type, refresh page, verify they stay dismissed
- [ ] manual test: clear localStorage, refresh page, verify events reappear
- [ ] run full E2E test suite: `npm run test:e2e`
- [ ] run server unit tests: `cd server && npm test`
- [ ] verify no console errors or warnings

### Task 5: Update documentation

- [ ] update CLAUDE.md if needed (add pattern to Frontend Patterns or Dashboard section)
- [ ] move this plan to `docs/plans/completed/`
