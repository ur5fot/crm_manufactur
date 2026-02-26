/**
 * Integration tests for Placeholder Preview API (quantity placeholders)
 * Prerequisites: Server must be running on port 3000
 * Run with: node server/test/placeholder-preview-api.test.js
 */

const BASE_URL = 'http://localhost:3000';

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

// Test 1: GET /api/placeholder-preview returns quantity placeholders
async function testPlaceholderPreviewHasQuantities() {
  const res = await fetch(`${BASE_URL}/api/placeholder-preview`);
  if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
  const data = await res.json();

  if (!data.placeholders || !Array.isArray(data.placeholders)) {
    throw new Error('Expected placeholders array in response');
  }

  const quantityPlaceholders = data.placeholders.filter(p => p.group === 'quantities');
  if (quantityPlaceholders.length === 0) {
    throw new Error('Expected at least one placeholder with group "quantities"');
  }

  // Verify structure of quantity placeholders
  const first = quantityPlaceholders[0];
  if (!first.placeholder || !first.label || first.value === undefined) {
    throw new Error('Quantity placeholder missing required fields (placeholder, label, value)');
  }
  if (first.group !== 'quantities') {
    throw new Error(`Expected group "quantities", got "${first.group}"`);
  }
}

// Test 2: Quantity placeholders have numeric string values
async function testQuantityPlaceholderValues() {
  const res = await fetch(`${BASE_URL}/api/placeholder-preview`);
  const data = await res.json();

  const quantityPlaceholders = data.placeholders.filter(p => p.group === 'quantities');
  for (const p of quantityPlaceholders) {
    const num = parseInt(p.value, 10);
    if (isNaN(num) || num < 0) {
      throw new Error(`Expected non-negative integer value for ${p.placeholder}, got "${p.value}"`);
    }
  }
}

// Test 3: Quantity placeholders include total and option-level entries
async function testQuantityPlaceholderStructure() {
  const res = await fetch(`${BASE_URL}/api/placeholder-preview`);
  const data = await res.json();

  const quantityPlaceholders = data.placeholders.filter(p => p.group === 'quantities');

  // There should be at least one _quantity (total) placeholder
  const totalPlaceholders = quantityPlaceholders.filter(p => p.placeholder.match(/\{f_\w+_quantity\}$/) && !p.placeholder.includes('_option'));
  if (totalPlaceholders.length === 0) {
    throw new Error('Expected at least one total quantity placeholder (e.g., {f_gender_quantity})');
  }

  // There should be at least one option-level placeholder
  const optionPlaceholders = quantityPlaceholders.filter(p => p.placeholder.includes('_option'));
  if (optionPlaceholders.length === 0) {
    throw new Error('Expected at least one option-level quantity placeholder (e.g., {f_gender_option1_quantity})');
  }
}

// Test 4: Quantity placeholder labels are descriptive
async function testQuantityPlaceholderLabels() {
  const res = await fetch(`${BASE_URL}/api/placeholder-preview`);
  const data = await res.json();

  const quantityPlaceholders = data.placeholders.filter(p => p.group === 'quantities');

  // Total placeholders should have "кількість (всі)" in label
  const totalP = quantityPlaceholders.find(p => !p.placeholder.includes('_option'));
  if (totalP && !totalP.label.includes('кількість')) {
    throw new Error(`Expected total quantity label to contain "кількість", got "${totalP.label}"`);
  }

  // Option placeholders should have the option name in label
  const optionP = quantityPlaceholders.find(p => p.placeholder.includes('_option'));
  if (optionP && !optionP.label.includes('кількість')) {
    throw new Error(`Expected option quantity label to contain "кількість", got "${optionP.label}"`);
  }
}

async function runAllTests() {
  console.log('Starting Placeholder Preview API tests...\n');

  await runTest('1. GET /api/placeholder-preview returns quantity placeholders', testPlaceholderPreviewHasQuantities);
  await runTest('2. Quantity placeholders have numeric string values', testQuantityPlaceholderValues);
  await runTest('3. Quantity placeholders include total and option-level entries', testQuantityPlaceholderStructure);
  await runTest('4. Quantity placeholder labels are descriptive', testQuantityPlaceholderLabels);

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
