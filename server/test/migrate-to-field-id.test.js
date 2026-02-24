/**
 * Unit tests for migrate-to-field-id.js
 * Run with: node server/test/migrate-to-field-id.test.js
 */

import { migrateSchema } from '../src/migrate-to-field-id.js';

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

// Test: migration adds field_id and role to schema without them
async function testMigrateAddsFieldIdAndRole() {
  const rows = [
    { field_order: "0", field_name: "photo", field_label: "Фото", field_type: "photo", field_options: "", show_in_table: "no", field_group: "Особисті дані", editable_in_table: "no" },
    { field_order: "1", field_name: "employee_id", field_label: "ID", field_type: "text", field_options: "", show_in_table: "no", field_group: "Особисті дані", editable_in_table: "no" },
    { field_order: "2", field_name: "last_name", field_label: "Прізвище", field_type: "text", field_options: "", show_in_table: "yes", field_group: "Особисті дані", editable_in_table: "yes" },
    { field_order: "3", field_name: "department", field_label: "Підрозділ", field_type: "text", field_options: "", show_in_table: "no", field_group: "Посада", editable_in_table: "no" },
  ];

  const result = migrateSchema(rows);

  if (!result.migrated) throw new Error("Expected migrated=true");
  if (result.schema.length !== 4) throw new Error(`Expected 4 rows, got ${result.schema.length}`);

  // Check field_id generated
  if (result.schema[0].field_id !== "f_photo") throw new Error(`Expected f_photo, got ${result.schema[0].field_id}`);
  if (result.schema[1].field_id !== "f_employee_id") throw new Error(`Expected f_employee_id, got ${result.schema[1].field_id}`);
  if (result.schema[2].field_id !== "f_last_name") throw new Error(`Expected f_last_name, got ${result.schema[2].field_id}`);

  // Check roles assigned
  if (result.schema[0].role !== "PHOTO") throw new Error(`Expected PHOTO, got ${result.schema[0].role}`);
  if (result.schema[1].role !== "EMPLOYEE_ID") throw new Error(`Expected EMPLOYEE_ID, got ${result.schema[1].role}`);
  if (result.schema[2].role !== "LAST_NAME") throw new Error(`Expected LAST_NAME, got ${result.schema[2].role}`);

  // department has no role
  if (result.schema[3].role !== "") throw new Error(`Expected empty role for department, got ${result.schema[3].role}`);
}

// Test: migration is no-op when field_id already exists
async function testMigrateSkipsWhenFieldIdExists() {
  const rows = [
    { field_id: "f_photo", field_order: "0", field_name: "photo", field_label: "Фото", field_type: "photo", role: "PHOTO" },
    { field_id: "f_last_name", field_order: "2", field_name: "last_name", field_label: "Прізвище", field_type: "text", role: "LAST_NAME" },
  ];

  const result = migrateSchema(rows);

  if (result.migrated) throw new Error("Expected migrated=false");
  if (result.schema !== rows) throw new Error("Expected original rows returned");
}

// Test: all 16 critical roles are assigned correctly
async function testAllRolesAssigned() {
  const roleFields = [
    "photo", "employee_id", "last_name", "first_name", "middle_name",
    "birth_date", "gender", "employment_status", "status_start_date", "status_end_date",
    "grade", "position", "indeclinable_name", "indeclinable_first_name",
    "indeclinable_grade", "indeclinable_position",
  ];
  const expectedRoles = [
    "PHOTO", "EMPLOYEE_ID", "LAST_NAME", "FIRST_NAME", "MIDDLE_NAME",
    "BIRTH_DATE", "GENDER", "STATUS", "STATUS_START", "STATUS_END",
    "GRADE", "POSITION", "INDECL_NAME", "INDECL_FIRST",
    "INDECL_GRADE", "INDECL_POSITION",
  ];

  const rows = roleFields.map((name, i) => ({
    field_order: String(i),
    field_name: name,
    field_label: name,
    field_type: "text",
    field_options: "",
    show_in_table: "no",
    field_group: "Test",
    editable_in_table: "no",
  }));

  const result = migrateSchema(rows);

  if (!result.migrated) throw new Error("Expected migrated=true");

  for (let i = 0; i < roleFields.length; i++) {
    const actual = result.schema[i].role;
    const expected = expectedRoles[i];
    if (actual !== expected) {
      throw new Error(`Field ${roleFields[i]}: expected role ${expected}, got ${actual}`);
    }
  }
}

// Test: migration handles empty schema
async function testMigrateEmptySchema() {
  const result = migrateSchema([]);

  if (!result.migrated) throw new Error("Expected migrated=true for empty schema");
  if (result.schema.length !== 0) throw new Error(`Expected 0 rows, got ${result.schema.length}`);
}

// Test: migration handles rows with empty field_id (partially migrated — treated as not migrated)
async function testMigrateEmptyFieldId() {
  const rows = [
    { field_id: "", field_order: "0", field_name: "photo", field_label: "Фото", field_type: "photo", role: "" },
    { field_id: "", field_order: "1", field_name: "last_name", field_label: "Прізвище", field_type: "text", role: "" },
  ];

  const result = migrateSchema(rows);

  if (!result.migrated) throw new Error("Expected migrated=true when field_id is empty");
  if (result.schema[0].field_id !== "f_photo") throw new Error(`Expected f_photo, got ${result.schema[0].field_id}`);
  if (result.schema[0].role !== "PHOTO") throw new Error(`Expected PHOTO, got ${result.schema[0].role}`);
}

// Test: summary message includes counts
async function testMigrateSummaryMessage() {
  const rows = [
    { field_order: "0", field_name: "photo", field_label: "Фото", field_type: "photo" },
    { field_order: "1", field_name: "department", field_label: "Підрозділ", field_type: "text" },
  ];

  const result = migrateSchema(rows);

  if (!result.summary.includes("2 fields")) throw new Error(`Summary should mention 2 fields: ${result.summary}`);
  if (!result.summary.includes("1 role")) throw new Error(`Summary should mention 1 role: ${result.summary}`);
}

async function runAllTests() {
  console.log("Starting migrate-to-field-id tests...\n");

  await runTest("Migration adds field_id and role to schema without them", testMigrateAddsFieldIdAndRole);
  await runTest("Migration skips when field_id already exists", testMigrateSkipsWhenFieldIdExists);
  await runTest("All 16 critical roles are assigned correctly", testAllRolesAssigned);
  await runTest("Migration handles empty schema", testMigrateEmptySchema);
  await runTest("Migration handles rows with empty field_id", testMigrateEmptyFieldId);
  await runTest("Summary message includes counts", testMigrateSummaryMessage);

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
