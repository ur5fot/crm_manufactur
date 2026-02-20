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
  getStatusEventsForEmployee,
  addStatusEvent,
  deleteStatusEvent,
  removeStatusEventsForEmployee,
  getActiveEventForEmployee,
  validateNoOverlap,
  DATA_DIR
} from "../src/store.js";

import { STATUS_EVENT_COLUMNS } from "../src/schema.js";
import { writeCsv } from "../src/csv.js";

const STATUS_EVENTS_PATH = path.join(DATA_DIR, "status_events.csv");
const BACKUP_PATH = path.join(DATA_DIR, "status_events.csv.bak");

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
