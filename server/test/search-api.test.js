/**
 * Integration tests for Search API
 * Prerequisites: Server must be running on port 3000
 * Run with: node server/test/search-api.test.js
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

async function testSearchRequiresQuery() {
  const response = await fetch(`${BASE_URL}/api/search`);
  if (response.ok) throw new Error('Expected 400, got 200');
  if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
}

async function testSearchMinLength() {
  const response = await fetch(`${BASE_URL}/api/search?q=a`);
  if (response.ok) throw new Error('Expected 400, got 200');
  if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
}

async function testSearchReturnsGroupedResults() {
  const response = await fetch(`${BASE_URL}/api/search?q=test`);
  if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);

  const data = await response.json();
  if (!Array.isArray(data.employees)) throw new Error('Missing employees array');
  if (!Array.isArray(data.templates)) throw new Error('Missing templates array');
  if (!Array.isArray(data.documents)) throw new Error('Missing documents array');
  if (!data.total || typeof data.total !== 'object') throw new Error('Missing total object');
  if (typeof data.total.employees !== 'number') throw new Error('Missing total.employees');
  if (typeof data.total.templates !== 'number') throw new Error('Missing total.templates');
  if (typeof data.total.documents !== 'number') throw new Error('Missing total.documents');
}

async function testSearchFindsEmployeeByName() {
  // Load employees to find a valid search term
  const empResp = await fetch(`${BASE_URL}/api/employees`);
  const empData = await empResp.json();
  if (empData.employees.length === 0) throw new Error('No employees available for test');

  const employee = empData.employees[0];
  const searchTerm = employee.last_name;
  if (!searchTerm || searchTerm.length < 2) throw new Error('Employee last_name too short for search');

  const response = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(searchTerm)}`);
  if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);

  const data = await response.json();
  if (data.total.employees < 1) throw new Error(`Expected at least 1 employee match for "${searchTerm}", got ${data.total.employees}`);

  const found = data.employees.some(e => e.last_name === employee.last_name);
  if (!found) throw new Error(`Employee ${employee.last_name} not found in search results`);
}

async function testSearchFindsEmployeeByDepartment() {
  const empResp = await fetch(`${BASE_URL}/api/employees`);
  const empData = await empResp.json();
  const empWithDept = empData.employees.find(e => e.department && e.department.length >= 2);
  if (!empWithDept) throw new Error('No employee with department found');

  const response = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(empWithDept.department)}`);
  if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);

  const data = await response.json();
  if (data.total.employees < 1) throw new Error(`Expected match for department "${empWithDept.department}"`);
}

async function testSearchFindsTemplate() {
  const tmplResp = await fetch(`${BASE_URL}/api/templates`);
  const tmplData = await tmplResp.json();
  if (tmplData.templates.length === 0) throw new Error('No templates available for test');

  const template = tmplData.templates[0];
  // Use first 5+ chars of template name for search
  const searchTerm = template.template_name.substring(0, Math.min(10, template.template_name.length));
  if (searchTerm.length < 2) throw new Error('Template name too short for search');

  const response = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(searchTerm)}`);
  if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);

  const data = await response.json();
  if (data.total.templates < 1) throw new Error(`Expected at least 1 template match for "${searchTerm}", got ${data.total.templates}`);
}

async function testSearchNoResults() {
  const response = await fetch(`${BASE_URL}/api/search?q=zzzznonexistent99999`);
  if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);

  const data = await response.json();
  if (data.total.employees !== 0) throw new Error(`Expected 0 employees, got ${data.total.employees}`);
  if (data.total.templates !== 0) throw new Error(`Expected 0 templates, got ${data.total.templates}`);
  if (data.total.documents !== 0) throw new Error(`Expected 0 documents, got ${data.total.documents}`);
}

async function testSearchCaseInsensitive() {
  const empResp = await fetch(`${BASE_URL}/api/employees`);
  const empData = await empResp.json();
  if (empData.employees.length === 0) throw new Error('No employees available');

  const employee = empData.employees[0];
  const lowerTerm = employee.last_name.toLowerCase();

  const response = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(lowerTerm)}`);
  if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);

  const data = await response.json();
  if (data.total.employees < 1) throw new Error('Case-insensitive search failed');
}

async function runAllTests() {
  console.log('Starting Search API integration tests...\n');

  await runTest('Search requires q parameter', testSearchRequiresQuery);
  await runTest('Search requires minimum 2 characters', testSearchMinLength);
  await runTest('Search returns grouped results structure', testSearchReturnsGroupedResults);
  await runTest('Search finds employee by name', testSearchFindsEmployeeByName);
  await runTest('Search finds employee by department', testSearchFindsEmployeeByDepartment);
  await runTest('Search finds template by name', testSearchFindsTemplate);
  await runTest('Search returns empty results for non-matching query', testSearchNoResults);
  await runTest('Search is case-insensitive', testSearchCaseInsensitive);

  console.log(`\n==================================================`);
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log(`==================================================\n`);

  if (testsFailed > 0) {
    console.error('❌ Some search API tests failed!');
  } else {
    console.log('✅ All search API tests passed!');
  }

  return testsFailed === 0;
}

runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
