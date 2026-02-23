/**
 * Unit tests for remote archive store functions
 * Run with: node server/test/remote-archive-store.test.js
 */

import path from "path";
import fs from "fs/promises";

import {
  archiveEmployee,
  archiveStatusHistoryForEmployee,
  archiveReprimandsForEmployee,
  archiveStatusEventsForEmployee,
  DATA_DIR
} from "../src/store.js";

import { STATUS_HISTORY_COLUMNS, REPRIMAND_COLUMNS, STATUS_EVENT_COLUMNS } from "../src/schema.js";
import { readCsv, writeCsv } from "../src/csv.js";
import { loadEmployeeColumns, getCachedEmployeeColumns } from "../src/schema.js";

// Paths for source and remote CSV files
const STATUS_HISTORY_PATH = path.join(DATA_DIR, "status_history.csv");
const STATUS_HISTORY_REMOTE_PATH = path.join(DATA_DIR, "status_history_remote.csv");
const REPRIMANDS_PATH = path.join(DATA_DIR, "reprimands.csv");
const REPRIMANDS_REMOTE_PATH = path.join(DATA_DIR, "reprimands_remote.csv");
const STATUS_EVENTS_PATH = path.join(DATA_DIR, "status_events.csv");
const STATUS_EVENTS_REMOTE_PATH = path.join(DATA_DIR, "status_events_remote.csv");
const EMPLOYEES_REMOTE_PATH = path.join(DATA_DIR, "employees_remote.csv");

// Backup paths
const BACKUPS = {
  STATUS_HISTORY: STATUS_HISTORY_PATH + ".bak",
  STATUS_HISTORY_REMOTE: STATUS_HISTORY_REMOTE_PATH + ".bak",
  REPRIMANDS: REPRIMANDS_PATH + ".bak",
  REPRIMANDS_REMOTE: REPRIMANDS_REMOTE_PATH + ".bak",
  STATUS_EVENTS: STATUS_EVENTS_PATH + ".bak",
  STATUS_EVENTS_REMOTE: STATUS_EVENTS_REMOTE_PATH + ".bak",
  EMPLOYEES_REMOTE: EMPLOYEES_REMOTE_PATH + ".bak"
};

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

async function backupFile(src, bak) {
  try {
    await fs.access(src);
    await fs.copyFile(src, bak);
  } catch {
    // File doesn't exist, nothing to backup
  }
}

async function restoreFile(src, bak) {
  try {
    await fs.access(bak);
    await fs.copyFile(bak, src);
    await fs.unlink(bak);
  } catch {
    // No backup — delete file if it was created during tests
    try {
      await fs.unlink(src);
    } catch {
      // OK
    }
  }
}

async function backupAll() {
  await backupFile(STATUS_HISTORY_PATH, BACKUPS.STATUS_HISTORY);
  await backupFile(STATUS_HISTORY_REMOTE_PATH, BACKUPS.STATUS_HISTORY_REMOTE);
  await backupFile(REPRIMANDS_PATH, BACKUPS.REPRIMANDS);
  await backupFile(REPRIMANDS_REMOTE_PATH, BACKUPS.REPRIMANDS_REMOTE);
  await backupFile(STATUS_EVENTS_PATH, BACKUPS.STATUS_EVENTS);
  await backupFile(STATUS_EVENTS_REMOTE_PATH, BACKUPS.STATUS_EVENTS_REMOTE);
  await backupFile(EMPLOYEES_REMOTE_PATH, BACKUPS.EMPLOYEES_REMOTE);
}

async function restoreAll() {
  await restoreFile(STATUS_HISTORY_PATH, BACKUPS.STATUS_HISTORY);
  await restoreFile(STATUS_HISTORY_REMOTE_PATH, BACKUPS.STATUS_HISTORY_REMOTE);
  await restoreFile(REPRIMANDS_PATH, BACKUPS.REPRIMANDS);
  await restoreFile(REPRIMANDS_REMOTE_PATH, BACKUPS.REPRIMANDS_REMOTE);
  await restoreFile(STATUS_EVENTS_PATH, BACKUPS.STATUS_EVENTS);
  await restoreFile(STATUS_EVENTS_REMOTE_PATH, BACKUPS.STATUS_EVENTS_REMOTE);
  await restoreFile(EMPLOYEES_REMOTE_PATH, BACKUPS.EMPLOYEES_REMOTE);
}

async function getEmployeeColumns() {
  const cached = getCachedEmployeeColumns();
  if (cached && cached.length > 0) return cached;
  // Load from schema if not cached
  const { loadFieldsSchema } = await import("../src/store.js");
  return loadEmployeeColumns(loadFieldsSchema);
}

async function runAllTests() {
  console.log("Starting remote archive store tests...\n");

  await backupAll();

  try {
    const empColumns = await getEmployeeColumns();

    // --- archiveEmployee tests ---

    // Clear remote employees file for clean state
    await writeCsv(EMPLOYEES_REMOTE_PATH, empColumns, []);

    await runTest("archiveEmployee appends to new/empty remote file", async () => {
      const employee = { employee_id: "100", last_name: "Тестов", first_name: "Іван", active: "no" };
      await archiveEmployee(employee);

      const remoteEmployees = await readCsv(EMPLOYEES_REMOTE_PATH, empColumns);
      if (remoteEmployees.length !== 1) throw new Error(`Expected 1 archived employee, got ${remoteEmployees.length}`);
      if (remoteEmployees[0].employee_id !== "100") throw new Error("employee_id mismatch");
      if (remoteEmployees[0].last_name !== "Тестов") throw new Error("last_name mismatch");
    });

    await runTest("archiveEmployee appends to existing remote file (accumulates)", async () => {
      const employee2 = { employee_id: "200", last_name: "Другий", first_name: "Петро", active: "no" };
      await archiveEmployee(employee2);

      const remoteEmployees = await readCsv(EMPLOYEES_REMOTE_PATH, empColumns);
      if (remoteEmployees.length !== 2) throw new Error(`Expected 2 archived employees, got ${remoteEmployees.length}`);
      if (remoteEmployees[0].employee_id !== "100") throw new Error("First employee should be id 100");
      if (remoteEmployees[1].employee_id !== "200") throw new Error("Second employee should be id 200");
    });

    // --- archiveStatusHistoryForEmployee tests ---

    // Seed source status_history with entries for two employees
    await writeCsv(STATUS_HISTORY_PATH, STATUS_HISTORY_COLUMNS, [
      { history_id: "1", employee_id: "100", old_status: "Працює", new_status: "Відпустка", old_start_date: "", old_end_date: "", new_start_date: "2026-01-01", new_end_date: "2026-01-15", changed_at: "2026-01-01T00:00:00Z", changed_by: "user" },
      { history_id: "2", employee_id: "100", old_status: "Відпустка", new_status: "Працює", old_start_date: "2026-01-01", old_end_date: "2026-01-15", new_start_date: "", new_end_date: "", changed_at: "2026-01-16T00:00:00Z", changed_by: "system" },
      { history_id: "3", employee_id: "200", old_status: "Працює", new_status: "Лікарняний", old_start_date: "", old_end_date: "", new_start_date: "2026-02-01", new_end_date: "2026-02-10", changed_at: "2026-02-01T00:00:00Z", changed_by: "user" }
    ]);
    // Clear remote status_history
    await writeCsv(STATUS_HISTORY_REMOTE_PATH, STATUS_HISTORY_COLUMNS, []);

    await runTest("archiveStatusHistoryForEmployee moves entries to remote and removes from source", async () => {
      await archiveStatusHistoryForEmployee("100");

      const source = await readCsv(STATUS_HISTORY_PATH, STATUS_HISTORY_COLUMNS);
      const remote = await readCsv(STATUS_HISTORY_REMOTE_PATH, STATUS_HISTORY_COLUMNS);

      if (source.length !== 1) throw new Error(`Expected 1 remaining in source, got ${source.length}`);
      if (source[0].employee_id !== "200") throw new Error("Remaining source entry should be employee 200");

      if (remote.length !== 2) throw new Error(`Expected 2 archived, got ${remote.length}`);
      if (remote[0].employee_id !== "100") throw new Error("Archived entry should be employee 100");
      if (remote[1].employee_id !== "100") throw new Error("Archived entry should be employee 100");
    });

    await runTest("archiveStatusHistoryForEmployee is no-op when no matching records", async () => {
      // Archive for employee 999 that has no records
      await archiveStatusHistoryForEmployee("999");

      const source = await readCsv(STATUS_HISTORY_PATH, STATUS_HISTORY_COLUMNS);
      const remote = await readCsv(STATUS_HISTORY_REMOTE_PATH, STATUS_HISTORY_COLUMNS);

      if (source.length !== 1) throw new Error(`Source should still have 1 entry, got ${source.length}`);
      if (remote.length !== 2) throw new Error(`Remote should still have 2 entries, got ${remote.length}`);
    });

    // --- archiveReprimandsForEmployee tests ---

    // Seed source reprimands with entries for two employees
    await writeCsv(REPRIMANDS_PATH, REPRIMAND_COLUMNS, [
      { record_id: "1", employee_id: "100", record_date: "2026-01-10", record_type: "Догана", order_number: "1", note: "test", created_at: "2026-01-10T00:00:00Z" },
      { record_id: "2", employee_id: "200", record_date: "2026-02-05", record_type: "Подяка", order_number: "2", note: "good", created_at: "2026-02-05T00:00:00Z" }
    ]);
    // Clear remote reprimands
    await writeCsv(REPRIMANDS_REMOTE_PATH, REPRIMAND_COLUMNS, []);

    await runTest("archiveReprimandsForEmployee moves entries to remote and removes from source", async () => {
      await archiveReprimandsForEmployee("100");

      const source = await readCsv(REPRIMANDS_PATH, REPRIMAND_COLUMNS);
      const remote = await readCsv(REPRIMANDS_REMOTE_PATH, REPRIMAND_COLUMNS);

      if (source.length !== 1) throw new Error(`Expected 1 remaining in source, got ${source.length}`);
      if (source[0].employee_id !== "200") throw new Error("Remaining source entry should be employee 200");

      if (remote.length !== 1) throw new Error(`Expected 1 archived, got ${remote.length}`);
      if (remote[0].employee_id !== "100") throw new Error("Archived entry should be employee 100");
      if (remote[0].record_type !== "Догана") throw new Error("Archived record_type mismatch");
    });

    await runTest("archiveReprimandsForEmployee is no-op when no matching records", async () => {
      await archiveReprimandsForEmployee("999");

      const source = await readCsv(REPRIMANDS_PATH, REPRIMAND_COLUMNS);
      const remote = await readCsv(REPRIMANDS_REMOTE_PATH, REPRIMAND_COLUMNS);

      if (source.length !== 1) throw new Error(`Source should still have 1 entry, got ${source.length}`);
      if (remote.length !== 1) throw new Error(`Remote should still have 1 entry, got ${remote.length}`);
    });

    // --- archiveStatusEventsForEmployee tests ---

    // Seed source status_events with entries for two employees
    await writeCsv(STATUS_EVENTS_PATH, STATUS_EVENT_COLUMNS, [
      { event_id: "1", employee_id: "100", status: "Відпустка", start_date: "2026-03-01", end_date: "2026-03-15", created_at: "2026-02-20T00:00:00Z", active: "yes" },
      { event_id: "2", employee_id: "100", status: "Лікарняний", start_date: "2026-04-01", end_date: "2026-04-05", created_at: "2026-02-20T00:00:00Z", active: "yes" },
      { event_id: "3", employee_id: "200", status: "Відпустка", start_date: "2026-05-01", end_date: "2026-05-10", created_at: "2026-02-20T00:00:00Z", active: "yes" }
    ]);
    // Clear remote status_events
    await writeCsv(STATUS_EVENTS_REMOTE_PATH, STATUS_EVENT_COLUMNS, []);

    await runTest("archiveStatusEventsForEmployee moves entries to remote and removes from source", async () => {
      await archiveStatusEventsForEmployee("100");

      const source = await readCsv(STATUS_EVENTS_PATH, STATUS_EVENT_COLUMNS);
      const remote = await readCsv(STATUS_EVENTS_REMOTE_PATH, STATUS_EVENT_COLUMNS);

      if (source.length !== 1) throw new Error(`Expected 1 remaining in source, got ${source.length}`);
      if (source[0].employee_id !== "200") throw new Error("Remaining source entry should be employee 200");

      if (remote.length !== 2) throw new Error(`Expected 2 archived, got ${remote.length}`);
      if (remote[0].employee_id !== "100") throw new Error("First archived entry should be employee 100");
      if (remote[1].employee_id !== "100") throw new Error("Second archived entry should be employee 100");
    });

    await runTest("archiveStatusEventsForEmployee is no-op when no matching records", async () => {
      await archiveStatusEventsForEmployee("999");

      const source = await readCsv(STATUS_EVENTS_PATH, STATUS_EVENT_COLUMNS);
      const remote = await readCsv(STATUS_EVENTS_REMOTE_PATH, STATUS_EVENT_COLUMNS);

      if (source.length !== 1) throw new Error(`Source should still have 1 entry, got ${source.length}`);
      if (remote.length !== 2) throw new Error(`Remote should still have 2 entries, got ${remote.length}`);
    });

    // --- archiveStatusEventsForEmployee accumulation test ---

    await runTest("archiveStatusEventsForEmployee accumulates in remote file", async () => {
      // Archive employee 200 - should append to remote that already has 2 entries
      await archiveStatusEventsForEmployee("200");

      const source = await readCsv(STATUS_EVENTS_PATH, STATUS_EVENT_COLUMNS);
      const remote = await readCsv(STATUS_EVENTS_REMOTE_PATH, STATUS_EVENT_COLUMNS);

      if (source.length !== 0) throw new Error(`Expected 0 remaining in source, got ${source.length}`);
      if (remote.length !== 3) throw new Error(`Expected 3 total archived, got ${remote.length}`);
      if (remote[2].employee_id !== "200") throw new Error("Third archived entry should be employee 200");
    });

    console.log(`\nTests passed: ${testsPassed}`);
    console.log(`Tests failed: ${testsFailed}`);

    if (testsFailed === 0) {
      console.log("\n✅ All remote archive store tests passed!");
    } else {
      console.log("\n❌ Some tests failed!");
    }

    return testsFailed === 0;
  } finally {
    await restoreAll();
  }
}

runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
