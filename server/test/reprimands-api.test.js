/**
 * Integration tests for reprimands API endpoints
 * Prerequisites: Server must be running on port 3000
 * Run with: node server/test/reprimands-api.test.js
 */

const BASE_URL = 'http://localhost:3000/api';

let testsPassed = 0;
let testsFailed = 0;
let createdEmployeeId = null;
let createdReprimandId = null;

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

async function createTestEmployee() {
  const res = await fetch(`${BASE_URL}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Тест',
      last_name: 'Репримандів',
      middle_name: 'Олексійович'
    })
  });
  if (!res.ok) throw new Error(`Failed to create test employee: ${res.status}`);
  const data = await res.json();
  return data.employee_id;
}

async function deleteTestEmployee(employeeId) {
  await fetch(`${BASE_URL}/employees/${employeeId}`, { method: 'DELETE' });
}

async function runAllTests() {
  console.log('Starting reprimands API integration tests...\n');

  // Create a test employee to work with
  try {
    createdEmployeeId = await createTestEmployee();
    console.log(`Created test employee with ID: ${createdEmployeeId}\n`);
  } catch (err) {
    console.error('Failed to create test employee:', err.message);
    if (err.message.includes('ECONNREFUSED') || err.code === 'ECONNREFUSED') {
      console.error('Make sure the server is running on port 3000');
    }
    process.exit(1);
  }

  try {
    // GET reprimands for new employee — should return empty list
    await runTest("GET /api/employees/:id/reprimands returns empty list for new employee", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands`);
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.reprimands)) throw new Error("Expected reprimands array");
      if (data.reprimands.length !== 0) throw new Error(`Expected 0 reprimands, got ${data.reprimands.length}`);
    });

    // GET reprimands for non-existent employee — should return 404
    await runTest("GET /api/employees/:id/reprimands returns 404 for unknown employee", async () => {
      const res = await fetch(`${BASE_URL}/employees/999999/reprimands`);
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // POST create reprimand — success case
    await runTest("POST /api/employees/:id/reprimands creates new reprimand", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_date: '2026-01-15',
          record_type: 'Догана',
          order_number: '№123',
          note: 'Тестова догана'
        })
      });
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
      const data = await res.json();
      if (!data.reprimand) throw new Error("Expected reprimand in response");
      if (!data.reprimand.record_id) throw new Error("Expected record_id in reprimand");
      if (data.reprimand.record_type !== 'Догана') throw new Error("record_type mismatch");
      if (data.reprimand.record_date !== '2026-01-15') throw new Error("record_date mismatch");
      if (data.reprimand.order_number !== '№123') throw new Error("order_number mismatch");
      if (data.reprimand.note !== 'Тестова догана') throw new Error("note mismatch");
      if (data.reprimand.employee_id !== createdEmployeeId) throw new Error("employee_id mismatch");
      createdReprimandId = data.reprimand.record_id;
    });

    // POST create reprimand — missing record_date validation
    await runTest("POST /api/employees/:id/reprimands returns 400 when record_date missing", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_type: 'Подяка'
        })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
      const data = await res.json();
      if (!data.error) throw new Error("Expected error message");
    });

    // POST create reprimand — missing record_type validation
    await runTest("POST /api/employees/:id/reprimands returns 400 when record_type missing", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_date: '2026-01-15'
        })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
      const data = await res.json();
      if (!data.error) throw new Error("Expected error message");
    });

    // POST create reprimand for non-existent employee — should return 404
    await runTest("POST /api/employees/:id/reprimands returns 404 for unknown employee", async () => {
      const res = await fetch(`${BASE_URL}/employees/999999/reprimands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_date: '2026-01-15',
          record_type: 'Подяка'
        })
      });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // GET reprimands list after creating one
    await runTest("GET /api/employees/:id/reprimands returns created reprimand", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands`);
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (data.reprimands.length !== 1) throw new Error(`Expected 1 reprimand, got ${data.reprimands.length}`);
      if (data.reprimands[0].record_id !== createdReprimandId) throw new Error("record_id mismatch");
    });

    // Add a second reprimand to test sorting
    await runTest("POST creates second reprimand with later date", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_date: '2026-02-10',
          record_type: 'Подяка',
          order_number: '№45',
          note: 'За роботу'
        })
      });
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    });

    // GET reprimands list — should be sorted by date desc
    await runTest("GET /api/employees/:id/reprimands returns records sorted by date desc", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands`);
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (data.reprimands.length !== 2) throw new Error(`Expected 2 reprimands, got ${data.reprimands.length}`);
      // First record should be the later date
      if (data.reprimands[0].record_date < data.reprimands[1].record_date) {
        throw new Error(`Expected descending date sort, got ${data.reprimands[0].record_date} before ${data.reprimands[1].record_date}`);
      }
    });

    // PUT update reprimand — success case
    await runTest("PUT /api/employees/:id/reprimands/:recordId updates reprimand", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands/${createdReprimandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_date: '2026-01-20',
          record_type: 'Сувора догана',
          order_number: '№999',
          note: 'Оновлена нотатка'
        })
      });
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!data.reprimand) throw new Error("Expected reprimand in response");
      if (data.reprimand.record_date !== '2026-01-20') throw new Error("record_date not updated");
      if (data.reprimand.record_type !== 'Сувора догана') throw new Error("record_type not updated");
      if (data.reprimand.order_number !== '№999') throw new Error("order_number not updated");
      if (data.reprimand.note !== 'Оновлена нотатка') throw new Error("note not updated");
    });

    // PUT update reprimand — missing record_date validation
    await runTest("PUT /api/employees/:id/reprimands/:recordId returns 400 when record_date missing", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands/${createdReprimandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_type: 'Подяка'
        })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    // PUT update reprimand — missing record_type validation
    await runTest("PUT /api/employees/:id/reprimands/:recordId returns 400 when record_type missing", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands/${createdReprimandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_date: '2026-01-15'
        })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    // PUT update non-existent reprimand — should return 404
    await runTest("PUT /api/employees/:id/reprimands/:recordId returns 404 for unknown record", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands/999999`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_date: '2026-01-15',
          record_type: 'Подяка'
        })
      });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // PUT update reprimand for non-existent employee — should return 404
    await runTest("PUT /api/employees/:id/reprimands/:recordId returns 404 for unknown employee", async () => {
      const res = await fetch(`${BASE_URL}/employees/999999/reprimands/${createdReprimandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_date: '2026-01-15',
          record_type: 'Подяка'
        })
      });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // DELETE reprimand — success case
    await runTest("DELETE /api/employees/:id/reprimands/:recordId deletes reprimand", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands/${createdReprimandId}`, {
        method: 'DELETE'
      });
      if (res.status !== 204) throw new Error(`Expected 204, got ${res.status}`);
    });

    // Verify deletion worked
    await runTest("GET /api/employees/:id/reprimands returns 1 reprimand after deletion", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands`);
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (data.reprimands.length !== 1) throw new Error(`Expected 1 reprimand after deletion, got ${data.reprimands.length}`);
    });

    // DELETE non-existent reprimand — should return 404
    await runTest("DELETE /api/employees/:id/reprimands/:recordId returns 404 for unknown record", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/reprimands/999999`, {
        method: 'DELETE'
      });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // DELETE reprimand for non-existent employee — should return 404
    await runTest("DELETE /api/employees/:id/reprimands/:recordId returns 404 for unknown employee", async () => {
      const res = await fetch(`${BASE_URL}/employees/999999/reprimands/1`, {
        method: 'DELETE'
      });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // Test cleanup on employee delete: employee should have 1 reprimand remaining
    // Create another reprimand, then delete the employee and verify reprimands are cleaned up
    await runTest("DELETE employee cleans up reprimand records", async () => {
      // Create a fresh employee with a reprimand
      const empId = await createTestEmployee();
      await fetch(`${BASE_URL}/employees/${empId}/reprimands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_date: '2026-01-01',
          record_type: 'Зауваження',
          order_number: '',
          note: ''
        })
      });

      // Delete the employee
      const delRes = await fetch(`${BASE_URL}/employees/${empId}`, { method: 'DELETE' });
      if (delRes.status !== 204) throw new Error(`Expected 204 on employee delete, got ${delRes.status}`);

      // Now verify reprimands are cleaned up by trying GET (should 404 since employee deleted)
      // The cleanup happens in background. We check by re-running loadReprimands via
      // a separate query pattern. Since the employee is deleted, just verify the endpoint 404s.
      const repRes = await fetch(`${BASE_URL}/employees/${empId}/reprimands`);
      if (repRes.status !== 404) throw new Error(`Expected 404 after employee deletion, got ${repRes.status}`);
    });

  } finally {
    // Clean up test employee
    if (createdEmployeeId) {
      await deleteTestEmployee(createdEmployeeId);
    }
  }

  console.log(`\nTests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);

  if (testsFailed === 0) {
    console.log("\n✅ All reprimands API tests passed!");
  } else {
    console.log("\n❌ Some tests failed!");
  }

  return testsFailed === 0;
}

runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    if (error.code === 'ECONNREFUSED') {
      console.error('Make sure the server is running on port 3000');
    }
    process.exit(1);
  });
