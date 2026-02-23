/**
 * Unit tests for schema.js — field_id and role columns
 * Run with: node server/test/schema.test.js
 */

import { loadEmployeeColumns, resetEmployeeColumnsCache, getCachedFieldIdMap, getCachedFieldSchema, getCachedEmployeeColumns, FIELD_SCHEMA_COLUMNS } from '../src/schema.js';

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

// --- Tests ---

async function testFieldSchemaColumnsIncludesFieldIdAndRole() {
  if (!FIELD_SCHEMA_COLUMNS.includes('field_id')) {
    throw new Error('FIELD_SCHEMA_COLUMNS should include field_id');
  }
  if (!FIELD_SCHEMA_COLUMNS.includes('role')) {
    throw new Error('FIELD_SCHEMA_COLUMNS should include role');
  }
  // field_id should be first column
  if (FIELD_SCHEMA_COLUMNS[0] !== 'field_id') {
    throw new Error(`Expected field_id as first column, got ${FIELD_SCHEMA_COLUMNS[0]}`);
  }
  // role should be last column
  if (FIELD_SCHEMA_COLUMNS[FIELD_SCHEMA_COLUMNS.length - 1] !== 'role') {
    throw new Error(`Expected role as last column, got ${FIELD_SCHEMA_COLUMNS[FIELD_SCHEMA_COLUMNS.length - 1]}`);
  }
}

async function testLoadEmployeeColumnsPopulatesFieldIdMap() {
  resetEmployeeColumnsCache();

  // Create a mock schema loader that returns schema with field_id and role
  const mockSchema = [
    { field_id: 'f_employee_id', field_order: '1', field_name: 'employee_id', field_label: 'ID', field_type: 'text', field_options: '', show_in_table: 'no', field_group: 'Test', editable_in_table: 'no', role: 'EMPLOYEE_ID' },
    { field_id: 'f_last_name', field_order: '2', field_name: 'last_name', field_label: 'Прізвище', field_type: 'text', field_options: '', show_in_table: 'yes', field_group: 'Test', editable_in_table: 'yes', role: 'LAST_NAME' },
    { field_id: 'f_birth_date', field_order: '3', field_name: 'birth_date', field_label: 'Дата народження', field_type: 'date', field_options: '', show_in_table: 'no', field_group: 'Test', editable_in_table: 'no', role: 'BIRTH_DATE' },
    { field_id: 'f_doc_file', field_order: '4', field_name: 'doc_file', field_label: 'Документ', field_type: 'file', field_options: '', show_in_table: 'no', field_group: 'Test', editable_in_table: 'no', role: '' }
  ];

  const columns = await loadEmployeeColumns(() => Promise.resolve(mockSchema));

  // Verify columns include file auto-generated date columns
  if (!columns.includes('employee_id')) throw new Error('Missing employee_id');
  if (!columns.includes('last_name')) throw new Error('Missing last_name');
  if (!columns.includes('birth_date')) throw new Error('Missing birth_date');
  if (!columns.includes('doc_file')) throw new Error('Missing doc_file');
  if (!columns.includes('doc_file_issue_date')) throw new Error('Missing doc_file_issue_date');
  if (!columns.includes('doc_file_expiry_date')) throw new Error('Missing doc_file_expiry_date');

  // Verify field_id map is populated
  const fieldIdMap = getCachedFieldIdMap();
  if (!fieldIdMap) throw new Error('Field ID map should be populated after loadEmployeeColumns');
  if (!(fieldIdMap instanceof Map)) throw new Error('Field ID map should be a Map');
  if (fieldIdMap.get('f_employee_id') !== 'employee_id') throw new Error('f_employee_id should map to employee_id');
  if (fieldIdMap.get('f_last_name') !== 'last_name') throw new Error('f_last_name should map to last_name');
  if (fieldIdMap.get('f_birth_date') !== 'birth_date') throw new Error('f_birth_date should map to birth_date');
  if (fieldIdMap.get('f_doc_file') !== 'doc_file') throw new Error('f_doc_file should map to doc_file');
  if (fieldIdMap.size !== 4) throw new Error(`Expected 4 entries in field ID map, got ${fieldIdMap.size}`);

  resetEmployeeColumnsCache();
}

async function testLoadEmployeeColumnsPopulatesFieldSchema() {
  resetEmployeeColumnsCache();

  const mockSchema = [
    { field_id: 'f_employee_id', field_order: '1', field_name: 'employee_id', field_label: 'ID', field_type: 'text', field_options: '', show_in_table: 'no', field_group: 'Test', editable_in_table: 'no', role: 'EMPLOYEE_ID' },
    { field_id: 'f_status', field_order: '2', field_name: 'employment_status', field_label: 'Статус', field_type: 'select', field_options: 'Працює|Звільнений', show_in_table: 'yes', field_group: 'Test', editable_in_table: 'no', role: 'STATUS' },
    { field_id: 'f_dept', field_order: '3', field_name: 'department', field_label: 'Підрозділ', field_type: 'text', field_options: '', show_in_table: 'no', field_group: 'Test', editable_in_table: 'no', role: '' }
  ];

  await loadEmployeeColumns(() => Promise.resolve(mockSchema));

  const fieldSchema = getCachedFieldSchema();
  if (!fieldSchema) throw new Error('Field schema should be populated');
  if (!Array.isArray(fieldSchema)) throw new Error('Field schema should be an array');
  if (fieldSchema.length !== 3) throw new Error(`Expected 3 entries, got ${fieldSchema.length}`);

  const statusField = fieldSchema.find(f => f.role === 'STATUS');
  if (!statusField) throw new Error('Should find field with role STATUS');
  if (statusField.field_id !== 'f_status') throw new Error('STATUS field_id should be f_status');
  if (statusField.field_name !== 'employment_status') throw new Error('STATUS field_name should be employment_status');
  if (statusField.field_options !== 'Працює|Звільнений') throw new Error('STATUS field_options mismatch');

  const deptField = fieldSchema.find(f => f.field_name === 'department');
  if (!deptField) throw new Error('Should find department field');
  if (deptField.role !== '') throw new Error('department should have empty role');

  resetEmployeeColumnsCache();
}

async function testResetCacheClearsFieldIdMap() {
  resetEmployeeColumnsCache();

  const mockSchema = [
    { field_id: 'f_test', field_order: '1', field_name: 'test_field', field_label: 'Test', field_type: 'text', field_options: '', show_in_table: 'no', field_group: 'Test', editable_in_table: 'no', role: '' }
  ];

  await loadEmployeeColumns(() => Promise.resolve(mockSchema));
  if (!getCachedFieldIdMap()) throw new Error('Field ID map should be populated');
  if (!getCachedFieldSchema()) throw new Error('Field schema should be populated');

  resetEmployeeColumnsCache();

  if (getCachedFieldIdMap() !== null) throw new Error('Field ID map should be null after reset');
  if (getCachedFieldSchema() !== null) throw new Error('Field schema should be null after reset');
}

async function testLoadEmployeeColumnsHandlesMissingFieldId() {
  resetEmployeeColumnsCache();

  // Schema without field_id (legacy format migration scenario)
  const mockSchema = [
    { field_id: '', field_order: '1', field_name: 'employee_id', field_label: 'ID', field_type: 'text', field_options: '', show_in_table: 'no', field_group: 'Test', editable_in_table: 'no', role: '' },
    { field_id: 'f_name', field_order: '2', field_name: 'name', field_label: 'Name', field_type: 'text', field_options: '', show_in_table: 'yes', field_group: 'Test', editable_in_table: 'yes', role: '' }
  ];

  const columns = await loadEmployeeColumns(() => Promise.resolve(mockSchema));
  if (!columns.includes('employee_id')) throw new Error('Should include employee_id');
  if (!columns.includes('name')) throw new Error('Should include name');

  const fieldIdMap = getCachedFieldIdMap();
  // Only f_name should be in the map (employee_id has empty field_id)
  if (fieldIdMap.size !== 1) throw new Error(`Expected 1 entry in field ID map, got ${fieldIdMap.size}`);
  if (fieldIdMap.get('f_name') !== 'name') throw new Error('f_name should map to name');

  resetEmployeeColumnsCache();
}

async function testFieldSchemaColumnsOrder() {
  const expected = [
    'field_id', 'field_order', 'field_name', 'field_label', 'field_type',
    'field_options', 'show_in_table', 'field_group', 'editable_in_table', 'role'
  ];
  if (FIELD_SCHEMA_COLUMNS.length !== expected.length) {
    throw new Error(`Expected ${expected.length} columns, got ${FIELD_SCHEMA_COLUMNS.length}`);
  }
  for (let i = 0; i < expected.length; i++) {
    if (FIELD_SCHEMA_COLUMNS[i] !== expected[i]) {
      throw new Error(`Column ${i}: expected ${expected[i]}, got ${FIELD_SCHEMA_COLUMNS[i]}`);
    }
  }
}

async function testCachingBehavior() {
  resetEmployeeColumnsCache();

  let callCount = 0;
  const mockLoader = () => {
    callCount++;
    return Promise.resolve([
      { field_id: 'f_test', field_order: '1', field_name: 'test_field', field_label: 'Test', field_type: 'text', field_options: '', show_in_table: 'no', field_group: 'Test', editable_in_table: 'no', role: '' }
    ]);
  };

  // First call should invoke the loader
  await loadEmployeeColumns(mockLoader);
  if (callCount !== 1) throw new Error(`Expected 1 call, got ${callCount}`);

  // Second call should use cache
  await loadEmployeeColumns(mockLoader);
  if (callCount !== 1) throw new Error(`Expected still 1 call after cache hit, got ${callCount}`);

  // After reset, should invoke loader again
  resetEmployeeColumnsCache();
  await loadEmployeeColumns(mockLoader);
  if (callCount !== 2) throw new Error(`Expected 2 calls after reset, got ${callCount}`);

  resetEmployeeColumnsCache();
}

// --- Main ---

async function runAllTests() {
  console.log('Schema tests (field_id and role columns)\n');

  await runTest('FIELD_SCHEMA_COLUMNS includes field_id and role', testFieldSchemaColumnsIncludesFieldIdAndRole);
  await runTest('FIELD_SCHEMA_COLUMNS has correct order', testFieldSchemaColumnsOrder);
  await runTest('loadEmployeeColumns populates field_id map', testLoadEmployeeColumnsPopulatesFieldIdMap);
  await runTest('loadEmployeeColumns populates field schema cache', testLoadEmployeeColumnsPopulatesFieldSchema);
  await runTest('resetEmployeeColumnsCache clears field_id map', testResetCacheClearsFieldIdMap);
  await runTest('loadEmployeeColumns handles missing field_id', testLoadEmployeeColumnsHandlesMissingFieldId);
  await runTest('Caching behavior works correctly', testCachingBehavior);

  console.log(`\nTests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);

  return testsFailed === 0;
}

runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
