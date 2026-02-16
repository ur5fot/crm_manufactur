/**
 * Integration tests for Employee Status History API
 * Prerequisites: Server must be running on port 3000
 * Run with: node server/test/status-history.test.js
 */

const BASE_URL = 'http://localhost:3000';

let testsPassed = 0;
let testsFailed = 0;
let testEmployeeId = null;

async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`\u2713 ${name}`);
    testsPassed++;
    return true;
  } catch (error) {
    console.error(`\u2717 ${name}`);
    console.error(`  Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

// Helper: ensure test employee exists
async function ensureTestEmployee() {
  const response = await fetch(`${BASE_URL}/api/employees`);
  const data = await response.json();

  if (data.employees && data.employees.length > 0) {
    return data.employees[0].employee_id;
  }

  const createResp = await fetch(`${BASE_URL}/api/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'StatusTest',
      last_name: 'Employee',
      gender: 'Чоловіча'
    })
  });

  const createData = await createResp.json();
  return createData.employee_id;
}

// Test 1: GET /api/employees/:id/status-history returns empty history
async function testStatusHistoryEmpty() {
  const response = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/status-history`);

  if (!response.ok) {
    throw new Error(`Expected 200, got ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data.history)) {
    throw new Error('Response should have history array');
  }
}

// Test 2: GET /api/employees/:id/status-history returns 404 for non-existent employee
async function testStatusHistoryNotFound() {
  const response = await fetch(`${BASE_URL}/api/employees/999999/status-history`);

  if (response.status !== 404) {
    throw new Error(`Expected 404, got ${response.status}`);
  }
}

// Test 3: Status change via PUT creates history entry
async function testStatusChangeCreatesHistory() {
  // Get current employee state
  const empResp = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}`);
  const empData = await empResp.json();
  const employee = empData.employee;

  // Change status
  const newStatus = employee.employment_status === 'Відпустка' ? 'Лікарняний' : 'Відпустка';
  const updateResp = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...employee,
      employment_status: newStatus,
      status_start_date: '2026-02-16',
      status_end_date: '2026-02-20'
    })
  });

  if (!updateResp.ok) {
    const text = await updateResp.text();
    throw new Error(`Status update failed: ${updateResp.status}: ${text}`);
  }

  // Check history
  const histResp = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/status-history`);
  const histData = await histResp.json();

  if (histData.history.length === 0) {
    throw new Error('Expected at least one history entry after status change');
  }

  const latest = histData.history[0];

  if (latest.employee_id !== testEmployeeId) {
    throw new Error(`Expected employee_id ${testEmployeeId}, got ${latest.employee_id}`);
  }

  if (latest.new_status !== newStatus) {
    throw new Error(`Expected new_status "${newStatus}", got "${latest.new_status}"`);
  }

  if (!latest.changed_at) {
    throw new Error('Expected changed_at timestamp');
  }

  if (latest.changed_by !== 'user') {
    throw new Error(`Expected changed_by "user", got "${latest.changed_by}"`);
  }
}

// Test 4: Non-status field change does NOT create history entry
async function testNonStatusChangeNoHistory() {
  // Get current history count
  const histBefore = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/status-history`);
  const dataBefore = await histBefore.json();
  const countBefore = dataBefore.history.length;

  // Update a non-status field
  const empResp = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}`);
  const empData = await empResp.json();
  const employee = empData.employee;

  await fetch(`${BASE_URL}/api/employees/${testEmployeeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...employee,
      notes: 'Test note ' + Date.now()
    })
  });

  // Check history count unchanged
  const histAfter = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/status-history`);
  const dataAfter = await histAfter.json();

  if (dataAfter.history.length !== countBefore) {
    throw new Error(`Expected ${countBefore} history entries, got ${dataAfter.history.length}`);
  }
}

// Test 5: History is sorted by changed_at descending (newest first)
async function testHistorySortedDescending() {
  // Create another status change
  const empResp = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}`);
  const empData = await empResp.json();
  const employee = empData.employee;

  const resetStatus = 'Працює';
  await fetch(`${BASE_URL}/api/employees/${testEmployeeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...employee,
      employment_status: resetStatus,
      status_start_date: '',
      status_end_date: ''
    })
  });

  const histResp = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/status-history`);
  const histData = await histResp.json();

  if (histData.history.length < 2) {
    throw new Error(`Expected at least 2 history entries, got ${histData.history.length}`);
  }

  // Check descending order
  for (let i = 1; i < histData.history.length; i++) {
    if (histData.history[i - 1].changed_at < histData.history[i].changed_at) {
      throw new Error('History is not sorted by changed_at descending');
    }
  }
}

// Test 6: History entry has correct old/new dates
async function testHistoryDates() {
  const histResp = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/status-history`);
  const histData = await histResp.json();

  if (histData.history.length === 0) {
    throw new Error('Expected history entries');
  }

  const entry = histData.history[0];

  // Verify fields exist (even if empty)
  const requiredFields = ['history_id', 'employee_id', 'old_status', 'new_status', 'old_start_date', 'old_end_date', 'new_start_date', 'new_end_date', 'changed_at', 'changed_by'];
  for (const field of requiredFields) {
    if (!(field in entry)) {
      throw new Error(`Missing field: ${field}`);
    }
  }
}

async function runAllTests() {
  console.log('Starting Status History API integration tests...');
  console.log('Prerequisites: Server must be running on http://localhost:3000\n');

  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    if (!healthCheck.ok) {
      throw new Error('Server health check failed');
    }
    console.log('\u2713 Server is running\n');
  } catch (error) {
    console.error('Server is not accessible. Make sure it\'s running on port 3000');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }

  testEmployeeId = await ensureTestEmployee();
  console.log(`Using test employee ID: ${testEmployeeId}\n`);

  await runTest('GET /api/employees/:id/status-history returns history array', testStatusHistoryEmpty);
  await runTest('GET /api/employees/:id/status-history returns 404 for non-existent employee', testStatusHistoryNotFound);
  await runTest('Status change via PUT creates history entry', testStatusChangeCreatesHistory);
  await runTest('Non-status field change does NOT create history entry', testNonStatusChangeNoHistory);
  await runTest('History is sorted by changed_at descending', testHistorySortedDescending);
  await runTest('History entry has all required fields', testHistoryDates);

  console.log('\n' + '='.repeat(60));
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log('='.repeat(60));

  return testsFailed === 0;
}

runAllTests()
  .then(success => {
    if (success) {
      console.log('\nAll Status History API integration tests passed!');
      process.exit(0);
    } else {
      console.error('\nSome tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
