/**
 * Unit tests for status events store functions (Task 1)
 * Run with: node server/test/status-events-store.test.js
 */

import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  loadStatusEvents,
  loadEmployees,
  loadStatusHistory,
  withEmployeeLock,
  getStatusEventsForEmployee,
  addStatusEvent,
  deleteStatusEvent,
  removeStatusEventsForEmployee,
  getActiveEventForEmployee,
  validateNoOverlap,
  syncStatusEventsForEmployee,
  syncAllStatusEvents,
  DATA_DIR
} from "../src/store.js";

import { STATUS_EVENT_COLUMNS } from "../src/schema.js";
import { writeCsv } from "../src/csv.js";

const STATUS_EVENTS_PATH = path.join(DATA_DIR, "status_events.csv");
const BACKUP_PATH = path.join(DATA_DIR, "status_events.csv.bak");

// Paths for sync test backup/restore
const EMPLOYEES_PATH = path.join(DATA_DIR, "employees.csv");
const EMPLOYEES_BACKUP_PATH = path.join(DATA_DIR, "employees.csv.sync_bak");
const STATUS_HISTORY_PATH = path.join(DATA_DIR, "status_history.csv");
const STATUS_HISTORY_BACKUP_PATH = path.join(DATA_DIR, "status_history.csv.sync_bak");

// Local date string helper (mirrors store.js localDateStr)
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateStr(d);
}

function today() {
  return localDateStr(new Date());
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDateStr(d);
}

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`✓ ${name}`);
    testsPassed++;
    return true;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

async function backupEvents() {
  try {
    await fs.access(STATUS_EVENTS_PATH);
    await fs.copyFile(STATUS_EVENTS_PATH, BACKUP_PATH);
  } catch {
    // File doesn't exist yet, no backup needed
  }
}

async function restoreEvents() {
  try {
    await fs.access(BACKUP_PATH);
    await fs.copyFile(BACKUP_PATH, STATUS_EVENTS_PATH);
    await fs.unlink(BACKUP_PATH);
  } catch {
    // No backup to restore — delete test file if it was created
    try {
      await fs.unlink(STATUS_EVENTS_PATH);
    } catch {
      // OK
    }
  }
}

async function clearEvents() {
  await writeCsv(STATUS_EVENTS_PATH, STATUS_EVENT_COLUMNS, []);
}

async function runAllTests() {
  console.log("Starting status-events store tests...\n");

  await backupEvents();

  try {
    await clearEvents();

    // ======== loadStatusEvents ========
    await runTest("loadStatusEvents returns empty array when file is empty", async () => {
      const events = await loadStatusEvents();
      if (!Array.isArray(events)) throw new Error("Expected array");
      if (events.length !== 0) throw new Error(`Expected 0 events, got ${events.length}`);
    });

    // ======== addStatusEvent ========
    await runTest("addStatusEvent creates event with auto-increment event_id", async () => {
      const evt = await addStatusEvent({
        employee_id: "1",
        status: "На лікарняному",
        start_date: "2026-01-10",
        end_date: "2026-01-20"
      });

      if (!evt.event_id) throw new Error("event_id should be set");
      if (evt.event_id !== "1") throw new Error(`Expected event_id '1', got '${evt.event_id}'`);
      if (evt.employee_id !== "1") throw new Error("employee_id mismatch");
      if (evt.status !== "На лікарняному") throw new Error("status mismatch");
      if (evt.start_date !== "2026-01-10") throw new Error("start_date mismatch");
      if (evt.end_date !== "2026-01-20") throw new Error("end_date mismatch");
      if (!evt.created_at) throw new Error("created_at should be set");
      if (evt.active !== "yes") throw new Error("active should be 'yes'");
    });

    await runTest("addStatusEvent auto-increments event_id for second event", async () => {
      const evt = await addStatusEvent({
        employee_id: "1",
        status: "У відпустці",
        start_date: "2026-02-01",
        end_date: "2026-02-10"
      });
      if (evt.event_id !== "2") throw new Error(`Expected event_id '2', got '${evt.event_id}'`);
    });

    await runTest("addStatusEvent handles empty end_date (open-end event)", async () => {
      const evt = await addStatusEvent({
        employee_id: "2",
        status: "Звільнений",
        start_date: "2026-01-15",
        end_date: ""
      });
      if (evt.end_date !== "") throw new Error("end_date should be empty string");
      if (evt.event_id !== "3") throw new Error(`Expected event_id '3', got '${evt.event_id}'`);
    });

    // ======== getStatusEventsForEmployee ========
    await runTest("getStatusEventsForEmployee returns events sorted by start_date", async () => {
      const events = await getStatusEventsForEmployee("1");
      if (events.length !== 2) throw new Error(`Expected 2 events for emp 1, got ${events.length}`);
      if (events[0].start_date > events[1].start_date) throw new Error("Events should be sorted by start_date asc");
    });

    await runTest("getStatusEventsForEmployee returns empty array for unknown employee", async () => {
      const events = await getStatusEventsForEmployee("999");
      if (events.length !== 0) throw new Error(`Expected 0 events, got ${events.length}`);
    });

    // ======== getActiveEventForEmployee ========
    await runTest("getActiveEventForEmployee returns event when today is within range", async () => {
      // event_id 1: start 2026-01-10, end 2026-01-20
      const activeEvent = await getActiveEventForEmployee("1", "2026-01-15");
      if (!activeEvent) throw new Error("Expected active event, got null");
      if (activeEvent.event_id !== "1") throw new Error(`Expected event_id '1', got '${activeEvent.event_id}'`);
    });

    await runTest("getActiveEventForEmployee returns event when today equals start_date", async () => {
      const activeEvent = await getActiveEventForEmployee("1", "2026-01-10");
      if (!activeEvent) throw new Error("Expected active event on start_date");
      if (activeEvent.event_id !== "1") throw new Error("Wrong event returned");
    });

    await runTest("getActiveEventForEmployee returns event when today equals end_date", async () => {
      const activeEvent = await getActiveEventForEmployee("1", "2026-01-20");
      if (!activeEvent) throw new Error("Expected active event on end_date");
    });

    await runTest("getActiveEventForEmployee returns null when date is before start_date (future event)", async () => {
      // event 2 starts 2026-02-01
      const activeEvent = await getActiveEventForEmployee("1", "2026-01-25");
      if (activeEvent !== null) throw new Error("Expected null for date between two events");
    });

    await runTest("getActiveEventForEmployee returns null when date is after end_date (expired event)", async () => {
      const activeEvent = await getActiveEventForEmployee("1", "2026-01-21");
      if (activeEvent !== null) throw new Error("Expected null for date after end_date");
    });

    await runTest("getActiveEventForEmployee returns open-end event (no end_date) as always active", async () => {
      // event_id 3 for emp 2: start 2026-01-15, no end
      const activeEvent = await getActiveEventForEmployee("2", "2099-12-31");
      if (!activeEvent) throw new Error("Open-end event should be active even far in the future");
      if (activeEvent.event_id !== "3") throw new Error(`Expected event_id '3', got '${activeEvent.event_id}'`);
    });

    // ======== validateNoOverlap ========
    await runTest("validateNoOverlap returns true when no events exist for employee", async () => {
      const noOverlap = await validateNoOverlap("999", "2026-01-01", "2026-01-31");
      if (!noOverlap) throw new Error("Expected true (no overlap) for employee with no events");
    });

    await runTest("validateNoOverlap returns false when new event overlaps existing", async () => {
      // emp 1, event 1: 2026-01-10 to 2026-01-20 — new event 2026-01-15 to 2026-01-25 overlaps
      const noOverlap = await validateNoOverlap("1", "2026-01-15", "2026-01-25");
      if (noOverlap) throw new Error("Expected false (overlap detected)");
    });

    await runTest("validateNoOverlap returns false when new event fully contains existing", async () => {
      // emp 1, event 1: 2026-01-10 to 2026-01-20 — new event 2026-01-01 to 2026-01-31 contains it
      const noOverlap = await validateNoOverlap("1", "2026-01-01", "2026-01-31");
      if (noOverlap) throw new Error("Expected false (new event contains existing)");
    });

    await runTest("validateNoOverlap returns true when new event is adjacent (end+1 = start)", async () => {
      // emp 1, event 1: ends 2026-01-20 — new event starting 2026-01-21 should be OK
      // But event 2 starts 2026-02-01, so test between them: 2026-01-21 to 2026-01-31
      const noOverlap = await validateNoOverlap("1", "2026-01-21", "2026-01-31");
      if (!noOverlap) throw new Error("Adjacent dates (gap of 1 day) should not overlap");
    });

    await runTest("validateNoOverlap returns false when new event overlaps open-end event", async () => {
      // emp 2 has open-end event starting 2026-01-15
      const noOverlap = await validateNoOverlap("2", "2026-06-01", "2026-06-30");
      if (noOverlap) throw new Error("Expected false (new event overlaps open-end event)");
    });

    await runTest("validateNoOverlap returns false for open-end new event overlapping existing", async () => {
      // emp 1, event 1: 2026-01-10 to 2026-01-20 — new open-end event starting 2026-01-15
      const noOverlap = await validateNoOverlap("1", "2026-01-15", "");
      if (noOverlap) throw new Error("Expected false (open-end new event overlaps existing)");
    });

    await runTest("validateNoOverlap respects excludeEventId to allow update of same event", async () => {
      // emp 1, event 1: 2026-01-10 to 2026-01-20 — updating same event should not self-conflict
      const noOverlap = await validateNoOverlap("1", "2026-01-10", "2026-01-20", "1");
      if (!noOverlap) throw new Error("Excluding the same event should allow same dates");
    });

    // ======== deleteStatusEvent ========
    await runTest("deleteStatusEvent removes event by ID", async () => {
      const deleted = await deleteStatusEvent("2");
      if (!deleted) throw new Error("Expected true on successful delete");

      const events = await getStatusEventsForEmployee("1");
      const found = events.find(e => e.event_id === "2");
      if (found) throw new Error("Event with id '2' should have been deleted");
      if (events.length !== 1) throw new Error(`Expected 1 event for emp 1 after delete, got ${events.length}`);
    });

    await runTest("deleteStatusEvent returns false for non-existent ID", async () => {
      const deleted = await deleteStatusEvent("9999");
      if (deleted !== false) throw new Error("Expected false for missing event");
    });

    // ======== removeStatusEventsForEmployee ========
    await runTest("removeStatusEventsForEmployee removes all events for employee", async () => {
      await removeStatusEventsForEmployee("1");
      const events = await getStatusEventsForEmployee("1");
      if (events.length !== 0) throw new Error(`Expected 0 events for emp 1, got ${events.length}`);
    });

    await runTest("removeStatusEventsForEmployee leaves other employees' events", async () => {
      const events = await getStatusEventsForEmployee("2");
      if (events.length !== 1) throw new Error(`Expected 1 event for emp 2, got ${events.length}`);
    });

    // ======== syncStatusEventsForEmployee ========
    // These tests need employees.csv and status_history.csv; back them up first.
    let syncEmpId = null;
    let syncOrigStatus = null;
    let syncOrigStartDate = null;
    let syncOrigEndDate = null;

    // Find first active employee for sync tests
    const allEmps = await loadEmployees();
    const syncEmp = allEmps.find(e => e.active !== 'no');

    if (!syncEmp) {
      console.log("⚠️  No active employees found — skipping sync tests");
    } else {
      syncEmpId = syncEmp.employee_id;
      syncOrigStatus = syncEmp.employment_status || '';
      syncOrigStartDate = syncEmp.status_start_date || '';
      syncOrigEndDate = syncEmp.status_end_date || '';

      // Backup employees.csv and status_history.csv before sync tests
      try { await fs.copyFile(EMPLOYEES_PATH, EMPLOYEES_BACKUP_PATH); } catch { /* may not exist */ }
      try { await fs.copyFile(STATUS_HISTORY_PATH, STATUS_HISTORY_BACKUP_PATH); } catch { /* may not exist */ }

      try {
        // Sync test helper: reset employee to a given status directly
        async function setEmployeeStatus(empId, status, startDate, endDate) {
          await withEmployeeLock(async (employees) => {
            const idx = employees.findIndex(e => e.employee_id === String(empId));
            if (idx === -1) return employees;
            employees[idx].employment_status = status;
            employees[idx].status_start_date = startDate || '';
            employees[idx].status_end_date = endDate || '';
            return employees;
          });
        }

        // Test: no-op when no events exist for employee
        await runTest("syncStatusEventsForEmployee: no-op when employee has no events", async () => {
          await clearEvents();

          // Set employee to a non-working status
          await setEmployeeStatus(syncEmpId, 'На лікарняному', '2026-01-01', '');

          // Sync — should do nothing since no events
          await syncStatusEventsForEmployee(syncEmpId);

          const updated = await loadEmployees();
          const emp = updated.find(e => e.employee_id === syncEmpId);
          if (!emp) throw new Error("Employee not found after sync");
          if (emp.employment_status !== 'На лікарняному') {
            throw new Error(`Expected 'На лікарняному' (no-op), got '${emp.employment_status}'`);
          }
        });

        // Test: auto-activate event starting today
        await runTest("syncStatusEventsForEmployee: auto-activates event starting today", async () => {
          await clearEvents();
          await setEmployeeStatus(syncEmpId, 'Працює', '', '');

          // Add event starting today with no end date
          await addStatusEvent({
            employee_id: syncEmpId,
            status: 'На лікарняному',
            start_date: today(),
            end_date: ''
          });

          await syncStatusEventsForEmployee(syncEmpId);

          const updated = await loadEmployees();
          const emp = updated.find(e => e.employee_id === syncEmpId);
          if (!emp) throw new Error("Employee not found after sync");
          if (emp.employment_status !== 'На лікарняному') {
            throw new Error(`Expected 'На лікарняному' after activation, got '${emp.employment_status}'`);
          }
          if (emp.status_start_date !== today()) {
            throw new Error(`Expected status_start_date ${today()}, got '${emp.status_start_date}'`);
          }
        });

        // Test: auto-activate writes status history entry
        await runTest("syncStatusEventsForEmployee: writes status history on activation", async () => {
          const histBefore = await loadStatusHistory();
          const countBefore = histBefore.length;

          await clearEvents();
          await setEmployeeStatus(syncEmpId, 'Працює', '', '');

          await addStatusEvent({
            employee_id: syncEmpId,
            status: 'У відпустці',
            start_date: today(),
            end_date: tomorrow()
          });

          await syncStatusEventsForEmployee(syncEmpId);

          const histAfter = await loadStatusHistory();
          if (histAfter.length <= countBefore) {
            throw new Error("Expected new history entry after sync activation");
          }

          const latest = histAfter[histAfter.length - 1];
          if (latest.changed_by !== 'system') {
            throw new Error(`Expected changed_by 'system', got '${latest.changed_by}'`);
          }
          if (latest.new_status !== 'У відпустці') {
            throw new Error(`Expected new_status 'У відпустці', got '${latest.new_status}'`);
          }
          if (latest.employee_id !== String(syncEmpId)) {
            throw new Error(`Expected employee_id ${syncEmpId}, got ${latest.employee_id}`);
          }
        });

        // Test: auto-expire and reset to Працює
        await runTest("syncStatusEventsForEmployee: auto-expires event and resets to working status", async () => {
          await clearEvents();

          // Set employee to non-working status
          await setEmployeeStatus(syncEmpId, 'На лікарняному', yesterday(), yesterday());

          // Add event that ended yesterday (expired)
          await addStatusEvent({
            employee_id: syncEmpId,
            status: 'На лікарняному',
            start_date: yesterday(),
            end_date: yesterday()
          });

          await syncStatusEventsForEmployee(syncEmpId);

          const updated = await loadEmployees();
          const emp = updated.find(e => e.employee_id === syncEmpId);
          if (!emp) throw new Error("Employee not found after sync");
          // After expiry, status should reset to working status (Працює)
          const schema = await (async () => {
            const { loadFieldsSchema } = await import('../src/store.js');
            return loadFieldsSchema();
          })();
          const statusField = schema.find(f => f.field_name === 'employment_status');
          const workingStatus = statusField?.field_options?.split('|')[0] || 'Працює';

          if (emp.employment_status !== workingStatus) {
            throw new Error(`Expected working status '${workingStatus}' after expiry, got '${emp.employment_status}'`);
          }
          if (emp.status_start_date !== '') {
            throw new Error(`Expected empty status_start_date after reset, got '${emp.status_start_date}'`);
          }
        });

        // Test: no-op when already working and no active event
        await runTest("syncStatusEventsForEmployee: no-op when already working and no active event", async () => {
          await clearEvents();
          await setEmployeeStatus(syncEmpId, 'Працює', '', '');

          // Add expired event
          await addStatusEvent({
            employee_id: syncEmpId,
            status: 'На лікарняному',
            start_date: yesterday(),
            end_date: yesterday()
          });

          const histBefore = await loadStatusHistory();
          const countBefore = histBefore.length;

          await syncStatusEventsForEmployee(syncEmpId);

          // Employee is already Працює, so no change expected
          const updated = await loadEmployees();
          const emp = updated.find(e => e.employee_id === syncEmpId);
          if (emp.employment_status !== 'Працює') {
            throw new Error(`Expected 'Працює' (no-op), got '${emp.employment_status}'`);
          }

          const histAfter = await loadStatusHistory();
          if (histAfter.length !== countBefore) {
            throw new Error("Expected no new history entry when status unchanged");
          }
        });

        // Test: future event does not activate yet
        await runTest("syncStatusEventsForEmployee: future event does not activate before start_date", async () => {
          await clearEvents();
          await setEmployeeStatus(syncEmpId, 'Працює', '', '');

          // Add event starting tomorrow
          await addStatusEvent({
            employee_id: syncEmpId,
            status: 'На лікарняному',
            start_date: tomorrow(),
            end_date: ''
          });

          await syncStatusEventsForEmployee(syncEmpId);

          const updated = await loadEmployees();
          const emp = updated.find(e => e.employee_id === syncEmpId);
          if (emp.employment_status !== 'Працює') {
            throw new Error(`Expected 'Працює' (future event not yet active), got '${emp.employment_status}'`);
          }
        });

      } finally {
        // Restore employees.csv and status_history.csv after sync tests
        try {
          await fs.copyFile(EMPLOYEES_BACKUP_PATH, EMPLOYEES_PATH);
          await fs.unlink(EMPLOYEES_BACKUP_PATH);
        } catch { /* OK */ }
        try {
          await fs.copyFile(STATUS_HISTORY_BACKUP_PATH, STATUS_HISTORY_PATH);
          await fs.unlink(STATUS_HISTORY_BACKUP_PATH);
        } catch { /* OK */ }
      }
    }

    console.log(`\nTests passed: ${testsPassed}`);
    console.log(`Tests failed: ${testsFailed}`);

    if (testsFailed === 0) {
      console.log("\n✅ All status-events store tests passed!");
    } else {
      console.log("\n❌ Some tests failed!");
    }

    return testsFailed === 0;
  } finally {
    await restoreEvents();
  }
}

runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
