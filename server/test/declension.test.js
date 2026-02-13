/**
 * Unit tests for Ukrainian name declension module
 * Run with: node server/test/declension.test.js
 */

import { generateDeclinedNames } from '../src/declension.js';

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

// Test 11: Both indeclinable flags set — all names stay nominative
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

  const suffixes = ['genitive', 'dative', 'accusative', 'vocative', 'locative', 'ablative'];
  for (const suffix of suffixes) {
    if (result[`last_name_${suffix}`] !== 'Дюма') {
      throw new Error(`Expected last_name_${suffix} "Дюма", got "${result[`last_name_${suffix}`]}"`);
    }
    if (result[`first_name_${suffix}`] !== 'Жан') {
      throw new Error(`Expected first_name_${suffix} "Жан", got "${result[`first_name_${suffix}`]}"`);
    }
    if (result[`middle_name_${suffix}`] !== 'Давидович') {
      throw new Error(`Expected middle_name_${suffix} "Давидович", got "${result[`middle_name_${suffix}`]}"`);
    }
    if (result[`full_name_${suffix}`] !== 'Дюма Жан Давидович') {
      throw new Error(`Expected full_name_${suffix} "Дюма Жан Давидович", got "${result[`full_name_${suffix}`]}"`);
    }
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
  await runTest('Both indeclinable: all names stay nominative', testBothIndeclinable);

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
