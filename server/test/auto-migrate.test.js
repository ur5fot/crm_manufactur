/**
 * Unit tests for auto-migrate.js — field_name rename detection and propagation
 * Run with: node server/test/auto-migrate.test.js
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { runAutoMigration } from "../src/auto-migrate.js";
import { writeCsv, readCsv } from "../src/csv.js";
import { FIELD_SCHEMA_COLUMNS, FIELD_MAPPING_COLUMNS, LOG_COLUMNS } from "../src/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DIR = path.resolve(__dirname, "../fixtures/auto-migrate-test");

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

// Helper: set up a clean test directory
async function setupTestDir() {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  await fs.mkdir(TEST_DIR, { recursive: true });
}

// Helper: clean up
async function cleanupTestDir() {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
}

// Helper: write a minimal fields_schema.csv
async function writeSchema(fields) {
  await writeCsv(path.join(TEST_DIR, "fields_schema.csv"), FIELD_SCHEMA_COLUMNS, fields);
}

// Helper: write a field_mapping.csv
async function writeMapping(rows) {
  await writeCsv(path.join(TEST_DIR, "field_mapping.csv"), FIELD_MAPPING_COLUMNS, rows);
}

// Helper: write employees.csv with given columns and data
async function writeEmployees(columns, rows) {
  await writeCsv(path.join(TEST_DIR, "employees.csv"), columns, rows);
}

// Helper: write employees_remote.csv with given columns and data
async function writeEmployeesRemote(columns, rows) {
  await writeCsv(path.join(TEST_DIR, "employees_remote.csv"), columns, rows);
}

// Helper: write templates.csv
const TEMPLATE_COLUMNS = [
  "template_id", "template_name", "template_type",
  "docx_filename", "placeholder_fields", "description",
  "created_date", "active"
];

async function writeTemplates(rows) {
  await writeCsv(path.join(TEST_DIR, "templates.csv"), TEMPLATE_COLUMNS, rows);
}

// Helper: write logs.csv
async function writeLogs(rows) {
  await writeCsv(path.join(TEST_DIR, "logs.csv"), LOG_COLUMNS, rows);
}

// Helper: read a CSV back
async function readFile(filename, columns) {
  return readCsv(path.join(TEST_DIR, filename), columns);
}

// --- Test: first run creates field_mapping.csv ---

async function testFirstRunCreatesFieldMapping() {
  await setupTestDir();
  try {
    // Write schema, no field_mapping.csv exists
    await writeSchema([
      { field_id: "f_emp_id", field_order: "1", field_name: "employee_id", field_label: "ID", field_type: "text", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "EMPLOYEE_ID" },
      { field_id: "f_last", field_order: "2", field_name: "last_name", field_label: "Прізвище", field_type: "text", field_options: "", show_in_table: "yes", field_group: "Test", editable_in_table: "yes", role: "LAST_NAME" }
    ]);

    const result = await runAutoMigration(TEST_DIR);

    if (!result.created) throw new Error("Expected created=true for first run");
    if (Object.keys(result.renames).length !== 0) throw new Error("Expected no renames on first run");

    // Verify field_mapping.csv was created
    const mapping = await readFile("field_mapping.csv", FIELD_MAPPING_COLUMNS);
    if (mapping.length !== 2) throw new Error(`Expected 2 mapping rows, got ${mapping.length}`);

    const empRow = mapping.find(r => r.field_id === "f_emp_id");
    if (!empRow) throw new Error("Missing f_emp_id in mapping");
    if (empRow.field_name !== "employee_id") throw new Error("f_emp_id should map to employee_id");

    const lastRow = mapping.find(r => r.field_id === "f_last");
    if (!lastRow) throw new Error("Missing f_last in mapping");
    if (lastRow.field_name !== "last_name") throw new Error("f_last should map to last_name");
  } finally {
    await cleanupTestDir();
  }
}

// --- Test: no renames when mapping matches schema ---

async function testNoRenamesWhenMatching() {
  await setupTestDir();
  try {
    const fields = [
      { field_id: "f_emp_id", field_order: "1", field_name: "employee_id", field_label: "ID", field_type: "text", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "EMPLOYEE_ID" },
      { field_id: "f_name", field_order: "2", field_name: "full_name", field_label: "Name", field_type: "text", field_options: "", show_in_table: "yes", field_group: "Test", editable_in_table: "yes", role: "" }
    ];

    await writeSchema(fields);
    await writeMapping([
      { field_id: "f_emp_id", field_name: "employee_id" },
      { field_id: "f_name", field_name: "full_name" }
    ]);

    const result = await runAutoMigration(TEST_DIR);

    if (result.created) throw new Error("Should not be first run");
    if (Object.keys(result.renames).length !== 0) throw new Error("Expected no renames");
  } finally {
    await cleanupTestDir();
  }
}

// --- Test: single field rename updates employees.csv ---

async function testSingleFieldRenameEmployees() {
  await setupTestDir();
  try {
    // Schema has renamed "last_name" to "surname"
    await writeSchema([
      { field_id: "f_emp_id", field_order: "1", field_name: "employee_id", field_label: "ID", field_type: "text", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "EMPLOYEE_ID" },
      { field_id: "f_last", field_order: "2", field_name: "surname", field_label: "Прізвище", field_type: "text", field_options: "", show_in_table: "yes", field_group: "Test", editable_in_table: "yes", role: "LAST_NAME" }
    ]);

    // Old mapping has "last_name"
    await writeMapping([
      { field_id: "f_emp_id", field_name: "employee_id" },
      { field_id: "f_last", field_name: "last_name" }
    ]);

    // Employees with old column names
    const empColumns = ["employee_id", "last_name"];
    await writeEmployees(empColumns, [
      { employee_id: "1", last_name: "Петренко" },
      { employee_id: "2", last_name: "Іваненко" }
    ]);

    // New columns expected after rename
    const newColumns = ["employee_id", "surname"];
    const result = await runAutoMigration(TEST_DIR, newColumns);

    if (!result.renames["last_name"]) throw new Error("Expected 'last_name' rename detected");
    if (result.renames["last_name"] !== "surname") throw new Error("Expected 'last_name' → 'surname'");

    // Read employees with new columns
    const employees = await readFile("employees.csv", newColumns);
    if (employees.length !== 2) throw new Error(`Expected 2 employees, got ${employees.length}`);
    if (employees[0].surname !== "Петренко") throw new Error(`Expected 'Петренко', got '${employees[0].surname}'`);
    if (employees[1].surname !== "Іваненко") throw new Error(`Expected 'Іваненко', got '${employees[1].surname}'`);

    // Verify field_mapping.csv was updated
    const mapping = await readFile("field_mapping.csv", FIELD_MAPPING_COLUMNS);
    const lastRow = mapping.find(r => r.field_id === "f_last");
    if (lastRow.field_name !== "surname") throw new Error("Mapping should be updated to 'surname'");
  } finally {
    await cleanupTestDir();
  }
}

// --- Test: file field rename auto-renames _issue_date and _expiry_date columns ---

async function testFileFieldRenameAutoExpandsDates() {
  await setupTestDir();
  try {
    // Schema: file field renamed from "doc_file" to "document_file"
    await writeSchema([
      { field_id: "f_emp_id", field_order: "1", field_name: "employee_id", field_label: "ID", field_type: "text", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "EMPLOYEE_ID" },
      { field_id: "f_doc", field_order: "2", field_name: "document_file", field_label: "Документ", field_type: "file", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "" }
    ]);

    // Old mapping
    await writeMapping([
      { field_id: "f_emp_id", field_name: "employee_id" },
      { field_id: "f_doc", field_name: "doc_file" }
    ]);

    // Employees with old columns (including auto-generated date columns)
    const oldColumns = ["employee_id", "doc_file", "doc_file_issue_date", "doc_file_expiry_date"];
    await writeEmployees(oldColumns, [
      { employee_id: "1", doc_file: "path/to/doc.pdf", doc_file_issue_date: "2025-01-01", doc_file_expiry_date: "2026-01-01" }
    ]);

    const newColumns = ["employee_id", "document_file", "document_file_issue_date", "document_file_expiry_date"];
    const result = await runAutoMigration(TEST_DIR, newColumns);

    // Should detect all 3 renames (base + _issue_date + _expiry_date)
    if (result.renames["doc_file"] !== "document_file") throw new Error("Expected doc_file → document_file");
    if (result.renames["doc_file_issue_date"] !== "document_file_issue_date") throw new Error("Expected doc_file_issue_date rename");
    if (result.renames["doc_file_expiry_date"] !== "document_file_expiry_date") throw new Error("Expected doc_file_expiry_date rename");

    // Read employees with new columns
    const employees = await readFile("employees.csv", newColumns);
    if (employees[0].document_file !== "path/to/doc.pdf") throw new Error("document_file value mismatch");
    if (employees[0].document_file_issue_date !== "2025-01-01") throw new Error("document_file_issue_date value mismatch");
    if (employees[0].document_file_expiry_date !== "2026-01-01") throw new Error("document_file_expiry_date value mismatch");
  } finally {
    await cleanupTestDir();
  }
}

// --- Test: templates.csv placeholder_fields update ---

async function testTemplatesPlaceholderFieldsUpdate() {
  await setupTestDir();
  try {
    // Schema: "birth_date" renamed to "date_of_birth"
    await writeSchema([
      { field_id: "f_emp_id", field_order: "1", field_name: "employee_id", field_label: "ID", field_type: "text", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "EMPLOYEE_ID" },
      { field_id: "f_bdate", field_order: "2", field_name: "date_of_birth", field_label: "Дата народження", field_type: "date", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "BIRTH_DATE" }
    ]);

    await writeMapping([
      { field_id: "f_emp_id", field_name: "employee_id" },
      { field_id: "f_bdate", field_name: "birth_date" }
    ]);

    // Templates with old placeholder names
    await writeTemplates([
      { template_id: "1", template_name: "Contract", template_type: "contract", docx_filename: "template_1.docx", placeholder_fields: "employee_id,birth_date,department", description: "Test", created_date: "2025-01-01", active: "yes" },
      { template_id: "2", template_name: "Badge", template_type: "badge", docx_filename: "template_2.docx", placeholder_fields: "employee_id,full_name", description: "No birth_date", created_date: "2025-01-01", active: "yes" }
    ]);

    const result = await runAutoMigration(TEST_DIR);

    if (result.renames["birth_date"] !== "date_of_birth") throw new Error("Expected birth_date rename");

    // Read templates and check placeholder_fields
    const templates = await readFile("templates.csv", TEMPLATE_COLUMNS);
    if (templates[0].placeholder_fields !== "employee_id,date_of_birth,department") {
      throw new Error(`Expected updated placeholder_fields, got: ${templates[0].placeholder_fields}`);
    }
    // Template 2 should be unchanged
    if (templates[1].placeholder_fields !== "employee_id,full_name") {
      throw new Error(`Template 2 should be unchanged, got: ${templates[1].placeholder_fields}`);
    }
  } finally {
    await cleanupTestDir();
  }
}

// --- Test: logs.csv field_name column update ---

async function testLogsFieldNameUpdate() {
  await setupTestDir();
  try {
    // Schema: "last_name" renamed to "surname"
    await writeSchema([
      { field_id: "f_emp_id", field_order: "1", field_name: "employee_id", field_label: "ID", field_type: "text", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "EMPLOYEE_ID" },
      { field_id: "f_last", field_order: "2", field_name: "surname", field_label: "Прізвище", field_type: "text", field_options: "", show_in_table: "yes", field_group: "Test", editable_in_table: "yes", role: "LAST_NAME" }
    ]);

    await writeMapping([
      { field_id: "f_emp_id", field_name: "employee_id" },
      { field_id: "f_last", field_name: "last_name" }
    ]);

    // Logs with old field names
    await writeLogs([
      { log_id: "1", timestamp: "2025-01-01T00:00:00Z", action: "UPDATE", employee_id: "1", employee_name: "Петренко", field_name: "last_name", old_value: "Петренко", new_value: "Сидоренко", details: "" },
      { log_id: "2", timestamp: "2025-01-02T00:00:00Z", action: "UPDATE", employee_id: "2", employee_name: "Іваненко", field_name: "department", old_value: "IT", new_value: "HR", details: "" }
    ]);

    const result = await runAutoMigration(TEST_DIR);

    if (result.renames["last_name"] !== "surname") throw new Error("Expected last_name rename");

    // Read logs and check field_name column
    const logs = await readFile("logs.csv", LOG_COLUMNS);
    if (logs[0].field_name !== "surname") throw new Error(`Expected 'surname' in log 1, got '${logs[0].field_name}'`);
    // Log 2 should be unchanged (different field)
    if (logs[1].field_name !== "department") throw new Error(`Log 2 should stay 'department', got '${logs[1].field_name}'`);
  } finally {
    await cleanupTestDir();
  }
}

// --- Test: employees_remote.csv is also renamed ---

async function testEmployeesRemoteAlsoRenamed() {
  await setupTestDir();
  try {
    await writeSchema([
      { field_id: "f_emp_id", field_order: "1", field_name: "employee_id", field_label: "ID", field_type: "text", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "EMPLOYEE_ID" },
      { field_id: "f_last", field_order: "2", field_name: "surname", field_label: "Прізвище", field_type: "text", field_options: "", show_in_table: "yes", field_group: "Test", editable_in_table: "yes", role: "LAST_NAME" }
    ]);

    await writeMapping([
      { field_id: "f_emp_id", field_name: "employee_id" },
      { field_id: "f_last", field_name: "last_name" }
    ]);

    // Both employees.csv and employees_remote.csv have old columns
    const oldColumns = ["employee_id", "last_name"];
    await writeEmployees(oldColumns, [
      { employee_id: "1", last_name: "Active" }
    ]);
    await writeEmployeesRemote(oldColumns, [
      { employee_id: "99", last_name: "Archived" }
    ]);

    const newColumns = ["employee_id", "surname"];
    await runAutoMigration(TEST_DIR, newColumns);

    // Verify employees_remote.csv also renamed
    const remote = await readFile("employees_remote.csv", newColumns);
    if (remote.length !== 1) throw new Error(`Expected 1 remote employee, got ${remote.length}`);
    if (remote[0].surname !== "Archived") throw new Error(`Expected 'Archived', got '${remote[0].surname}'`);
  } finally {
    await cleanupTestDir();
  }
}

// --- Test: empty schema doesn't crash ---

async function testEmptySchemaNoCrash() {
  await setupTestDir();
  try {
    await writeSchema([]);

    const result = await runAutoMigration(TEST_DIR);

    if (result.created) throw new Error("Should not create mapping for empty schema");
    if (Object.keys(result.renames).length !== 0) throw new Error("Expected no renames");
  } finally {
    await cleanupTestDir();
  }
}

// --- Test: missing employees.csv doesn't crash ---

async function testMissingEmployeesCsvNoCrash() {
  await setupTestDir();
  try {
    // Schema with rename, but no employees.csv/employees_remote.csv
    await writeSchema([
      { field_id: "f_last", field_order: "1", field_name: "surname", field_label: "Прізвище", field_type: "text", field_options: "", show_in_table: "yes", field_group: "Test", editable_in_table: "yes", role: "LAST_NAME" }
    ]);

    await writeMapping([
      { field_id: "f_last", field_name: "last_name" }
    ]);

    // Should not throw even without employees.csv
    const result = await runAutoMigration(TEST_DIR);
    if (result.renames["last_name"] !== "surname") throw new Error("Rename should still be detected");
  } finally {
    await cleanupTestDir();
  }
}

// --- Test: multiple renames in one pass ---

async function testMultipleRenamesInOnePass() {
  await setupTestDir();
  try {
    await writeSchema([
      { field_id: "f_emp_id", field_order: "1", field_name: "emp_id", field_label: "ID", field_type: "text", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "EMPLOYEE_ID" },
      { field_id: "f_last", field_order: "2", field_name: "surname", field_label: "Прізвище", field_type: "text", field_options: "", show_in_table: "yes", field_group: "Test", editable_in_table: "yes", role: "LAST_NAME" },
      { field_id: "f_bdate", field_order: "3", field_name: "dob", field_label: "Дата", field_type: "date", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "BIRTH_DATE" }
    ]);

    await writeMapping([
      { field_id: "f_emp_id", field_name: "employee_id" },
      { field_id: "f_last", field_name: "last_name" },
      { field_id: "f_bdate", field_name: "birth_date" }
    ]);

    const oldColumns = ["employee_id", "last_name", "birth_date"];
    await writeEmployees(oldColumns, [
      { employee_id: "1", last_name: "Петренко", birth_date: "1990-05-15" }
    ]);

    const newColumns = ["emp_id", "surname", "dob"];
    const result = await runAutoMigration(TEST_DIR, newColumns);

    // Should detect 3 renames
    if (Object.keys(result.renames).length !== 3) throw new Error(`Expected 3 renames, got ${Object.keys(result.renames).length}`);
    if (result.renames["employee_id"] !== "emp_id") throw new Error("Expected employee_id → emp_id");
    if (result.renames["last_name"] !== "surname") throw new Error("Expected last_name → surname");
    if (result.renames["birth_date"] !== "dob") throw new Error("Expected birth_date → dob");

    // Verify data
    const employees = await readFile("employees.csv", newColumns);
    if (employees[0].emp_id !== "1") throw new Error("emp_id value mismatch");
    if (employees[0].surname !== "Петренко") throw new Error("surname value mismatch");
    if (employees[0].dob !== "1990-05-15") throw new Error("dob value mismatch");
  } finally {
    await cleanupTestDir();
  }
}

// --- Test: new fields in schema don't cause renames ---

async function testNewFieldsNoFalseRenames() {
  await setupTestDir();
  try {
    // Schema has one new field (f_dept) not in the mapping
    await writeSchema([
      { field_id: "f_emp_id", field_order: "1", field_name: "employee_id", field_label: "ID", field_type: "text", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "EMPLOYEE_ID" },
      { field_id: "f_dept", field_order: "2", field_name: "department", field_label: "Підрозділ", field_type: "text", field_options: "", show_in_table: "no", field_group: "Test", editable_in_table: "no", role: "" }
    ]);

    await writeMapping([
      { field_id: "f_emp_id", field_name: "employee_id" }
      // f_dept is new — not in the old mapping
    ]);

    const result = await runAutoMigration(TEST_DIR);

    if (Object.keys(result.renames).length !== 0) throw new Error("New fields should not cause renames");

    // Mapping should now include the new field
    const mapping = await readFile("field_mapping.csv", FIELD_MAPPING_COLUMNS);
    if (mapping.length !== 2) throw new Error(`Expected 2 mapping rows, got ${mapping.length}`);
    const deptRow = mapping.find(r => r.field_id === "f_dept");
    if (!deptRow) throw new Error("New field f_dept should be in mapping");
    if (deptRow.field_name !== "department") throw new Error("f_dept should map to department");
  } finally {
    await cleanupTestDir();
  }
}

// --- Test: idempotent — running twice gives same result ---

async function testIdempotentExecution() {
  await setupTestDir();
  try {
    await writeSchema([
      { field_id: "f_last", field_order: "1", field_name: "surname", field_label: "Прізвище", field_type: "text", field_options: "", show_in_table: "yes", field_group: "Test", editable_in_table: "yes", role: "LAST_NAME" }
    ]);

    await writeMapping([
      { field_id: "f_last", field_name: "last_name" }
    ]);

    const oldColumns = ["last_name"];
    await writeEmployees(oldColumns, [
      { last_name: "Петренко" }
    ]);

    const newColumns = ["surname"];

    // First run: apply rename
    const result1 = await runAutoMigration(TEST_DIR, newColumns);
    if (result1.renames["last_name"] !== "surname") throw new Error("First run should detect rename");

    // Second run: no rename (mapping updated)
    const result2 = await runAutoMigration(TEST_DIR, newColumns);
    if (Object.keys(result2.renames).length !== 0) throw new Error("Second run should have no renames");

    // Data should be unchanged
    const employees = await readFile("employees.csv", newColumns);
    if (employees[0].surname !== "Петренко") throw new Error("Data should be preserved");
  } finally {
    await cleanupTestDir();
  }
}

// --- Main ---

async function runAllTests() {
  console.log("Auto-migrate tests\n");

  await runTest("First run creates field_mapping.csv", testFirstRunCreatesFieldMapping);
  await runTest("No renames when mapping matches schema", testNoRenamesWhenMatching);
  await runTest("Single field rename updates employees.csv", testSingleFieldRenameEmployees);
  await runTest("File field rename auto-expands _issue_date and _expiry_date", testFileFieldRenameAutoExpandsDates);
  await runTest("Templates placeholder_fields updated on rename", testTemplatesPlaceholderFieldsUpdate);
  await runTest("Logs field_name column updated on rename", testLogsFieldNameUpdate);
  await runTest("employees_remote.csv also renamed", testEmployeesRemoteAlsoRenamed);
  await runTest("Empty schema does not crash", testEmptySchemaNoCrash);
  await runTest("Missing employees.csv does not crash", testMissingEmployeesCsvNoCrash);
  await runTest("Multiple renames in one pass", testMultipleRenamesInOnePass);
  await runTest("New fields do not cause false renames", testNewFieldsNoFalseRenames);
  await runTest("Idempotent execution (two runs)", testIdempotentExecution);

  console.log(`\nTests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);

  return testsFailed === 0;
}

runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
