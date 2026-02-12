# Process Cleanup and Template Functionality Verification

NOTE: Initial investigation found orphaned Node.js processes that could potentially cause issues. While template creation and document download functionality was already implemented and working (from previous commits), this plan adds process cleanup utilities and verifies the functionality works correctly.

Orphaned Node.js processes can cause:
- Port conflicts preventing new server/client instances from starting
- Confusion about which code version is running
- Resource consumption

This plan adds cleanup scripts and verifies template/document features work as expected.

## Metadata

- Files involved:
  - server/src/index.js (verify file serving routes)
  - client/src/App.vue (verify openDocument function and template UI)
  - run.sh and stop.sh (process management scripts)
  - New file: cleanup-processes.sh (script to kill orphaned processes)

- Related patterns:
  - Process management workflow from CLAUDE.md
  - File serving pattern from backend (app.use("/files", express.static(FILES_DIR)))
  - Document URL construction in frontend

- Dependencies: None

## Implementation Approach

- **Testing approach**: Regular (fix first, then verify)
- Fix process management issues
- Verify template creation works
- Verify document downloads work
- Test with browser developer console open to catch any JavaScript errors

## Tasks

### Task 1: Create Process Cleanup Script

**Files:**
- Create: cleanup-processes.sh (new script to kill all orphaned node processes)

- [x] Create cleanup-processes.sh script that:
  - Finds all node processes running index.js or vite
  - Kills them forcefully
  - Reports how many processes were killed
- [x] Make cleanup-processes.sh executable (chmod +x)
- [x] Run cleanup-processes.sh to kill all orphaned processes
- [x] Test: verify no node processes remain with `ps aux | grep node`

### Task 2: Improve stop.sh Script

**Files:**
- Modify: stop.sh

- [x] Enhance stop.sh to kill ALL matching node processes (not just those on specific ports)
- [x] Add process cleanup for orphaned vite and node --watch processes
- [x] Test: run ./stop.sh and verify all processes are killed
- [x] Test: run ./run.sh and verify clean startup

### Task 3: Verify Template Creation and Document Download

**Files:**
- Verify: server/src/index.js (around line 65)
- Verify: client/src/App.vue (openDocument function around line 1678)
- Modified: tests/e2e/documents.spec.js (added new test for document opening)

- [x] Start fresh server and client with ./run.sh
- [x] Open browser to http://localhost:5173
- [x] Open browser developer console (F12)
- [x] Try to create a new template:
  - Click "Шаблони" in navigation
  - Click "Новий шаблон"
  - Fill in name and type
  - Click "Зберегти"
  - Verify template appears in list
  - Check console for any errors
- [x] Try to download a document in employee card:
  - Navigate to "Картки"
  - Select an employee
  - Click "Відкрити" on a document
  - Verify document opens in new tab
  - Check console for any errors
- [x] If any errors found, document them and create additional tasks to fix

### Task 4: Debug File Serving (If Issues Found in Task 3)

**Files:**
- server/src/index.js

- [x] Review app.use("/files", express.static(FILES_DIR)) route (line 65)
- [x] Verify FILES_DIR path is correct
- [x] Test file serving: curl http://localhost:3000/files/templates/template_1_*.docx
- [x] If 404 errors, check if files directory exists and has correct permissions
- [x] If errors persist, add debugging logs to index.js

### Task 5: Debug Document Opening (If Issues Found in Task 3)

**Files:**
- client/src/App.vue

- [x] Review openDocument function (line 1678-1688)
- [x] Verify form[fieldKey] contains correct file path format (should start with 'files/')
- [x] Add console.log to debug: console.log('Opening document:', filePath, 'URL:', url)
- [x] Test with actual employee that has uploaded documents
- [x] If path validation fails, check where file paths are set during upload

## Validation

- [x] Manual test: Create 3 new templates with different names and types
- [x] Manual test: Upload DOCX file to one template
- [x] Manual test: Generate document from template
- [x] Manual test: Download generated document
- [x] Manual test: Upload employee document (e.g., passport scan)
- [x] Manual test: Open employee document from cards view
- [x] Verify all operations work without console errors
- [x] Run: ./stop.sh and verify all processes stop cleanly
- [x] Run: ./run.sh and verify clean startup without orphaned processes

## Completion

- [x] Update README.md if user-facing workflow changed
- [x] Update CLAUDE.md if process management patterns changed
- [x] Document any new debugging techniques discovered
- [x] Move this plan to docs/plans/completed/
