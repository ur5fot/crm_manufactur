/**
 * Integration tests for remote archive on employee DELETE
 * Prerequisites: Server must be running on port 3000
 * Run with: node server/test/remote-archive-api.test.js
 */

import path from "path";
import fs from "fs/promises";
import { DATA_DIR, REMOTE_DIR, FILES_DIR, loadFieldsSchema } from "../src/store.js";
import { readCsv } from "../src/csv.js";
import { REPRIMAND_COLUMNS, STATUS_EVENT_COLUMNS, loadEmployeeColumns, getCachedEmployeeColumns } from "../src/schema.js";

const BASE_URL = 'http://localhost:3000/api';

const EMPLOYEES_REMOTE_PATH = path.join(DATA_DIR, "employees_remote.csv");
const REPRIMANDS_REMOTE_PATH = path.join(DATA_DIR, "reprimands_remote.csv");
const STATUS_EVENTS_REMOTE_PATH = path.join(DATA_DIR, "status_events_remote.csv");

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

async function createTestEmployee() {
  const res = await fetch(`${BASE_URL}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'АрхівТест',
      last_name: 'Видалення',
      middle_name: 'Олексійович'
    })
  });
  if (!res.ok) throw new Error(`Failed to create test employee: ${res.status}`);
  const data = await res.json();
  return data.employee_id;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getEmployeeColumns() {
  const cached = getCachedEmployeeColumns();
  if (cached && cached.length > 0) return cached;
  return loadEmployeeColumns(loadFieldsSchema);
}

async function readRemoteCsv(filePath, columns) {
  if (!(await fileExists(filePath))) return [];
  return readCsv(filePath, columns);
}

async function runAllTests() {
  console.log('Starting remote archive API integration tests...\n');

  // Pre-test: ensure employee columns are loaded
  const empColumns = await getEmployeeColumns();

  let empId = null;

  try {
    // Create employee with related data for archival testing
    empId = await createTestEmployee();
    console.log(`Created test employee with ID: ${empId}\n`);

    // Add a reprimand for the employee
    const repRes = await fetch(`${BASE_URL}/employees/${empId}/reprimands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record_date: '2026-01-15',
        record_type: 'Догана',
        order_number: '№100',
        note: 'Тестова догана для архіву'
      })
    });
    if (repRes.status !== 201) throw new Error(`Failed to create reprimand: ${repRes.status}`);

    // Add a status event for the employee
    const evtRes = await fetch(`${BASE_URL}/employees/${empId}/status-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Відпустка',
        start_date: '2026-06-01',
        end_date: '2026-06-15'
      })
    });
    if (evtRes.status !== 201) throw new Error(`Failed to create status event: ${evtRes.status}`);

    // Create an employee files directory with a test file
    const employeeDir = path.join(FILES_DIR, `employee_${empId}`);
    await fs.mkdir(employeeDir, { recursive: true });
    await fs.writeFile(path.join(employeeDir, 'test_doc.txt'), 'test content');

    // Snapshot remote CSV counts before delete
    const remoteEmpBefore = await readRemoteCsv(EMPLOYEES_REMOTE_PATH, empColumns);
    const remoteRepBefore = await readRemoteCsv(REPRIMANDS_REMOTE_PATH, REPRIMAND_COLUMNS);
    const remoteEvtBefore = await readRemoteCsv(STATUS_EVENTS_REMOTE_PATH, STATUS_EVENT_COLUMNS);

    // --- DELETE the employee ---
    const delRes = await fetch(`${BASE_URL}/employees/${empId}`, { method: 'DELETE' });

    // Test: DELETE returns 204
    await runTest("DELETE /api/employees/:id returns 204", async () => {
      if (delRes.status !== 204) throw new Error(`Expected 204, got ${delRes.status}`);
    });

    // Test: deleted employee no longer in GET /api/employees
    await runTest("Deleted employee no longer appears in GET /api/employees", async () => {
      const res = await fetch(`${BASE_URL}/employees`);
      const data = await res.json();
      const found = data.employees.find(e => e.employee_id === empId);
      if (found) throw new Error("Employee still found in active employees list");
    });

    // Test: employee record archived to employees_remote.csv
    await runTest("DELETE archives employee record to employees_remote.csv", async () => {
      const remoteEmpAfter = await readRemoteCsv(EMPLOYEES_REMOTE_PATH, empColumns);
      // Find the last occurrence with this employee_id (most recently archived)
      const matchingRecords = remoteEmpAfter.filter(e => e.employee_id === empId);
      if (matchingRecords.length === 0) throw new Error("Employee not found in employees_remote.csv");
      const archived = matchingRecords[matchingRecords.length - 1];
      if (archived.last_name !== 'Видалення') throw new Error(`Expected last_name 'Видалення', got '${archived.last_name}'`);
      if (archived.first_name !== 'АрхівТест') throw new Error(`Expected first_name 'АрхівТест', got '${archived.first_name}'`);
      // Count should have increased
      if (remoteEmpAfter.length <= remoteEmpBefore.length) {
        throw new Error(`Expected remote employees count to increase from ${remoteEmpBefore.length}`);
      }
    });

    // Test: reprimands archived to reprimands_remote.csv
    await runTest("DELETE archives reprimand records to reprimands_remote.csv", async () => {
      const remoteRepAfter = await readRemoteCsv(REPRIMANDS_REMOTE_PATH, REPRIMAND_COLUMNS);
      const archived = remoteRepAfter.filter(r => r.employee_id === empId);
      if (archived.length !== 1) throw new Error(`Expected exactly 1 archived reprimand, got ${archived.length}`);
      if (archived[0].record_type !== 'Догана') throw new Error(`Expected record_type 'Догана', got '${archived[0].record_type}'`);
    });

    // Test: status events archived to status_events_remote.csv
    await runTest("DELETE archives status events to status_events_remote.csv", async () => {
      const remoteEvtAfter = await readRemoteCsv(STATUS_EVENTS_REMOTE_PATH, STATUS_EVENT_COLUMNS);
      const archived = remoteEvtAfter.filter(e => e.employee_id === empId);
      if (archived.length !== 1) throw new Error(`Expected exactly 1 archived status event, got ${archived.length}`);
      if (archived[0].status !== 'Відпустка') throw new Error(`Expected status 'Відпустка', got '${archived[0].status}'`);
    });

    // Test: employee files directory moved to remote/employee_{id}/
    await runTest("DELETE moves employee files directory to remote/employee_{id}/", async () => {
      const remoteEmployeeDir = path.join(REMOTE_DIR, `employee_${empId}`);
      const remoteExists = await fileExists(remoteEmployeeDir);
      if (!remoteExists) throw new Error("remote/employee_{id}/ directory not found");
      const testFile = path.join(remoteEmployeeDir, 'test_doc.txt');
      const fileContent = await fs.readFile(testFile, 'utf-8');
      if (fileContent !== 'test content') throw new Error("Test file content mismatch in remote directory");
      // Original should not exist
      const originalExists = await fileExists(employeeDir);
      if (originalExists) throw new Error("Original employee files directory still exists");
    });

    // Test: 404 for non-existent employee (unchanged behavior)
    await runTest("DELETE /api/employees/:id returns 404 for non-existent employee", async () => {
      const res = await fetch(`${BASE_URL}/employees/999999`, { method: 'DELETE' });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // Clean up: remove the remote employee dir created by this test
    const remoteEmployeeDir = path.join(REMOTE_DIR, `employee_${empId}`);
    await fs.rm(remoteEmployeeDir, { recursive: true, force: true }).catch(() => {});
    // Mark empId as null to skip cleanup in finally block
    empId = null;

  } catch (err) {
    console.error('Test setup error:', err.message);
    if (err.message.includes('ECONNREFUSED') || err.code === 'ECONNREFUSED') {
      console.error('Make sure the server is running on port 3000');
    }
    // Cleanup on failure
    if (empId) {
      await fetch(`${BASE_URL}/employees/${empId}`, { method: 'DELETE' }).catch(() => {});
    }
    process.exit(1);
  }

  console.log(`\nTests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);

  if (testsFailed === 0) {
    console.log("\n✅ All remote archive API tests passed!");
  } else {
    console.log("\n❌ Some tests failed!");
  }

  return testsFailed === 0;
}

runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    if (error.code === 'ECONNREFUSED') {
      console.error('Make sure the server is running on port 3000');
    }
    process.exit(1);
  });
