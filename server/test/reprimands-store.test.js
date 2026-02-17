/**
 * Unit tests for reprimands store functions
 * Run with: node server/test/reprimands-store.test.js
 */

import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Override the data path to use a temp directory for tests
const TEST_DATA_DIR = path.resolve(__dirname, "../fixtures/reprimands-test");

// We need to set up a temp reprimands.csv before importing store functions
// by temporarily replacing the data directory reference via process env or
// direct file creation. Since store.js hardcodes the path, we create the file
// at the real path and clean up after.

import {
  loadReprimands,
  addReprimand,
  updateReprimand,
  deleteReprimand,
  removeReprimandsForEmployee,
  DATA_DIR
} from "../src/store.js";

import { REPRIMAND_COLUMNS } from "../src/schema.js";
import { writeCsv } from "../src/csv.js";

const REPRIMANDS_PATH = path.join(DATA_DIR, "reprimands.csv");
const BACKUP_PATH = path.join(DATA_DIR, "reprimands.csv.bak");

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

async function backupReprimands() {
  try {
    await fs.access(REPRIMANDS_PATH);
    await fs.copyFile(REPRIMANDS_PATH, BACKUP_PATH);
  } catch {
    // File doesn't exist yet, no backup needed
  }
}

async function restoreReprimands() {
  try {
    await fs.access(BACKUP_PATH);
    await fs.copyFile(BACKUP_PATH, REPRIMANDS_PATH);
    await fs.unlink(BACKUP_PATH);
  } catch {
    // No backup to restore — delete test file if it was created
    try {
      await fs.unlink(REPRIMANDS_PATH);
    } catch {
      // OK
    }
  }
}

async function clearReprimands() {
  await writeCsv(REPRIMANDS_PATH, REPRIMAND_COLUMNS, []);
}

async function runAllTests() {
  console.log("Starting reprimands store tests...\n");

  // Backup existing reprimands.csv so we don't corrupt real data
  await backupReprimands();

  try {
    // Clear for clean state
    await clearReprimands();

    await runTest("loadReprimands returns empty array when file is empty", async () => {
      const records = await loadReprimands();
      if (!Array.isArray(records)) throw new Error("Expected array");
      if (records.length !== 0) throw new Error(`Expected 0 records, got ${records.length}`);
    });

    await runTest("addReprimand creates record with auto-increment record_id", async () => {
      const record = await addReprimand({
        employee_id: "1",
        record_date: "2026-01-15",
        record_type: "Догана",
        order_number: "№123",
        note: "Тест"
      });

      if (!record.record_id) throw new Error("record_id should be set");
      if (record.record_id !== "1") throw new Error(`Expected record_id '1', got '${record.record_id}'`);
      if (record.employee_id !== "1") throw new Error("employee_id mismatch");
      if (record.record_date !== "2026-01-15") throw new Error("record_date mismatch");
      if (record.record_type !== "Догана") throw new Error("record_type mismatch");
      if (record.order_number !== "№123") throw new Error("order_number mismatch");
      if (record.note !== "Тест") throw new Error("note mismatch");
      if (!record.created_at) throw new Error("created_at should be set");
    });

    await runTest("addReprimand auto-increments record_id for second record", async () => {
      const record = await addReprimand({
        employee_id: "1",
        record_date: "2026-02-10",
        record_type: "Подяка",
        order_number: "№45",
        note: "За успішне виконання"
      });

      if (record.record_id !== "2") throw new Error(`Expected record_id '2', got '${record.record_id}'`);
    });

    await runTest("loadReprimands returns all records", async () => {
      const records = await loadReprimands();
      if (records.length !== 2) throw new Error(`Expected 2 records, got ${records.length}`);
    });

    await runTest("updateReprimand updates existing record fields", async () => {
      const updated = await updateReprimand("1", {
        record_date: "2026-01-20",
        record_type: "Сувора догана",
        order_number: "№999",
        note: "Оновлено"
      });

      if (!updated) throw new Error("Expected updated record, got null");
      if (updated.record_id !== "1") throw new Error("record_id should remain '1'");
      if (updated.record_date !== "2026-01-20") throw new Error("record_date not updated");
      if (updated.record_type !== "Сувора догана") throw new Error("record_type not updated");
      if (updated.order_number !== "№999") throw new Error("order_number not updated");
      if (updated.note !== "Оновлено") throw new Error("note not updated");
      // employee_id and created_at should be preserved
      if (updated.employee_id !== "1") throw new Error("employee_id should be preserved");
    });

    await runTest("updateReprimand returns null for non-existent record_id", async () => {
      const result = await updateReprimand("9999", { record_type: "Подяка" });
      if (result !== null) throw new Error("Expected null for missing record");
    });

    await runTest("addReprimand for different employee", async () => {
      const record = await addReprimand({
        employee_id: "2",
        record_date: "2026-01-01",
        record_type: "Грамота",
        order_number: "",
        note: ""
      });
      if (record.employee_id !== "2") throw new Error("employee_id mismatch");
      if (record.record_id !== "3") throw new Error(`Expected record_id '3', got '${record.record_id}'`);
    });

    await runTest("deleteReprimand removes record by ID", async () => {
      const deleted = await deleteReprimand("2");
      if (!deleted) throw new Error("Expected true on successful delete");

      const records = await loadReprimands();
      const found = records.find(r => r.record_id === "2");
      if (found) throw new Error("Record with id '2' should have been deleted");
      if (records.length !== 2) throw new Error(`Expected 2 records after delete, got ${records.length}`);
    });

    await runTest("deleteReprimand returns false for non-existent ID", async () => {
      const deleted = await deleteReprimand("9999");
      if (deleted !== false) throw new Error("Expected false for missing record");
    });

    await runTest("removeReprimandsForEmployee removes all records for employee", async () => {
      await removeReprimandsForEmployee("1");
      const records = await loadReprimands();
      const empRecords = records.filter(r => r.employee_id === "1");
      if (empRecords.length !== 0) throw new Error(`Expected 0 records for employee 1, got ${empRecords.length}`);
    });

    await runTest("removeReprimandsForEmployee leaves other employees' records", async () => {
      const records = await loadReprimands();
      const emp2Records = records.filter(r => r.employee_id === "2");
      if (emp2Records.length !== 1) throw new Error(`Expected 1 record for employee 2, got ${emp2Records.length}`);
    });

    await runTest("addReprimand handles empty optional fields", async () => {
      const record = await addReprimand({
        employee_id: "5",
        record_date: "2026-02-17",
        record_type: "Нагорода",
        order_number: "",
        note: ""
      });
      if (record.order_number !== "") throw new Error("order_number should be empty string");
      if (record.note !== "") throw new Error("note should be empty string");
    });

    console.log(`\nTests passed: ${testsPassed}`);
    console.log(`Tests failed: ${testsFailed}`);

    if (testsFailed === 0) {
      console.log("\n✅ All reprimands store tests passed!");
    } else {
      console.log("\n❌ Some tests failed!");
    }

    return testsFailed === 0;
  } finally {
    // Restore original reprimands.csv
    await restoreReprimands();
  }
}

runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
