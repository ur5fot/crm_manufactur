/**
 * Unit tests for field-utils.js — role-based field resolution utilities
 * Run with: node server/test/field-utils.test.js
 */

import {
  ROLES,
  getFieldByRole,
  getFieldNameByRole,
  getFieldIdByRole,
  buildFieldIdToNameMap,
  buildFieldNameToIdMap,
  buildNameFields,
  buildStatusFields,
  buildEmployeeName,
} from '../src/field-utils.js';

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

// --- Test data ---

function createTestSchema() {
  return [
    { field_id: 'f_photo', field_name: 'photo', field_label: 'Фото', field_type: 'photo', field_options: '', field_group: 'Особисті дані', role: 'PHOTO' },
    { field_id: 'f_employee_id', field_name: 'employee_id', field_label: 'ID', field_type: 'text', field_options: '', field_group: 'Особисті дані', role: 'EMPLOYEE_ID' },
    { field_id: 'f_last_name', field_name: 'last_name', field_label: 'Прізвище', field_type: 'text', field_options: '', field_group: 'Особисті дані', role: 'LAST_NAME' },
    { field_id: 'f_first_name', field_name: 'first_name', field_label: "Ім'я", field_type: 'text', field_options: '', field_group: 'Особисті дані', role: 'FIRST_NAME' },
    { field_id: 'f_middle_name', field_name: 'middle_name', field_label: 'По батькові', field_type: 'text', field_options: '', field_group: 'Особисті дані', role: 'MIDDLE_NAME' },
    { field_id: 'f_birth_date', field_name: 'birth_date', field_label: 'Дата народження', field_type: 'date', field_options: '', field_group: 'Особисті дані', role: 'BIRTH_DATE' },
    { field_id: 'f_gender', field_name: 'gender', field_label: 'Стать', field_type: 'select', field_options: 'Чоловіча|Жіноча', field_group: 'Особисті дані', role: 'GENDER' },
    { field_id: 'f_employment_status', field_name: 'employment_status', field_label: 'Статус роботи', field_type: 'select', field_options: 'Працює|Звільнений', field_group: 'Особисті дані', role: 'STATUS' },
    { field_id: 'f_status_start_date', field_name: 'status_start_date', field_label: 'Дата початку статусу', field_type: 'date', field_options: '', field_group: 'Особисті дані', role: 'STATUS_START' },
    { field_id: 'f_status_end_date', field_name: 'status_end_date', field_label: 'Дата закінчення статусу', field_type: 'date', field_options: '', field_group: 'Особисті дані', role: 'STATUS_END' },
    { field_id: 'f_grade', field_name: 'grade', field_label: 'Посада', field_type: 'text', field_options: '', field_group: 'Посада', role: 'GRADE' },
    { field_id: 'f_position', field_name: 'position', field_label: 'Звання', field_type: 'text', field_options: '', field_group: 'Посада', role: 'POSITION' },
    { field_id: 'f_indeclinable_name', field_name: 'indeclinable_name', field_label: 'Невідмінюване прізвище', field_type: 'text', field_options: '', field_group: 'Особисті дані', role: 'INDECL_NAME' },
    { field_id: 'f_indeclinable_first_name', field_name: 'indeclinable_first_name', field_label: 'Невідмінюване ім\'я', field_type: 'text', field_options: '', field_group: 'Особисті дані', role: 'INDECL_FIRST' },
    { field_id: 'f_indeclinable_grade', field_name: 'indeclinable_grade', field_label: 'Невідмінювана посада', field_type: 'text', field_options: '', field_group: 'Посада', role: 'INDECL_GRADE' },
    { field_id: 'f_indeclinable_position', field_name: 'indeclinable_position', field_label: 'Невідмінюване звання', field_type: 'text', field_options: '', field_group: 'Посада', role: 'INDECL_POSITION' },
    { field_id: 'f_department', field_name: 'department', field_label: 'Підрозділ', field_type: 'text', field_options: '', field_group: 'Посада', role: '' },
    { field_id: 'f_notes', field_name: 'notes', field_label: 'Примітки', field_type: 'textarea', field_options: '', field_group: 'Інше', role: '' },
  ];
}

// --- Tests ---

async function testROLESConstant() {
  if (typeof ROLES !== 'object') throw new Error('ROLES should be an object');
  const expectedRoles = [
    'PHOTO', 'EMPLOYEE_ID', 'LAST_NAME', 'FIRST_NAME', 'MIDDLE_NAME',
    'BIRTH_DATE', 'GENDER', 'STATUS', 'STATUS_START', 'STATUS_END',
    'GRADE', 'POSITION', 'INDECL_NAME', 'INDECL_FIRST', 'INDECL_GRADE', 'INDECL_POSITION'
  ];
  for (const role of expectedRoles) {
    if (ROLES[role] !== role) {
      throw new Error(`ROLES.${role} should equal "${role}", got "${ROLES[role]}"`);
    }
  }
  if (Object.keys(ROLES).length !== expectedRoles.length) {
    throw new Error(`Expected ${expectedRoles.length} roles, got ${Object.keys(ROLES).length}`);
  }
}

async function testGetFieldByRoleValid() {
  const schema = createTestSchema();
  const field = getFieldByRole(schema, 'STATUS');
  if (!field) throw new Error('Should find STATUS field');
  if (field.field_name !== 'employment_status') throw new Error(`Expected employment_status, got ${field.field_name}`);
  if (field.field_id !== 'f_employment_status') throw new Error(`Expected f_employment_status, got ${field.field_id}`);
}

async function testGetFieldByRoleInvalid() {
  const schema = createTestSchema();
  const field = getFieldByRole(schema, 'NONEXISTENT');
  if (field !== null) throw new Error('Should return null for invalid role');
}

async function testGetFieldByRoleNullSchema() {
  const field = getFieldByRole(null, 'STATUS');
  if (field !== null) throw new Error('Should return null for null schema');
}

async function testGetFieldByRoleEmptyRole() {
  const schema = createTestSchema();
  const field = getFieldByRole(schema, '');
  // Empty string role should match fields with empty role — but we pass empty string which matches department and notes
  // Actually getFieldByRole checks !role which is true for empty string, so returns null
  if (field !== null) throw new Error('Should return null for empty role');
}

async function testGetFieldByRoleNullRole() {
  const schema = createTestSchema();
  const field = getFieldByRole(schema, null);
  if (field !== null) throw new Error('Should return null for null role');
}

async function testGetFieldNameByRoleValid() {
  const schema = createTestSchema();
  const name = getFieldNameByRole(schema, 'LAST_NAME');
  if (name !== 'last_name') throw new Error(`Expected last_name, got ${name}`);
}

async function testGetFieldNameByRoleInvalid() {
  const schema = createTestSchema();
  const name = getFieldNameByRole(schema, 'NONEXISTENT');
  if (name !== null) throw new Error('Should return null for invalid role');
}

async function testGetFieldIdByRoleValid() {
  const schema = createTestSchema();
  const id = getFieldIdByRole(schema, 'BIRTH_DATE');
  if (id !== 'f_birth_date') throw new Error(`Expected f_birth_date, got ${id}`);
}

async function testGetFieldIdByRoleInvalid() {
  const schema = createTestSchema();
  const id = getFieldIdByRole(schema, 'NONEXISTENT');
  if (id !== null) throw new Error('Should return null for invalid role');
}

async function testBuildFieldIdToNameMap() {
  const schema = createTestSchema();
  const map = buildFieldIdToNameMap(schema);
  if (!(map instanceof Map)) throw new Error('Should return a Map');
  if (map.size !== 18) throw new Error(`Expected 18 entries, got ${map.size}`);
  if (map.get('f_last_name') !== 'last_name') throw new Error('f_last_name should map to last_name');
  if (map.get('f_employment_status') !== 'employment_status') throw new Error('f_employment_status should map to employment_status');
  if (map.get('f_department') !== 'department') throw new Error('f_department should map to department');
}

async function testBuildFieldIdToNameMapNull() {
  const map = buildFieldIdToNameMap(null);
  if (!(map instanceof Map)) throw new Error('Should return a Map even for null');
  if (map.size !== 0) throw new Error('Should return empty Map for null');
}

async function testBuildFieldIdToNameMapSkipsEmptyFieldId() {
  const schema = [
    { field_id: '', field_name: 'test', field_label: 'Test', field_type: 'text', role: '' },
    { field_id: 'f_ok', field_name: 'ok_field', field_label: 'OK', field_type: 'text', role: '' },
  ];
  const map = buildFieldIdToNameMap(schema);
  if (map.size !== 1) throw new Error(`Expected 1 entry, got ${map.size}`);
  if (map.get('f_ok') !== 'ok_field') throw new Error('f_ok should map to ok_field');
}

async function testBuildFieldNameToIdMap() {
  const schema = createTestSchema();
  const map = buildFieldNameToIdMap(schema);
  if (!(map instanceof Map)) throw new Error('Should return a Map');
  if (map.size !== 18) throw new Error(`Expected 18 entries, got ${map.size}`);
  if (map.get('last_name') !== 'f_last_name') throw new Error('last_name should map to f_last_name');
  if (map.get('employment_status') !== 'f_employment_status') throw new Error('employment_status should map to f_employment_status');
}

async function testBuildFieldNameToIdMapNull() {
  const map = buildFieldNameToIdMap(null);
  if (!(map instanceof Map)) throw new Error('Should return a Map even for null');
  if (map.size !== 0) throw new Error('Should return empty Map for null');
}

async function testBuildNameFields() {
  const schema = createTestSchema();
  const names = buildNameFields(schema);
  if (names.lastName !== 'last_name') throw new Error(`Expected last_name, got ${names.lastName}`);
  if (names.firstName !== 'first_name') throw new Error(`Expected first_name, got ${names.firstName}`);
  if (names.middleName !== 'middle_name') throw new Error(`Expected middle_name, got ${names.middleName}`);
}

async function testBuildNameFieldsWithRenamedFields() {
  // Simulate fields that have been renamed
  const schema = [
    { field_id: 'f_last_name', field_name: 'surname', field_label: 'Прізвище', field_type: 'text', role: 'LAST_NAME' },
    { field_id: 'f_first_name', field_name: 'given_name', field_label: "Ім'я", field_type: 'text', role: 'FIRST_NAME' },
    { field_id: 'f_middle_name', field_name: 'patronymic', field_label: 'По батькові', field_type: 'text', role: 'MIDDLE_NAME' },
  ];
  const names = buildNameFields(schema);
  if (names.lastName !== 'surname') throw new Error(`Expected surname, got ${names.lastName}`);
  if (names.firstName !== 'given_name') throw new Error(`Expected given_name, got ${names.firstName}`);
  if (names.middleName !== 'patronymic') throw new Error(`Expected patronymic, got ${names.middleName}`);
}

async function testBuildNameFieldsMissingRoles() {
  // Schema without name roles
  const schema = [
    { field_id: 'f_dept', field_name: 'department', field_label: 'Dept', field_type: 'text', role: '' },
  ];
  const names = buildNameFields(schema);
  if (names.lastName !== null) throw new Error(`Expected null, got ${names.lastName}`);
  if (names.firstName !== null) throw new Error(`Expected null, got ${names.firstName}`);
  if (names.middleName !== null) throw new Error(`Expected null, got ${names.middleName}`);
}

async function testBuildStatusFields() {
  const schema = createTestSchema();
  const status = buildStatusFields(schema);
  if (status.status !== 'employment_status') throw new Error(`Expected employment_status, got ${status.status}`);
  if (status.startDate !== 'status_start_date') throw new Error(`Expected status_start_date, got ${status.startDate}`);
  if (status.endDate !== 'status_end_date') throw new Error(`Expected status_end_date, got ${status.endDate}`);
}

async function testBuildStatusFieldsMissing() {
  const schema = [
    { field_id: 'f_dept', field_name: 'department', field_label: 'Dept', field_type: 'text', role: '' },
  ];
  const status = buildStatusFields(schema);
  if (status.status !== null) throw new Error(`Expected null, got ${status.status}`);
  if (status.startDate !== null) throw new Error(`Expected null, got ${status.startDate}`);
  if (status.endDate !== null) throw new Error(`Expected null, got ${status.endDate}`);
}

async function testBuildEmployeeName() {
  const schema = createTestSchema();
  const emp = { last_name: 'Петренко', first_name: 'Іван', middle_name: 'Миколайович' };
  const name = buildEmployeeName(emp, schema);
  if (name !== 'Петренко Іван Миколайович') throw new Error(`Expected "Петренко Іван Миколайович", got "${name}"`);
}

async function testBuildEmployeeNamePartialFields() {
  const schema = createTestSchema();
  const emp = { last_name: 'Петренко', first_name: '', middle_name: '' };
  const name = buildEmployeeName(emp, schema);
  if (name !== 'Петренко') throw new Error(`Expected "Петренко", got "${name}"`);
}

async function testBuildEmployeeNameEmptyFields() {
  const schema = createTestSchema();
  const emp = { last_name: '', first_name: '', middle_name: '' };
  const name = buildEmployeeName(emp, schema);
  if (name !== '') throw new Error(`Expected empty string, got "${name}"`);
}

async function testBuildEmployeeNameWithRenamedFields() {
  const schema = [
    { field_id: 'f_last_name', field_name: 'surname', field_label: 'Прізвище', field_type: 'text', role: 'LAST_NAME' },
    { field_id: 'f_first_name', field_name: 'given_name', field_label: "Ім'я", field_type: 'text', role: 'FIRST_NAME' },
    { field_id: 'f_middle_name', field_name: 'patronymic', field_label: 'По батькові', field_type: 'text', role: 'MIDDLE_NAME' },
  ];
  const emp = { surname: 'Шевченко', given_name: 'Тарас', patronymic: 'Григорович' };
  const name = buildEmployeeName(emp, schema);
  if (name !== 'Шевченко Тарас Григорович') throw new Error(`Expected "Шевченко Тарас Григорович", got "${name}"`);
}

async function testAllRolesResolvable() {
  const schema = createTestSchema();
  const allRoles = Object.values(ROLES);
  for (const role of allRoles) {
    const field = getFieldByRole(schema, role);
    if (!field) throw new Error(`Role ${role} should resolve to a field in test schema`);
    if (!field.field_id) throw new Error(`Role ${role} field should have field_id`);
    if (!field.field_name) throw new Error(`Role ${role} field should have field_name`);
  }
}

async function testEmptySchemaGraceful() {
  const schema = [];
  if (getFieldByRole(schema, 'STATUS') !== null) throw new Error('Should return null for empty schema');
  if (getFieldNameByRole(schema, 'STATUS') !== null) throw new Error('Should return null name for empty schema');
  if (getFieldIdByRole(schema, 'STATUS') !== null) throw new Error('Should return null id for empty schema');
  const idMap = buildFieldIdToNameMap(schema);
  if (idMap.size !== 0) throw new Error('Should return empty map for empty schema');
  const nameMap = buildFieldNameToIdMap(schema);
  if (nameMap.size !== 0) throw new Error('Should return empty map for empty schema');
  const names = buildNameFields(schema);
  if (names.lastName !== null) throw new Error('Should return null lastName for empty schema');
  const status = buildStatusFields(schema);
  if (status.status !== null) throw new Error('Should return null status for empty schema');
  const empName = buildEmployeeName({}, schema);
  if (empName !== '') throw new Error('Should return empty string for empty schema');
}

// --- Main ---

async function runAllTests() {
  console.log('Field utils tests (role-based field resolution)\n');

  await runTest('ROLES constant has all 16 roles', testROLESConstant);
  await runTest('getFieldByRole with valid role', testGetFieldByRoleValid);
  await runTest('getFieldByRole with invalid role', testGetFieldByRoleInvalid);
  await runTest('getFieldByRole with null schema', testGetFieldByRoleNullSchema);
  await runTest('getFieldByRole with empty role', testGetFieldByRoleEmptyRole);
  await runTest('getFieldByRole with null role', testGetFieldByRoleNullRole);
  await runTest('getFieldNameByRole with valid role', testGetFieldNameByRoleValid);
  await runTest('getFieldNameByRole with invalid role', testGetFieldNameByRoleInvalid);
  await runTest('getFieldIdByRole with valid role', testGetFieldIdByRoleValid);
  await runTest('getFieldIdByRole with invalid role', testGetFieldIdByRoleInvalid);
  await runTest('buildFieldIdToNameMap correctness', testBuildFieldIdToNameMap);
  await runTest('buildFieldIdToNameMap with null', testBuildFieldIdToNameMapNull);
  await runTest('buildFieldIdToNameMap skips empty field_id', testBuildFieldIdToNameMapSkipsEmptyFieldId);
  await runTest('buildFieldNameToIdMap correctness', testBuildFieldNameToIdMap);
  await runTest('buildFieldNameToIdMap with null', testBuildFieldNameToIdMapNull);
  await runTest('buildNameFields returns correct field names', testBuildNameFields);
  await runTest('buildNameFields with renamed fields', testBuildNameFieldsWithRenamedFields);
  await runTest('buildNameFields with missing roles', testBuildNameFieldsMissingRoles);
  await runTest('buildStatusFields returns correct field names', testBuildStatusFields);
  await runTest('buildStatusFields with missing roles', testBuildStatusFieldsMissing);
  await runTest('buildEmployeeName full name', testBuildEmployeeName);
  await runTest('buildEmployeeName partial fields', testBuildEmployeeNamePartialFields);
  await runTest('buildEmployeeName empty fields', testBuildEmployeeNameEmptyFields);
  await runTest('buildEmployeeName with renamed fields', testBuildEmployeeNameWithRenamedFields);
  await runTest('All 16 roles resolvable in test schema', testAllRolesResolvable);
  await runTest('Empty schema handled gracefully', testEmptySchemaGraceful);

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
