# Employee Remote Archive on Delete

## Overview
- When an employee is deleted, instead of hard-deleting all data, move it to archive files
- Employee record → `data/employees_remote.csv`, related data → `data/*_remote.csv`, files → `remote/employee_{id}/`
- Preserves complete employee data for archival/compliance purposes
- No UI changes — delete button works the same way, just archives instead of destroying

## Context (from discovery)
- Files/components involved:
  - `server/src/store.js` — path constants, `ensureDataDirs()`, `removeStatusHistoryForEmployee`, `removeReprimandsForEmployee`, `removeStatusEventsForEmployee`
  - `server/src/routes/employees.js:687-739` — DELETE endpoint with `withEmployeeLock`, cascading cleanup, file deletion
  - `server/src/csv.js` — `readCsv`, `writeCsv`, `ensureCsvFile` utilities
  - `server/src/schema.js` — column definitions: `STATUS_HISTORY_COLUMNS`, `REPRIMAND_COLUMNS`, `STATUS_EVENT_COLUMNS`
  - `.gitignore` — needs entries for new remote CSV files and `remote/` directory
  - `.github/workflows/tests.yml` — CI pipeline needs `mkdir -p remote` and new test files
  - `server/package.json` — test scripts need new test file references
- Related patterns found:
  - Write locks per CSV file (in-memory promise-based): `employeeWriteLock`, `statusHistoryWriteLock`, `reprimandWriteLock`, `statusEventWriteLock`
  - `withEmployeeLock(fn)` pattern for atomic read-modify-write
  - `ensureCsvFile(path, columns)` auto-creates CSV with headers on first access
  - `remove*ForEmployee` functions: load all → filter out employee → write back
  - Archive pattern will be: load all → split (keep vs archive) → append archive → write kept
- Dependencies identified:
  - `csv-parse` and `csv-stringify` (already installed)
  - `fs/promises` for `rename()` (move directory)

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Make small, focused changes
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
  - tests are not optional - they are a required part of the checklist
  - write unit tests for new functions/methods
  - write unit tests for modified functions/methods
  - add new test cases for new code paths
  - update existing test cases if behavior changes
  - tests cover both success and error scenarios
- **CRITICAL: all tests must pass before starting next task** - no exceptions
- **CRITICAL: update this plan file when scope changes during implementation**
- Run tests after each change
- Maintain backward compatibility

## Testing Strategy
- **Unit tests**: `server/test/remote-archive-store.test.js` — test archive store functions with temp CSV files
- **Integration tests**: `server/test/remote-archive-api.test.js` — test DELETE endpoint archives data (requires running server on port 3000)
- **E2E tests**: existing `tests/e2e/employee-crud.spec.js` should still pass (delete flow unchanged from UI perspective)
- Run unit tests: `cd server && npm test`
- Run integration tests: `cd server && npm run test:integration`
- Run E2E tests: `npx playwright test tests/e2e/employee-crud.spec.js`

## Progress Tracking
- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope
- Keep plan in sync with actual work done

## What Goes Where
- **Implementation Steps** (`[ ]` checkboxes): tasks achievable within this codebase - code changes, tests, documentation updates
- **Post-Completion** (no checkboxes): items requiring external action - manual testing

## Implementation Steps

### Task 1: Add remote paths, REMOTE_DIR, and gitignore entries

- [x] Add `REMOTE_DIR` export and `*_REMOTE_PATH` constants to `server/src/store.js` after line 24 (after `STATUS_EVENTS_PATH`):
  ```javascript
  export const REMOTE_DIR = path.join(ROOT_DIR, "remote");
  const EMPLOYEES_REMOTE_PATH = path.join(DATA_DIR, "employees_remote.csv");
  const STATUS_HISTORY_REMOTE_PATH = path.join(DATA_DIR, "status_history_remote.csv");
  const REPRIMANDS_REMOTE_PATH = path.join(DATA_DIR, "reprimands_remote.csv");
  const STATUS_EVENTS_REMOTE_PATH = path.join(DATA_DIR, "status_events_remote.csv");
  ```
- [x] Add `await fs.mkdir(REMOTE_DIR, { recursive: true });` to `ensureDataDirs()` after the `FILES_DIR` mkdir
- [x] Add gitignore entries after `data/status_events.csv` line:
  ```
  data/employees_remote.csv
  data/status_history_remote.csv
  data/reprimands_remote.csv
  data/status_events_remote.csv
  remote/
  ```
- [x] Add `mkdir -p remote` to `.github/workflows/tests.yml` in "Setup test data files" step after `mkdir -p data files`
- [x] Run `cd server && npm test` — all existing tests must pass

### Task 2: Add archive store functions

- [x] Add `archiveEmployee(employee)` function to `server/src/store.js` (after `removeStatusEventsForEmployee`, ~line 1590). Uses `employeeWriteLock`, reads `EMPLOYEES_REMOTE_PATH` with dynamic columns, appends employee, writes back
- [x] Add `archiveStatusHistoryForEmployee(employeeId)` — uses `statusHistoryWriteLock`, loads status_history, splits by employeeId, appends matching to `STATUS_HISTORY_REMOTE_PATH`, removes from `STATUS_HISTORY_PATH`
- [x] Add `archiveReprimandsForEmployee(employeeId)` — uses `reprimandWriteLock`, same split+append+remove pattern with `REPRIMANDS_REMOTE_PATH` and `REPRIMANDS_PATH`
- [x] Add `archiveStatusEventsForEmployee(employeeId)` — uses `statusEventWriteLock`, same split+append+remove pattern with `STATUS_EVENTS_REMOTE_PATH` and `STATUS_EVENTS_PATH`
- [x] Create `server/test/remote-archive-store.test.js` — unit test for archive functions using temp CSV files:
  - test archiveEmployee appends to new remote file
  - test archiveEmployee appends to existing remote file (accumulates)
  - test archiveStatusHistoryForEmployee moves entries and removes from source
  - test archiveReprimandsForEmployee moves entries and removes from source
  - test archiveStatusEventsForEmployee moves entries and removes from source
  - test archive functions are no-op when no matching records exist
- [x] Add `node test/remote-archive-store.test.js` to `server/package.json` `test` script
- [x] Add `node test/remote-archive-store.test.js` to `.github/workflows/tests.yml` unit tests step
- [x] Run `cd server && npm test` — all tests must pass

### Task 3: Update DELETE endpoint to archive instead of hard-delete

- [x] Add imports to `server/src/routes/employees.js`: `REMOTE_DIR`, `archiveEmployee`, `archiveStatusHistoryForEmployee`, `archiveReprimandsForEmployee`, `archiveStatusEventsForEmployee` from `../store.js`
- [x] Replace file deletion logic in DELETE endpoint (lines ~709-713) with move logic: `fsPromises.rename(employeeDir, remoteEmployeeDir)` with `REMOTE_DIR` target, creating remote dir first with `mkdir -p`, handling ENOENT gracefully
- [x] Replace `removeStatusHistoryForEmployee` call with `archiveStatusHistoryForEmployee`
- [x] Replace `removeReprimandsForEmployee` call with `archiveReprimandsForEmployee`
- [x] Replace `removeStatusEventsForEmployee` call with `archiveStatusEventsForEmployee`
- [x] Add `await archiveEmployee(deletedEmployee)` after `withEmployeeLock` and before log entry. Update log message to "Співробітник видалено (перенесено в архів)"
- [x] Create `server/test/remote-archive-api.test.js` — integration test (requires running server):
  - test DELETE archives employee record to employees_remote.csv
  - test DELETE archives related data (status_events, reprimands) to *_remote.csv
  - test DELETE moves employee files directory to remote/employee_{id}/
  - test DELETE returns 204 (unchanged behavior)
  - test deleted employee no longer appears in GET /api/employees
  - test 404 for non-existent employee (unchanged behavior)
- [x] Add `node test/remote-archive-api.test.js` to `server/package.json` `test:integration` script
- [x] Add `node test/remote-archive-api.test.js` to `.github/workflows/tests.yml` integration tests step
- [x] Run `cd server && npm test` — unit tests pass
- [x] Run `cd server && npm run test:integration` — integration tests pass (requires running server)

### Task 4: Verify acceptance criteria

- [x] Verify employee record moves to `data/employees_remote.csv` on delete
- [x] Verify status_history entries move to `data/status_history_remote.csv`
- [x] Verify reprimand records move to `data/reprimands_remote.csv`
- [x] Verify status_events move to `data/status_events_remote.csv`
- [x] Verify employee files directory moves to `remote/employee_{id}/`
- [x] Verify original data is removed from source files after archive
- [x] Run full unit test suite: `cd server && npm test`
- [x] Run full integration test suite: `cd server && npm run test:integration`
- [x] Run E2E tests: `npx playwright test tests/e2e/employee-crud.spec.js`
- [x] All tests pass

### Task 5: [Final] Update documentation

- [x] Update CLAUDE.md: add `employees_remote.csv`, `status_history_remote.csv`, `reprimands_remote.csv`, `status_events_remote.csv` descriptions to Data Files Overview section
- [x] Update CLAUDE.md: add `remote/` directory description to File Organization section
- [x] Update CLAUDE.md: update "DELETE employee" description in API Structure to mention archive instead of hard delete
- [x] Update CLAUDE.md: add `REMOTE_DIR` to store.js exports section and archive functions to store functions
- [x] Update CLAUDE.md: update Concurrency Control section to mention archive functions use existing locks

## Technical Details

**Archive data flow on DELETE /api/employees/:id:**
1. `withEmployeeLock`: read employees → find target → filter out → write back (unchanged)
2. `archiveEmployee(deletedEmployee)`: read employees_remote.csv → append → write
3. `fsPromises.rename(files/employee_{id}, remote/employee_{id})`: atomic move
4. `archiveStatusHistoryForEmployee(id)`: read → split → append to remote → write kept to source
5. `archiveReprimandsForEmployee(id)`: same pattern
6. `archiveStatusEventsForEmployee(id)`: same pattern
7. `addLog(...)`: unchanged, logs with "перенесено в архів" message

**Remote CSV files** use identical columns to their source files:
| Source | Remote | Columns constant |
|--------|--------|-----------------|
| `employees.csv` | `employees_remote.csv` | dynamic from `getEmployeeColumns()` |
| `status_history.csv` | `status_history_remote.csv` | `STATUS_HISTORY_COLUMNS` |
| `reprimands.csv` | `reprimands_remote.csv` | `REPRIMAND_COLUMNS` |
| `status_events.csv` | `status_events_remote.csv` | `STATUS_EVENT_COLUMNS` |

**File move**: uses `fs.rename()` which is atomic on same filesystem. Falls back gracefully if source directory doesn't exist (ENOENT).

**Lock reuse**: archive functions reuse existing write locks — `archiveEmployee` shares `employeeWriteLock`, etc. This means an archive operation serializes with regular writes to the same file, preventing corruption.

## Post-Completion

**Manual verification:**
- Start app, create employee with photo + documents + status event + reprimand
- Delete employee via UI
- Check `data/employees_remote.csv` contains the record
- Check `data/status_events_remote.csv`, `data/reprimands_remote.csv` contain related data
- Check `remote/employee_{id}/` contains the files
- Check original locations are clean
