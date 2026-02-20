# Add Edit Functionality for Status Events

## Overview

Currently the "Зміна статусу працевлаштування" modal only allows adding and deleting status events. Users cannot modify an existing event — they must delete it and recreate it (error-prone, loses event_id continuity).

This plan adds **inline row editing** to the status events table:
- Click ✏️ → row becomes editable (status dropdown, start_date, end_date inputs)
- Click 💾 → save changes via PUT API
- Click ✕ → cancel, restore original values
- Overlap validation runs server-side (with `excludeEventId` so the event being edited doesn't conflict with itself)

## Context (from discovery)

- Files involved:
  - `server/src/routes/employees.js` — add PUT endpoint
  - `server/src/store.js` — add `updateStatusEvent()` with overlap re-validation
  - `client/src/api.js` — add `updateStatusEvent()` method
  - `client/src/composables/useStatusManagement.js` — add edit state and functions
  - `client/src/views/EmployeeCardsView.vue` — inline edit UI in status events table
- Related patterns: `addStatusEvent()` / `validateNoOverlap()` in store.js, POST endpoint in employees.js
- Dependencies: `validateNoOverlap(employeeId, start, end, excludeEventId)` — already has `excludeEventId` param but it's unused (always null)

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- All tests must pass before starting the next task

## Testing Strategy

- **Unit tests**: `server/test/status-events-store.test.js` — add tests for `updateStatusEvent()`
- **Integration tests**: `server/test/status-events-api.test.js` — add tests for PUT endpoint
- Run: `node server/test/status-events-store.test.js` and `node server/test/status-events-api.test.js`

## Implementation Steps

### Task 1: Backend store — add `updateStatusEvent()`

- [x] In `server/src/store.js`, add `export async function updateStatusEvent(eventId, data)` under `deleteStatusEvent()`
- [x] The function should: load events, find the event by `event_id`, validate required fields (`status`, `start_date`)
- [x] Call `validateNoOverlap(employeeId, start, end, eventId)` — pass `eventId` as `excludeEventId` so the event doesn't conflict with itself
- [x] Update the event fields (`status`, `start_date`, `end_date`) and save via `saveStatusEvents()`
- [x] Return the updated event object
- [x] Write tests in `server/test/status-events-store.test.js` for `updateStatusEvent()` — success case, event not found (throws), overlap conflict (throws), self-overlap exclusion works
- [x] Run `node server/test/status-events-store.test.js` — must pass before task 2

### Task 2: Backend API — add PUT endpoint

- [x] In `server/src/routes/employees.js`, add `app.put('/api/employees/:id/status-events/:eventId', ...)` after the DELETE handler
- [x] Validate `status` and `start_date` present (400 if missing)
- [x] Check employee exists (404 if not)
- [x] Call `updateStatusEvent(eventId, { status, start_date, end_date, employee_id })` — catch overlap error → 409 Conflict
- [x] After update, call `syncStatusEventsForEmployee(employeeId)` and re-save employee if changed
- [x] Add audit log entry: `action: 'UPDATE', entity_type: 'status_event'`
- [x] Return `{ event: updatedEvent, employee: currentEmployee }`
- [x] Write integration tests in `server/test/status-events-api.test.js` for the PUT endpoint:
  - success (200), event not found (404), employee not found (404), overlap (409), missing fields (400)
- [x] Run `node server/test/status-events-api.test.js` — must pass before task 3

### Task 3: Frontend — API client + composable

- [ ] In `client/src/api.js`, add `updateStatusEvent(employeeId, eventId, payload)` → `PUT /employees/:id/status-events/:eventId`
- [ ] In `client/src/composables/useStatusManagement.js`, add state: `editingEventId = ref(null)`, `editForm = ref({ status: '', startDate: '', endDate: '' })`
- [ ] Add `startEditEvent(event)` — sets `editingEventId` and populates `editForm` from event
- [ ] Add `cancelEditEvent()` — clears `editingEventId` and `editForm`
- [ ] Add `saveEditEvent(employeeId)` — calls `api.updateStatusEvent()`, on success updates `statusEvents` list and clears edit state, handles 409 overlap error into `statusEventError`
- [ ] Export the new state and functions from the composable

### Task 4: Frontend UI — inline row editing

- [ ] In `client/src/views/EmployeeCardsView.vue`, destructure the new composable exports: `editingEventId`, `editForm`, `startEditEvent`, `cancelEditEvent`, `saveEditEvent`
- [ ] In the status events table, change each row to conditionally render:
  - **View mode** (when `editingEventId !== event.event_id`): status text, formatted dates, ✏️ edit button + 🗑 delete button
  - **Edit mode** (when `editingEventId === event.event_id`): status `<select>`, start date `<input type="date">`, end date `<input type="date">`, 💾 save button + ✕ cancel button
- [ ] Bind edit inputs to `editForm.status`, `editForm.startDate`, `editForm.endDate`
- [ ] Edit button calls `startEditEvent(event)`, save calls `saveEditEvent(selectedId)`, cancel calls `cancelEditEvent()`
- [ ] Show `statusEventError` below the table when in edit mode (same as existing error display)
- [ ] Disable save button when `editForm.status` or `editForm.startDate` is empty

### Task 5: Verify and cleanup

- [ ] Run all backend tests: `cd server && npm test`
- [ ] Manual test: open employee card → status popup → edit an event → verify saved correctly
- [ ] Manual test: edit event to overlap with another → verify 409 error shown in UI
- [ ] Manual test: cancel edit → original values restored
- [ ] Verify the add-new-event form still works (not broken by edit mode)

## Technical Details

### `updateStatusEvent(eventId, data)` signature
```js
// data: { employee_id, status, start_date, end_date }
// Returns: updated event object
// Throws: 'Event not found', 'Overlap detected'
```

### PUT endpoint
```
PUT /api/employees/:id/status-events/:eventId
Body: { status, start_date, end_date? }
200: { event, employee }
400: missing fields
404: employee or event not found
409: overlap conflict
```

### Inline row structure (view mode)
```
| Звільнений | 25.02.2026 | без кінця | [✏️] [🗑] |
```

### Inline row structure (edit mode)
```
| [select▼] | [date input] | [date input] | [💾] [✕] |
```

## Post-Completion

- Manual UI/UX testing: test all edge cases in the browser
- Verify no regression in existing add/delete functionality
