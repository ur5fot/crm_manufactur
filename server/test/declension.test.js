/**
 * Unit tests for Ukrainian name declension module
 * Run with: node server/test/declension.test.js
 */

import { generateDeclinedNames, generateDeclinedGradePosition } from '../src/declension.js';

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    testsFailed++;
  }
}

// Test 1: Male name declension produces all 24 placeholders
async function testMaleNameAllPlaceholders() {
  const data = {
    last_name: 'Іванов',
    first_name: 'Петро',
    middle_name: 'Миколайович',
    gender: 'Чоловіча',
  };

  const result = await generateDeclinedNames(data);

  const suffixes = ['genitive', 'dative', 'accusative', 'vocative', 'locative', 'ablative'];
  const fields = ['last_name', 'first_name', 'middle_name', 'full_name'];

  for (const suffix of suffixes) {
    for (const field of fields) {
      const key = `${field}_${suffix}`;
      if (!(key in result)) {
        throw new Error(`Missing placeholder: ${key}`);
      }
      if (typeof result[key] !== 'string' || result[key].length === 0) {
        throw new Error(`Placeholder ${key} is empty or not a string`);
      }
    }
  }

  // Should have exactly 24 keys
  const keys = Object.keys(result);
  if (keys.length !== 24) {
    throw new Error(`Expected 24 placeholders, got ${keys.length}`);
  }
}

// Test 2: Male name genitive case is correct
async function testMaleNameGenitive() {
  const data = {
    last_name: 'Іванов',
    first_name: 'Петро',
    middle_name: 'Миколайович',
    gender: 'Чоловіча',
  };

  const result = await generateDeclinedNames(data);

  if (result.last_name_genitive !== 'Іванова') {
    throw new Error(`Expected "Іванова", got "${result.last_name_genitive}"`);
  }
  if (result.first_name_genitive !== 'Петра') {
    throw new Error(`Expected "Петра", got "${result.first_name_genitive}"`);
  }
  if (result.middle_name_genitive !== 'Миколайовича') {
    throw new Error(`Expected "Миколайовича", got "${result.middle_name_genitive}"`);
  }
  if (result.full_name_genitive !== 'Іванова Петра Миколайовича') {
    throw new Error(`Expected "Іванова Петра Миколайовича", got "${result.full_name_genitive}"`);
  }
}

// Test 3: Male name dative case is correct
async function testMaleNameDative() {
  const data = {
    last_name: 'Іванов',
    first_name: 'Петро',
    middle_name: 'Миколайович',
    gender: 'Чоловіча',
  };

  const result = await generateDeclinedNames(data);

  if (result.last_name_dative !== 'Іванову') {
    throw new Error(`Expected "Іванову", got "${result.last_name_dative}"`);
  }
  if (result.first_name_dative !== 'Петру') {
    throw new Error(`Expected "Петру", got "${result.first_name_dative}"`);
  }
}

// Test 4: Female name declension
async function testFemaleName() {
  const data = {
    last_name: 'Іванова',
    first_name: 'Марія',
    middle_name: 'Іванівна',
    gender: 'Жіноча',
  };

  const result = await generateDeclinedNames(data);

  if (result.last_name_genitive !== 'Іванової') {
    throw new Error(`Expected "Іванової", got "${result.last_name_genitive}"`);
  }
  if (result.first_name_genitive !== 'Марії') {
    throw new Error(`Expected "Марії", got "${result.first_name_genitive}"`);
  }
  if (result.middle_name_genitive !== 'Іванівни') {
    throw new Error(`Expected "Іванівни", got "${result.middle_name_genitive}"`);
  }
}

// Test 5: Empty name returns empty placeholders
async function testEmptyName() {
  const data = {
    last_name: '',
    first_name: '',
    middle_name: '',
  };

  const result = await generateDeclinedNames(data);

  const keys = Object.keys(result);
  if (keys.length !== 24) {
    throw new Error(`Expected 24 placeholders, got ${keys.length}`);
  }

  for (const key of keys) {
    if (result[key] !== '') {
      throw new Error(`Expected empty string for ${key}, got "${result[key]}"`);
    }
  }
}

// Test 6: Gender auto-detection when gender field is missing
async function testAutoDetectGender() {
  const data = {
    last_name: 'Шевченко',
    first_name: 'Тарас',
    middle_name: 'Григорович',
    // no gender field
  };

  const result = await generateDeclinedNames(data);

  // Should still produce all 24 keys
  const keys = Object.keys(result);
  if (keys.length !== 24) {
    throw new Error(`Expected 24 placeholders, got ${keys.length}`);
  }

  // Genitive of male name should be declined
  if (result.first_name_genitive !== 'Тараса') {
    throw new Error(`Expected "Тараса", got "${result.first_name_genitive}"`);
  }
}

// Test 7: Missing name parts handled gracefully
async function testPartialName() {
  const data = {
    last_name: 'Іванов',
    first_name: '',
    middle_name: '',
    gender: 'Чоловіча',
  };

  const result = await generateDeclinedNames(data);

  if (result.last_name_genitive !== 'Іванова') {
    throw new Error(`Expected "Іванова", got "${result.last_name_genitive}"`);
  }
  // full_name should only contain the last name
  if (result.full_name_genitive !== 'Іванова') {
    throw new Error(`Expected "Іванова", got "${result.full_name_genitive}"`);
  }
}

// Test 8: No data at all returns empty placeholders
async function testNoData() {
  const result = await generateDeclinedNames({});

  const keys = Object.keys(result);
  if (keys.length !== 24) {
    throw new Error(`Expected 24 placeholders, got ${keys.length}`);
  }

  for (const key of keys) {
    if (result[key] !== '') {
      throw new Error(`Expected empty string for ${key}, got "${result[key]}"`);
    }
  }
}

// Test 9: Indeclinable last_name only affects last_name, first_name and middle_name still declined
async function testIndeclinableLastName() {
  const data = {
    last_name: 'Дюма',
    first_name: 'Олександр',
    middle_name: 'Давидович',
    gender: 'Чоловіча',
    indeclinable_name: 'yes',
  };

  const result = await generateDeclinedNames(data);

  const suffixes = ['genitive', 'dative', 'accusative', 'vocative', 'locative', 'ablative'];
  for (const suffix of suffixes) {
    // Last name should stay nominative
    if (result[`last_name_${suffix}`] !== 'Дюма') {
      throw new Error(`Expected last_name_${suffix} "Дюма", got "${result[`last_name_${suffix}`]}"`);
    }
    // Middle name should be declined
    if (result[`middle_name_${suffix}`] === 'Давидович' && suffix !== 'vocative') {
      throw new Error(`Expected middle_name_${suffix} to be declined, got nominative "Давидович"`);
    }
  }
  // First name genitive should be declined
  if (result.first_name_genitive !== 'Олександра') {
    throw new Error(`Expected first_name_genitive "Олександра", got "${result.first_name_genitive}"`);
  }
  // full_name should mix: indeclinable last + declined first + declined middle
  if (!result.full_name_genitive.startsWith('Дюма ')) {
    throw new Error(`Expected full_name_genitive to start with "Дюма ", got "${result.full_name_genitive}"`);
  }
  if (result.full_name_genitive === 'Дюма Олександр Давидович') {
    throw new Error(`Expected full_name_genitive to have declined first/middle names`);
  }
}

// Test 10: Indeclinable first_name only affects first_name
async function testIndeclinableFirstName() {
  const data = {
    last_name: 'Іванов',
    first_name: 'Жан',
    middle_name: 'Миколайович',
    gender: 'Чоловіча',
    indeclinable_first_name: 'yes',
  };

  const result = await generateDeclinedNames(data);

  // First name should stay nominative
  const suffixes = ['genitive', 'dative', 'accusative', 'vocative', 'locative', 'ablative'];
  for (const suffix of suffixes) {
    if (result[`first_name_${suffix}`] !== 'Жан') {
      throw new Error(`Expected first_name_${suffix} "Жан", got "${result[`first_name_${suffix}`]}"`);
    }
  }
  // Last name should be declined
  if (result.last_name_genitive !== 'Іванова') {
    throw new Error(`Expected last_name_genitive "Іванова", got "${result.last_name_genitive}"`);
  }
  // Middle name should be declined
  if (result.middle_name_genitive !== 'Миколайовича') {
    throw new Error(`Expected middle_name_genitive "Миколайовича", got "${result.middle_name_genitive}"`);
  }
}

// Test 11: Both indeclinable flags set — last and first stay nominative, middle is declined
async function testBothIndeclinable() {
  const data = {
    last_name: 'Дюма',
    first_name: 'Жан',
    middle_name: 'Давидович',
    gender: 'Чоловіча',
    indeclinable_name: 'yes',
    indeclinable_first_name: 'yes',
  };

  const result = await generateDeclinedNames(data);

  // Test genitive case: middle_name should be declined, last and first stay nominative
  if (result.last_name_genitive !== 'Дюма') {
    throw new Error(`Expected last_name_genitive "Дюма", got "${result.last_name_genitive}"`);
  }
  if (result.first_name_genitive !== 'Жан') {
    throw new Error(`Expected first_name_genitive "Жан", got "${result.first_name_genitive}"`);
  }
  if (result.middle_name_genitive !== 'Давидовича') {
    throw new Error(`Expected middle_name_genitive "Давидовича", got "${result.middle_name_genitive}"`);
  }
  if (result.full_name_genitive !== 'Дюма Жан Давидовича') {
    throw new Error(`Expected full_name_genitive "Дюма Жан Давидовича", got "${result.full_name_genitive}"`);
  }

  // Test dative case: same pattern
  if (result.last_name_dative !== 'Дюма') {
    throw new Error(`Expected last_name_dative "Дюма", got "${result.last_name_dative}"`);
  }
  if (result.first_name_dative !== 'Жан') {
    throw new Error(`Expected first_name_dative "Жан", got "${result.first_name_dative}"`);
  }
  if (result.middle_name_dative !== 'Давидовичу') {
    throw new Error(`Expected middle_name_dative "Давидовичу", got "${result.middle_name_dative}"`);
  }
  if (result.full_name_dative !== 'Дюма Жан Давидовичу') {
    throw new Error(`Expected full_name_dative "Дюма Жан Давидовичу", got "${result.full_name_dative}"`);
  }
}

// Test 12: Grade/position declension produces all 12 placeholders with correct values
async function testGradePositionAllPlaceholders() {
  const data = {
    grade: 'командир роти',
    position: 'капітан',
    gender: 'Чоловіча',
  };

  const result = await generateDeclinedGradePosition(data);

  const suffixes = ['genitive', 'dative', 'accusative', 'vocative', 'locative', 'ablative'];
  const fields = ['grade', 'position'];

  for (const suffix of suffixes) {
    for (const field of fields) {
      const key = `${field}_${suffix}`;
      if (!(key in result)) {
        throw new Error(`Missing placeholder: ${key}`);
      }
      if (typeof result[key] !== 'string' || result[key].length === 0) {
        throw new Error(`Placeholder ${key} is empty or not a string`);
      }
    }
  }

  const keys = Object.keys(result);
  if (keys.length !== 12) {
    throw new Error(`Expected 12 placeholders, got ${keys.length}`);
  }
}

// Test 13: Grade/position genitive case values are correct
async function testGradePositionGenitive() {
  const data = {
    grade: 'командир роти',
    position: 'капітан',
    gender: 'Чоловіча',
  };

  const result = await generateDeclinedGradePosition(data);

  if (result.grade_genitive !== 'командира роти') {
    throw new Error(`Expected grade_genitive "командира роти", got "${result.grade_genitive}"`);
  }
  if (result.position_genitive !== 'капітана') {
    throw new Error(`Expected position_genitive "капітана", got "${result.position_genitive}"`);
  }
}

// Test 14: Grade/position dative case values are correct
async function testGradePositionDative() {
  const data = {
    grade: 'командир роти',
    position: 'капітан',
    gender: 'Чоловіча',
  };

  const result = await generateDeclinedGradePosition(data);

  if (result.grade_dative !== 'командиру роти') {
    throw new Error(`Expected grade_dative "командиру роти", got "${result.grade_dative}"`);
  }
  if (result.position_dative !== 'капітану') {
    throw new Error(`Expected position_dative "капітану", got "${result.position_dative}"`);
  }
}

// Test 15: Empty grade/position returns empty placeholders
async function testGradePositionEmpty() {
  const data = {
    grade: '',
    position: '',
  };

  const result = await generateDeclinedGradePosition(data);

  const keys = Object.keys(result);
  if (keys.length !== 12) {
    throw new Error(`Expected 12 placeholders, got ${keys.length}`);
  }

  for (const key of keys) {
    if (result[key] !== '') {
      throw new Error(`Expected empty string for ${key}, got "${result[key]}"`);
    }
  }
}

// Test 16: No grade/position data returns empty placeholders
async function testGradePositionNoData() {
  const result = await generateDeclinedGradePosition({});

  const keys = Object.keys(result);
  if (keys.length !== 12) {
    throw new Error(`Expected 12 placeholders, got ${keys.length}`);
  }

  for (const key of keys) {
    if (result[key] !== '') {
      throw new Error(`Expected empty string for ${key}, got "${result[key]}"`);
    }
  }
}

// Test 17: Indeclinable grade - grade stays nominative, position declined
async function testIndeclinableGrade() {
  const data = {
    grade: 'командир роти',
    position: 'капітан',
    gender: 'Чоловіча',
    indeclinable_grade: 'yes',
  };

  const result = await generateDeclinedGradePosition(data);

  const suffixes = ['genitive', 'dative', 'accusative', 'vocative', 'locative', 'ablative'];
  for (const suffix of suffixes) {
    if (result[`grade_${suffix}`] !== 'командир роти') {
      throw new Error(`Expected grade_${suffix} "командир роти", got "${result[`grade_${suffix}`]}"`);
    }
  }
  // Position should be declined
  if (result.position_genitive !== 'капітана') {
    throw new Error(`Expected position_genitive "капітана", got "${result.position_genitive}"`);
  }
}

// Test 18: Indeclinable position - position stays nominative, grade declined
async function testIndeclinablePosition() {
  const data = {
    grade: 'командир роти',
    position: 'капітан',
    gender: 'Чоловіча',
    indeclinable_position: 'yes',
  };

  const result = await generateDeclinedGradePosition(data);

  const suffixes = ['genitive', 'dative', 'accusative', 'vocative', 'locative', 'ablative'];
  for (const suffix of suffixes) {
    if (result[`position_${suffix}`] !== 'капітан') {
      throw new Error(`Expected position_${suffix} "капітан", got "${result[`position_${suffix}`]}"`);
    }
  }
  // Grade should be declined
  if (result.grade_genitive !== 'командира роти') {
    throw new Error(`Expected grade_genitive "командира роти", got "${result.grade_genitive}"`);
  }
}

// Test 19: Both grade and position indeclinable
async function testBothGradePositionIndeclinable() {
  const data = {
    grade: 'командир роти',
    position: 'капітан',
    gender: 'Чоловіча',
    indeclinable_grade: 'yes',
    indeclinable_position: 'yes',
  };

  const result = await generateDeclinedGradePosition(data);

  const suffixes = ['genitive', 'dative', 'accusative', 'vocative', 'locative', 'ablative'];
  for (const suffix of suffixes) {
    if (result[`grade_${suffix}`] !== 'командир роти') {
      throw new Error(`Expected grade_${suffix} "командир роти", got "${result[`grade_${suffix}`]}"`);
    }
    if (result[`position_${suffix}`] !== 'капітан') {
      throw new Error(`Expected position_${suffix} "капітан", got "${result[`position_${suffix}`]}"`);
    }
  }
}

// --- Schema-based tests (role-resolved field names) ---

// Mock schema with non-default field names to verify role-based resolution
const mockNameSchema = [
  { field_name: 'surname', role: 'LAST_NAME' },
  { field_name: 'given_name', role: 'FIRST_NAME' },
  { field_name: 'patronymic', role: 'MIDDLE_NAME' },
  { field_name: 'sex', role: 'GENDER' },
  { field_name: 'no_decline_surname', role: 'INDECL_NAME' },
  { field_name: 'no_decline_given', role: 'INDECL_FIRST' },
  { field_name: 'appointment', role: 'GRADE' },
  { field_name: 'rank', role: 'POSITION' },
  { field_name: 'no_decline_appointment', role: 'INDECL_GRADE' },
  { field_name: 'no_decline_rank', role: 'INDECL_POSITION' },
];

// Test 20: Schema-based name declension uses resolved field names for input and output
async function testSchemaBasedNameDeclension() {
  const data = {
    surname: 'Іванов',
    given_name: 'Петро',
    patronymic: 'Миколайович',
    sex: 'Чоловіча',
  };

  const result = await generateDeclinedNames(data, mockNameSchema);

  // Output keys should use resolved field names (surname, given_name, patronymic)
  if (result.surname_genitive !== 'Іванова') {
    throw new Error(`Expected surname_genitive "Іванова", got "${result.surname_genitive}"`);
  }
  if (result.given_name_genitive !== 'Петра') {
    throw new Error(`Expected given_name_genitive "Петра", got "${result.given_name_genitive}"`);
  }
  if (result.patronymic_genitive !== 'Миколайовича') {
    throw new Error(`Expected patronymic_genitive "Миколайовича", got "${result.patronymic_genitive}"`);
  }
  if (result.full_name_genitive !== 'Іванова Петра Миколайовича') {
    throw new Error(`Expected full_name_genitive "Іванова Петра Миколайовича", got "${result.full_name_genitive}"`);
  }

  // Should NOT have old hardcoded keys
  if ('last_name_genitive' in result) {
    throw new Error('Should not have hardcoded last_name_genitive key when schema provides different field name');
  }
}

// Test 21: Schema-based name declension produces correct number of placeholders
async function testSchemaBasedNamePlaceholderCount() {
  const data = {
    surname: 'Іванов',
    given_name: 'Петро',
    patronymic: 'Миколайович',
    sex: 'Чоловіча',
  };

  const result = await generateDeclinedNames(data, mockNameSchema);
  const keys = Object.keys(result);

  // 6 cases x 4 fields (surname, given_name, patronymic, full_name) = 24
  if (keys.length !== 24) {
    throw new Error(`Expected 24 placeholders, got ${keys.length}: ${keys.join(', ')}`);
  }
}

// Test 22: Schema-based indeclinable flags resolved via roles
async function testSchemaBasedIndeclinable() {
  const data = {
    surname: 'Дюма',
    given_name: 'Олександр',
    patronymic: 'Давидович',
    sex: 'Чоловіча',
    no_decline_surname: 'yes',
  };

  const result = await generateDeclinedNames(data, mockNameSchema);

  // Surname should stay nominative
  if (result.surname_genitive !== 'Дюма') {
    throw new Error(`Expected surname_genitive "Дюма", got "${result.surname_genitive}"`);
  }
  // Given name should be declined
  if (result.given_name_genitive !== 'Олександра') {
    throw new Error(`Expected given_name_genitive "Олександра", got "${result.given_name_genitive}"`);
  }
}

// Test 23: Schema-based grade/position declension
async function testSchemaBasedGradePosition() {
  const data = {
    appointment: 'командир роти',
    rank: 'капітан',
    sex: 'Чоловіча',
  };

  const result = await generateDeclinedGradePosition(data, mockNameSchema);

  // Output keys should use resolved field names
  if (result.appointment_genitive !== 'командира роти') {
    throw new Error(`Expected appointment_genitive "командира роти", got "${result.appointment_genitive}"`);
  }
  if (result.rank_genitive !== 'капітана') {
    throw new Error(`Expected rank_genitive "капітана", got "${result.rank_genitive}"`);
  }

  // Should NOT have old hardcoded keys
  if ('grade_genitive' in result) {
    throw new Error('Should not have hardcoded grade_genitive key when schema provides different field name');
  }
}

// Test 24: Schema-based grade/position placeholder count
async function testSchemaBasedGradePositionCount() {
  const data = {
    appointment: 'командир роти',
    rank: 'капітан',
    sex: 'Чоловіча',
  };

  const result = await generateDeclinedGradePosition(data, mockNameSchema);
  const keys = Object.keys(result);

  if (keys.length !== 12) {
    throw new Error(`Expected 12 placeholders, got ${keys.length}: ${keys.join(', ')}`);
  }
}

// Test 25: Schema-based indeclinable grade/position
async function testSchemaBasedIndeclinableGradePosition() {
  const data = {
    appointment: 'командир роти',
    rank: 'капітан',
    sex: 'Чоловіча',
    no_decline_appointment: 'yes',
  };

  const result = await generateDeclinedGradePosition(data, mockNameSchema);

  // Appointment should stay nominative
  if (result.appointment_genitive !== 'командир роти') {
    throw new Error(`Expected appointment_genitive "командир роти", got "${result.appointment_genitive}"`);
  }
  // Rank should be declined
  if (result.rank_genitive !== 'капітана') {
    throw new Error(`Expected rank_genitive "капітана", got "${result.rank_genitive}"`);
  }
}

// Test 26: Backward compatibility - no schema still works with hardcoded field names
async function testBackwardCompatNoSchema() {
  const data = {
    last_name: 'Іванов',
    first_name: 'Петро',
    middle_name: 'Миколайович',
    gender: 'Чоловіча',
  };

  // Call without schema parameter (backward compat)
  const result = await generateDeclinedNames(data);

  // Should use hardcoded field names in output keys
  if (result.last_name_genitive !== 'Іванова') {
    throw new Error(`Expected last_name_genitive "Іванова", got "${result.last_name_genitive}"`);
  }
  if (result.first_name_genitive !== 'Петра') {
    throw new Error(`Expected first_name_genitive "Петра", got "${result.first_name_genitive}"`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('Starting declension module tests...\n');

  await runTest('Male name: all 24 placeholders present', testMaleNameAllPlaceholders);
  await runTest('Male name: genitive case correct', testMaleNameGenitive);
  await runTest('Male name: dative case correct', testMaleNameDative);
  await runTest('Female name: genitive case correct', testFemaleName);
  await runTest('Empty name: returns empty placeholders', testEmptyName);
  await runTest('Auto-detect gender when not provided', testAutoDetectGender);
  await runTest('Partial name: only last_name provided', testPartialName);
  await runTest('No data: returns empty placeholders', testNoData);
  await runTest('Indeclinable last_name: only last_name stays nominative', testIndeclinableLastName);
  await runTest('Indeclinable first_name: only first_name stays nominative', testIndeclinableFirstName);
  await runTest('Both indeclinable: last and first stay nominative, middle is declined', testBothIndeclinable);

  // Grade/position declension tests
  await runTest('Grade/position: all 12 placeholders present with values', testGradePositionAllPlaceholders);
  await runTest('Grade/position: genitive case correct', testGradePositionGenitive);
  await runTest('Grade/position: dative case correct', testGradePositionDative);
  await runTest('Grade/position: empty values return empty placeholders', testGradePositionEmpty);
  await runTest('Grade/position: no data returns empty placeholders', testGradePositionNoData);
  await runTest('Grade/position: indeclinable grade stays nominative', testIndeclinableGrade);
  await runTest('Grade/position: indeclinable position stays nominative', testIndeclinablePosition);
  await runTest('Grade/position: both indeclinable stay nominative', testBothGradePositionIndeclinable);

  // Schema-based tests
  console.log('\n--- Schema-based (role-resolved field names) ---');
  await runTest('Schema: name declension uses resolved field names', testSchemaBasedNameDeclension);
  await runTest('Schema: name declension produces 24 placeholders', testSchemaBasedNamePlaceholderCount);
  await runTest('Schema: indeclinable flags resolved via roles', testSchemaBasedIndeclinable);
  await runTest('Schema: grade/position uses resolved field names', testSchemaBasedGradePosition);
  await runTest('Schema: grade/position produces 12 placeholders', testSchemaBasedGradePositionCount);
  await runTest('Schema: indeclinable grade resolved via roles', testSchemaBasedIndeclinableGradePosition);
  await runTest('Backward compat: no schema uses hardcoded fields', testBackwardCompatNoSchema);

  console.log('\n' + '='.repeat(50));
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log('='.repeat(50));

  return testsFailed === 0;
}

runAllTests()
  .then(success => {
    if (success) {
      console.log('\n✅ All declension tests passed!');
      process.exit(0);
    } else {
      console.error('\n❌ Some tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
