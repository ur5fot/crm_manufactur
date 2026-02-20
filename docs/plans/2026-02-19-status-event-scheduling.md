# Status Event Scheduling System

## Overview

Replace the current simple status change (direct field update) with an **event-based scheduling system**. Employees can have multiple status events scheduled over time. Each event has a required start date and optional end date. No two events can overlap. The system automatically activates future events when their time comes, and automatically resets the status to "Працює" when an event expires.

**Key behaviors:**
- Start date is required when adding a status event; defaults to today
- After saving: if the event is currently active (today is within its range), it immediately becomes the displayed status
- Events for the same employee cannot overlap in time
- Future events auto-activate when their start date arrives
- Events auto-expire (reset to "Працює") when their end date passes
- Events with no end date stay active indefinitely

## Context

- `status_events.csv` — **new** schedule table (source of truth for events)
- `employees.csv` — `employment_status`, `status_start_date`, `status_end_date` remain as a **cached mirror** of the active event
- `status_history.csv` — remains as **audit log** (unchanged structure)
- Auto-sync runs when: employee card is loaded (`GET /api/employees/:id`) and dashboard loads (`GET /api/dashboard/events`)

**Files involved:**
- `server/src/schema.js` — add STATUS_EVENT_COLUMNS
- `server/src/store.js` — add status event store functions + sync logic
- `server/src/routes/employees.js` — add status event API routes
- `server/src/routes/dashboard.js` — call sync on dashboard load
- `server/src/index.js` — register new routes
- `client/src/api.js` — add status event API methods
- `client/src/composables/useStatusManagement.js` — full redesign for event-based flow
- `client/src/views/EmployeeCardsView.vue` — update status change modal template
- `server/test/status-events-store.test.js` — **new** unit tests
- `server/test/status-events-api.test.js` — **new** integration tests

## Development Approach

- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- All tests must pass before starting next task

## Implementation Steps

### Task 1: Backend — schema and store functions

- [x] Add `STATUS_EVENT_COLUMNS` to `server/src/schema.js`:
  `event_id, employee_id, status, start_date, end_date, created_at, active`
- [x] Add `STATUS_EVENTS_PATH` constant and `statusEventWriteLock` to `server/src/store.js`
- [x] Implement `loadStatusEvents()` and `saveStatusEvents(rows)` using existing CSV pattern
- [x] Implement `getStatusEventsForEmployee(employeeId)` — returns events sorted by start_date asc, filtered active='yes'
- [x] Implement `addStatusEvent({ employee_id, status, start_date, end_date })` — auto-assigns event_id, created_at, active='yes'; returns new event
- [x] Implement `deleteStatusEvent(eventId)` — hard delete (remove row from CSV)
- [x] Implement `removeStatusEventsForEmployee(employeeId)` — hard delete all events for employee (called on employee delete)
- [x] Implement `getActiveEventForEmployee(employeeId, dateStr)` — returns event where `start_date <= dateStr` AND (`end_date` is empty OR `end_date >= dateStr`); returns null if none
- [x] Implement `validateNoOverlap(employeeId, start_date, end_date, excludeEventId?)` — returns `true` if no overlap exists; overlap logic: two events overlap if `A.start_date <= B.end_date_or_infinity AND A.end_date_or_infinity >= B.start_date`
- [x] Write `server/test/status-events-store.test.js`: test addStatusEvent, deleteStatusEvent, getActiveEventForEmployee (active, future, expired, no-end), validateNoOverlap (no overlap, overlap, adjacent dates OK, open-end events)
- [x] Run unit tests: `node server/test/status-events-store.test.js` — must pass

### Task 2: Backend — auto-sync function

- [x] Implement `syncStatusEventsForEmployee(employeeId)` in `server/src/store.js`:
  1. Load employee; if not found or no events in status_events for this employee → return (do nothing to preserve existing status for old data)
  2. Get today's date string
  3. Find active event via `getActiveEventForEmployee(employeeId, today)`
  4. If active event found and employee status differs → update employee `employment_status`, `status_start_date`, `status_end_date` + write status_history entry (changed_by='system')
  5. If no active event found AND employee has events in table AND employee status != workingStatus → reset to "Працює", clear dates + write status_history entry (changed_by='system')
  6. (The "has events in table" guard prevents resetting old employees who predate the event system)
- [x] Export `syncStatusEventsForEmployee` and `syncAllStatusEvents` (calls sync for all active employees — used at dashboard load)
- [x] Write unit tests for sync logic in `server/test/status-events-store.test.js`: test auto-activate future event, test auto-expire with reset, test no-op when no events exist for employee
- [x] Run unit tests — must pass

### Task 3: Backend — status event API routes

- [ ] Add `GET /api/employees/:id/status-events` to `server/src/routes/employees.js`:
  - Returns `{ events: [...] }` sorted by start_date asc
  - 404 if employee not found
- [ ] Add `POST /api/employees/:id/status-events`:
  - Required: `status`, `start_date`; Optional: `end_date`
  - 400 if `status` or `start_date` missing
  - 400 if `end_date` is set and `end_date < start_date`
  - 409 if overlap with existing event (`validateNoOverlap` returns false); error message: "Подія перетинається з існуючою подією"
  - Create event via `addStatusEvent()`
  - Immediately call `syncStatusEventsForEmployee(id)` to apply if currently active
  - Create audit log entry (action: 'CREATE', entity_type: 'status_event')
  - Return `{ event: {...}, employee: updatedEmployee }`
  - 404 if employee not found
- [ ] Add `DELETE /api/employees/:id/status-events/:eventId`:
  - 404 if employee or event not found
  - 403 if event belongs to different employee
  - Call `deleteStatusEvent(eventId)`
  - Call `syncStatusEventsForEmployee(id)` to update employee status after deletion
  - Create audit log entry (action: 'DELETE', entity_type: 'status_event')
  - Return 204 No Content
- [ ] Call `syncAllStatusEvents()` inside `GET /api/dashboard/events` route (before returning events)
- [ ] Call `syncStatusEventsForEmployee(id)` inside `GET /api/employees/:id` route (after loading, before returning)
- [ ] Call `removeStatusEventsForEmployee(id)` inside `DELETE /api/employees/:id` route
- [ ] Write `server/test/status-events-api.test.js` (integration tests, requires running server):
  - GET events returns empty array for new employee
  - POST creates event, returns employee with updated status (if immediately active)
  - POST with future start_date: event created but employee status unchanged
  - POST with overlap returns 409
  - POST with missing start_date returns 400
  - DELETE event returns 204
  - DELETE non-existent event returns 404
  - Auto-sync: employee status updates after event activates (mock date or use past start_date)
- [ ] Run integration tests: `node server/test/status-events-api.test.js` — must pass

### Task 4: Frontend — API client and composable

- [ ] Add to `client/src/api.js`:
  ```js
  getStatusEvents(employeeId) → GET /employees/:id/status-events
  addStatusEvent(employeeId, payload) → POST /employees/:id/status-events
  deleteStatusEvent(employeeId, eventId) → DELETE /employees/:id/status-events/:eventId
  ```
- [ ] Rewrite `client/src/composables/useStatusManagement.js`:
  - Add `statusEvents = ref([])` and `statusEventsLoading = ref(false)`
  - Add `statusEventError = ref('')`
  - `openStatusChangePopup()`: load events via `api.getStatusEvents()`, set `statusChangeForm.startDate` to **today** (format YYYY-MM-DD) if empty; clear status selection
  - `statusChangeForm` stays: `{ status, startDate, endDate }` — `startDate` now required (validated: must not be empty)
  - `applyStatusChange()`: calls `api.addStatusEvent()` (not `updateEmployee`); on success reload employee via `selectEmployee()` and reload events list; handle 409 overlap error with user-friendly message
  - `deleteStatusEvent(eventId)`: calls `api.deleteStatusEvent()`, reloads events and employee
  - Remove `resetStatus()` (or keep as "delete active event") — keep for now: `resetStatus()` deletes the active event if one exists, otherwise calls `updateEmployee` with Працює status as before
  - Keep `openStatusHistoryPopup` / `closeStatusHistoryPopup` unchanged
  - Return new refs/functions: `statusEvents`, `statusEventsLoading`, `statusEventError`, `deleteStatusEvent`

### Task 5: Frontend — status change modal UI redesign

- [ ] Update status change popup in `client/src/views/EmployeeCardsView.vue`:
  - Add events list table above the form showing existing events: status, start_date (formatted DD.MM.YYYY), end_date (formatted or "без кінця"), delete button (🗑️)
  - Show "loading..." while `statusEventsLoading` is true
  - Show "Немає запланованих подій" if events list is empty
  - Mark currently active event with visual indicator (e.g., bold or green dot)
  - Form fields: Status select (required), Start date (required, `type="date"`), End date (optional, `type="date"`)
  - Start date field should have `required` attribute and `min` attribute not enforced (allow past/future dates)
  - Show `statusEventError` in red if overlap or validation error
  - "Зберегти подію" button (replaces "Застосувати") — disabled if `!statusChangeForm.status || !statusChangeForm.startDate`
  - Keep "Скасувати" button
  - Wire delete buttons to `deleteStatusEvent(event.event_id)`
- [ ] Verify the popup works end-to-end: add event, see it in list, delete event, status resets

### Task 6: E2E tests and final validation

- [ ] Create `tests/e2e/status-events.spec.js`:
  - Open status change modal: start date defaults to today
  - Add immediate event: employee status updates in card
  - Add future event: event appears in list, employee status unchanged
  - Add overlapping event: show error message
  - Delete event from list
  - Status reverts to "Працює" after deleting active event
- [ ] Run E2E tests: `npm run test:e2e -- --grep "status-events"` — must pass
- [ ] Run all unit tests: `cd server && npm test` — must pass
- [ ] Run all integration tests: `cd server && npm run test:integration` — must pass
- [ ] Run full E2E suite: `npm run test:e2e` — must pass

### Task 7: Final validation and documentation

- [ ] Verify all requirements:
  - [x] Start date required, defaults to today ← implemented in Task 4-5
  - [x] After save, active event auto-selects (updates employee status) ← Task 3
  - [x] No overlapping events ← Tasks 1, 3 validation + 409 response
  - [x] Future events auto-activate ← Task 2 sync
  - [x] Events auto-expire and reset to Працює ← Task 2 sync
  - [x] No end date = never expires ← Task 1 getActiveEventForEmployee logic
- [ ] Update `CLAUDE.md` — add `status_events.csv` to Data Files Overview and API docs

## Technical Details

### status_events.csv columns
| Column | Type | Notes |
|--------|------|-------|
| event_id | auto-int | primary key |
| employee_id | string | reference to employees.csv |
| status | string | employment status value |
| start_date | YYYY-MM-DD | required |
| end_date | YYYY-MM-DD | optional; empty = no end |
| created_at | ISO timestamp | set on create |
| active | yes/no | 'yes' always (no soft delete; hard delete used) |

### Overlap detection algorithm
```
Two events A and B overlap if:
  A.start_date <= (B.end_date or "9999-12-31")
  AND
  (A.end_date or "9999-12-31") >= B.start_date
```

### Sync logic (syncStatusEventsForEmployee)
```
1. hasEvents = events for employee in status_events
2. if hasEvents == 0: return (leave existing employee status alone)
3. activeEvent = getActiveEventForEmployee(today)
4. if activeEvent:
     if employee.employment_status != activeEvent.status:
       update employee fields + write history
5. else (no active event):
     if employee.employment_status != workingStatus:
       reset employee to workingStatus + write history
```

### New API endpoints
- `GET /api/employees/:id/status-events` → `{ events: [...] }`
- `POST /api/employees/:id/status-events` → `{ event, employee }` or 400/409
- `DELETE /api/employees/:id/status-events/:eventId` → 204

## Post-Completion

**Manual verification:**
- Test with multiple employees, each with several events across different date ranges
- Verify that employees without any status_events are unaffected by the sync
- Test edge case: event starting today with no end date (should activate immediately)
- Test edge case: event ending today (should still be active today, reset tomorrow)
- Verify existing status_history audit log still records changes made by the sync function
