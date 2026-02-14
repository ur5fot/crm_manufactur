/**
 * Unit tests for utils.js
 * Run with: node server/test/utils.test.js
 */

import { getNextId, normalizeEmployeeInput, getOpenCommand } from '../src/utils.js';

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

// getNextId tests

async function testGetNextIdEmptyArray() {
  const result = getNextId([], "id");
  if (result !== "1") {
    throw new Error(`Expected "1", got "${result}"`);
  }
}

async function testGetNextIdSingleItem() {
  const result = getNextId([{ id: "1" }], "id");
  if (result !== "2") {
    throw new Error(`Expected "2", got "${result}"`);
  }
}

async function testGetNextIdMultipleItems() {
  const result = getNextId([{ id: "1" }, { id: "5" }, { id: "3" }], "id");
  if (result !== "6") {
    throw new Error(`Expected "6", got "${result}"`);
  }
}

async function testGetNextIdWithGaps() {
  const result = getNextId([{ id: "1" }, { id: "10" }], "id");
  if (result !== "11") {
    throw new Error(`Expected "11", got "${result}"`);
  }
}

async function testGetNextIdNonNumericIds() {
  const result = getNextId([{ id: "abc" }, { id: "xyz" }], "id");
  if (result !== "1") {
    throw new Error(`Expected "1" for non-numeric IDs, got "${result}"`);
  }
}

async function testGetNextIdMixedIds() {
  const result = getNextId([{ id: "abc" }, { id: "5" }, { id: "xyz" }], "id");
  if (result !== "6") {
    throw new Error(`Expected "6" for mixed IDs, got "${result}"`);
  }
}

async function testGetNextIdCustomField() {
  const result = getNextId([{ employee_id: "3" }, { employee_id: "7" }], "employee_id");
  if (result !== "8") {
    throw new Error(`Expected "8", got "${result}"`);
  }
}

async function testGetNextIdReturnsString() {
  const result = getNextId([{ id: "1" }], "id");
  if (typeof result !== "string") {
    throw new Error(`Expected string type, got ${typeof result}`);
  }
}

// normalizeEmployeeInput tests

async function testNormalizeEmployeeInputObject() {
  const result = normalizeEmployeeInput({ last_name: "Test" });
  if (typeof result !== "object") {
    throw new Error(`Expected object, got ${typeof result}`);
  }
  if (result.last_name !== "Test") {
    throw new Error(`Expected last_name "Test", got "${result.last_name}"`);
  }
}

async function testNormalizeEmployeeInputNull() {
  const result = normalizeEmployeeInput(null);
  if (typeof result !== "object") {
    throw new Error(`Expected object for null input, got ${typeof result}`);
  }
}

async function testNormalizeEmployeeInputUndefined() {
  const result = normalizeEmployeeInput(undefined);
  if (typeof result !== "object") {
    throw new Error(`Expected object for undefined input, got ${typeof result}`);
  }
}

async function testNormalizeEmployeeInputNonObject() {
  const result = normalizeEmployeeInput("string");
  if (typeof result !== "object") {
    throw new Error(`Expected object for string input, got ${typeof result}`);
  }
}

// getOpenCommand tests

async function testGetOpenCommandReturnsString() {
  const result = getOpenCommand();
  if (typeof result !== "string") {
    throw new Error(`Expected string, got ${typeof result}`);
  }
  const validCommands = ["open", "explorer", "xdg-open"];
  if (!validCommands.includes(result)) {
    throw new Error(`Expected one of ${validCommands.join(", ")}, got "${result}"`);
  }
}

async function runAllTests() {
  console.log('Starting utils.js tests...\n');

  console.log('--- getNextId ---');
  await runTest('returns "1" for empty array', testGetNextIdEmptyArray);
  await runTest('returns next ID for single item', testGetNextIdSingleItem);
  await runTest('returns max+1 for multiple items', testGetNextIdMultipleItems);
  await runTest('handles gaps in IDs', testGetNextIdWithGaps);
  await runTest('returns "1" for non-numeric IDs', testGetNextIdNonNumericIds);
  await runTest('ignores non-numeric and uses valid IDs', testGetNextIdMixedIds);
  await runTest('works with custom ID field name', testGetNextIdCustomField);
  await runTest('returns string type', testGetNextIdReturnsString);

  console.log('\n--- normalizeEmployeeInput ---');
  await runTest('normalizes valid object', testNormalizeEmployeeInputObject);
  await runTest('handles null input', testNormalizeEmployeeInputNull);
  await runTest('handles undefined input', testNormalizeEmployeeInputUndefined);
  await runTest('handles non-object input', testNormalizeEmployeeInputNonObject);

  console.log('\n--- getOpenCommand ---');
  await runTest('returns valid platform command', testGetOpenCommandReturnsString);

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
