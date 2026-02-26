/**
 * Unit tests for quantity-placeholders.js — buildQuantityPlaceholders function
 * Run with: node server/test/quantity-placeholders.test.js
 */

import { buildQuantityPlaceholders } from '../src/quantity-placeholders.js';

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

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, msg) {
  const actualStr = JSON.stringify(actual, Object.keys(actual).sort());
  const expectedStr = JSON.stringify(expected, Object.keys(expected).sort());
  if (actualStr !== expectedStr) {
    throw new Error(`${msg || 'Assertion failed'}:\n  expected: ${expectedStr}\n  got:      ${actualStr}`);
  }
}

// --- Tests ---

async function testEmptySchema() {
  const result = buildQuantityPlaceholders([], [{ employee_id: '1' }]);
  assertDeepEqual(result, {}, 'Empty schema should return empty object');
}

async function testSelectFieldWithOptions() {
  const schema = [
    {
      field_id: 'f_gender',
      field_name: 'gender',
      field_type: 'select',
      field_options: 'Чоловіча|Жіноча',
    },
  ];
  const employees = [
    { employee_id: '1', gender: 'Чоловіча' },
    { employee_id: '2', gender: 'Чоловіча' },
    { employee_id: '3', gender: 'Жіноча' },
  ];

  const result = buildQuantityPlaceholders(schema, employees);

  assertEqual(result['f_gender_quantity'], '3', 'Total quantity');
  assertEqual(result['f_gender_option1_quantity'], '2', 'Option 1 (Чоловіча) count');
  assertEqual(result['f_gender_option2_quantity'], '1', 'Option 2 (Жіноча) count');
  assertEqual(Object.keys(result).length, 3, 'Should have exactly 3 keys');
}

async function testNonSelectFieldIgnored() {
  const schema = [
    {
      field_id: 'f_last_name',
      field_name: 'last_name',
      field_type: 'text',
      field_options: '',
    },
    {
      field_id: 'f_birth_date',
      field_name: 'birth_date',
      field_type: 'date',
      field_options: '',
    },
  ];
  const employees = [{ employee_id: '1', last_name: 'Тест' }];

  const result = buildQuantityPlaceholders(schema, employees);
  assertDeepEqual(result, {}, 'Non-select fields should be ignored');
}

async function testEmptyFieldOptions() {
  const schema = [
    {
      field_id: 'f_category',
      field_name: 'category',
      field_type: 'select',
      field_options: '',
    },
  ];
  const employees = [
    { employee_id: '1', category: 'A' },
    { employee_id: '2', category: 'B' },
  ];

  const result = buildQuantityPlaceholders(schema, employees);
  assertEqual(result['f_category_quantity'], '2', 'Total quantity with empty options');
  assertEqual(Object.keys(result).length, 1, 'Only total key, no option keys');
}

async function testEmployeeWithEmptyValue() {
  const schema = [
    {
      field_id: 'f_gender',
      field_name: 'gender',
      field_type: 'select',
      field_options: 'Чоловіча|Жіноча',
    },
  ];
  const employees = [
    { employee_id: '1', gender: 'Чоловіча' },
    { employee_id: '2', gender: '' },
    { employee_id: '3', gender: 'Жіноча' },
  ];

  const result = buildQuantityPlaceholders(schema, employees);
  assertEqual(result['f_gender_quantity'], '3', 'Total includes all employees');
  assertEqual(result['f_gender_option1_quantity'], '1', 'Empty value not counted for Чоловіча');
  assertEqual(result['f_gender_option2_quantity'], '1', 'Empty value not counted for Жіноча');
}

async function testMultipleSelectFields() {
  const schema = [
    {
      field_id: 'f_gender',
      field_name: 'gender',
      field_type: 'select',
      field_options: 'Чоловіча|Жіноча',
    },
    {
      field_id: 'f_status',
      field_name: 'employment_status',
      field_type: 'select',
      field_options: 'Працює|Звільнений|Відпустка',
    },
  ];
  const employees = [
    { employee_id: '1', gender: 'Чоловіча', employment_status: 'Працює' },
    { employee_id: '2', gender: 'Жіноча', employment_status: 'Працює' },
  ];

  const result = buildQuantityPlaceholders(schema, employees);

  // Gender
  assertEqual(result['f_gender_quantity'], '2', 'Gender total');
  assertEqual(result['f_gender_option1_quantity'], '1', 'Gender option1');
  assertEqual(result['f_gender_option2_quantity'], '1', 'Gender option2');

  // Status
  assertEqual(result['f_status_quantity'], '2', 'Status total');
  assertEqual(result['f_status_option1_quantity'], '2', 'Status Працює');
  assertEqual(result['f_status_option2_quantity'], '0', 'Status Звільнений');
  assertEqual(result['f_status_option3_quantity'], '0', 'Status Відпустка');

  assertEqual(Object.keys(result).length, 7, 'Total key count');
}

async function testFieldWithoutFieldId() {
  const schema = [
    {
      field_id: '',
      field_name: 'legacy',
      field_type: 'select',
      field_options: 'A|B',
    },
  ];
  const employees = [{ employee_id: '1', legacy: 'A' }];

  const result = buildQuantityPlaceholders(schema, employees);
  assertDeepEqual(result, {}, 'Field without field_id should be skipped');
}

async function testZeroEmployees() {
  const schema = [
    {
      field_id: 'f_gender',
      field_name: 'gender',
      field_type: 'select',
      field_options: 'Чоловіча|Жіноча',
    },
  ];

  const result = buildQuantityPlaceholders(schema, []);
  assertEqual(result['f_gender_quantity'], '0', 'Zero employees total');
  assertEqual(result['f_gender_option1_quantity'], '0', 'Zero for option1');
  assertEqual(result['f_gender_option2_quantity'], '0', 'Zero for option2');
}

// --- present_quantity / absent_quantity tests ---

async function testPresentAbsentQuantity() {
  const schema = [
    {
      field_id: 'f_status',
      field_name: 'employment_status',
      field_type: 'select',
      field_options: 'Працює|Звільнений|Відпустка',
      role: 'STATUS',
    },
  ];
  const employees = [
    { employee_id: '1', employment_status: 'Працює' },
    { employee_id: '2', employment_status: 'Працює' },
    { employee_id: '3', employment_status: 'Працює' },
    { employee_id: '4', employment_status: 'Звільнений' },
    { employee_id: '5', employment_status: 'Відпустка' },
  ];

  const result = buildQuantityPlaceholders(schema, employees);
  assertEqual(result['present_quantity'], '3', 'present_quantity = 3 (Працює)');
  assertEqual(result['absent_quantity'], '1', 'absent_quantity = 1 (Відпустка, not Звільнений)');
}

async function testAbsentExcludesEmptyStatus() {
  const schema = [
    {
      field_id: 'f_status',
      field_name: 'employment_status',
      field_type: 'select',
      field_options: 'Працює|Звільнений|Відпустка|Лікарняний',
      role: 'STATUS',
    },
  ];
  const employees = [
    { employee_id: '1', employment_status: 'Працює' },
    { employee_id: '2', employment_status: '' },
    { employee_id: '3', employment_status: 'Лікарняний' },
  ];

  const result = buildQuantityPlaceholders(schema, employees);
  assertEqual(result['present_quantity'], '1', 'present = 1');
  assertEqual(result['absent_quantity'], '1', 'absent = 1 (empty not counted)');
}

async function testNoStatusRoleNoPresentAbsent() {
  const schema = [
    {
      field_id: 'f_gender',
      field_name: 'gender',
      field_type: 'select',
      field_options: 'Чоловіча|Жіноча',
    },
  ];
  const employees = [
    { employee_id: '1', gender: 'Чоловіча' },
  ];

  const result = buildQuantityPlaceholders(schema, employees);
  assertEqual(result['present_quantity'], undefined, 'present_quantity absent without STATUS role');
  assertEqual(result['absent_quantity'], undefined, 'absent_quantity absent without STATUS role');
}

// --- fit_status_present tests ---

async function testFitStatusPresentQuantity() {
  const schema = [
    {
      field_id: 'f_status',
      field_name: 'employment_status',
      field_type: 'select',
      field_options: 'Працює|Звільнений|Відпустка',
      role: 'STATUS',
    },
    {
      field_id: 'f_fit_status',
      field_name: 'fit_status',
      field_type: 'select',
      field_options: 'Придатний|Не придатний|Обмежено придатний',
    },
  ];
  const employees = [
    { employee_id: '1', employment_status: 'Працює', fit_status: 'Придатний' },
    { employee_id: '2', employment_status: 'Працює', fit_status: 'Придатний' },
    { employee_id: '3', employment_status: 'Працює', fit_status: 'Не придатний' },
    { employee_id: '4', employment_status: 'Відпустка', fit_status: 'Придатний' },
  ];

  const result = buildQuantityPlaceholders(schema, employees);
  assertEqual(result['f_fit_status_present_quantity'], '3', 'fit_status_present total = 3 (Працює)');
  assertEqual(result['f_fit_status_present_option1_quantity'], '2', 'Придатний among present');
  assertEqual(result['f_fit_status_present_option2_quantity'], '1', 'Не придатний among present');
  assertEqual(result['f_fit_status_present_option3_quantity'], '0', 'Обмежено придатний among present');
}

async function testFitStatusPresentWithoutStatusRole() {
  const schema = [
    {
      field_id: 'f_gender',
      field_name: 'gender',
      field_type: 'select',
      field_options: 'Чоловіча|Жіноча',
    },
    {
      field_id: 'f_fit_status',
      field_name: 'fit_status',
      field_type: 'select',
      field_options: 'Придатний|Не придатний',
    },
  ];
  const employees = [
    { employee_id: '1', gender: 'Чоловіча', fit_status: 'Придатний' },
  ];

  const result = buildQuantityPlaceholders(schema, employees);
  assertEqual(result['f_fit_status_present_quantity'], undefined, 'No present keys without STATUS role');
  assertEqual(result['f_fit_status_present_option1_quantity'], undefined, 'No present option keys without STATUS role');
}

// --- Run all tests ---

async function runAllTests() {
  console.log('Starting quantity-placeholders tests...\n');

  await runTest('Empty schema returns empty object', testEmptySchema);
  await runTest('Select field with options counts correctly', testSelectFieldWithOptions);
  await runTest('Non-select field types are ignored', testNonSelectFieldIgnored);
  await runTest('Empty field_options produces only total key', testEmptyFieldOptions);
  await runTest('Employee with empty value not counted in options', testEmployeeWithEmptyValue);
  await runTest('Multiple select fields all produce placeholders', testMultipleSelectFields);
  await runTest('Field without field_id is skipped', testFieldWithoutFieldId);
  await runTest('Zero employees produces zero counts', testZeroEmployees);
  await runTest('present_quantity and absent_quantity with STATUS role', testPresentAbsentQuantity);
  await runTest('absent_quantity excludes empty status values', testAbsentExcludesEmptyStatus);
  await runTest('No STATUS role means no present/absent keys', testNoStatusRoleNoPresentAbsent);
  await runTest('fit_status_present placeholders count among present employees', testFitStatusPresentQuantity);
  await runTest('No STATUS role means no fit_status_present keys', testFitStatusPresentWithoutStatusRole);

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
