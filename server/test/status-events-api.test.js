/**
 * Integration tests for status events API endpoints
 * Prerequisites: Server must be running on port 3000
 * Run with: node server/test/status-events-api.test.js
 */

const BASE_URL = 'http://localhost:3000/api';

let testsPassed = 0;
let testsFailed = 0;
let createdEmployeeId = null;
let createdEventId = null;

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
      last_name: 'StatusEvents',
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

// Returns today's date as YYYY-MM-DD string
function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Returns a date offset by days from today as YYYY-MM-DD string
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function runAllTests() {
  console.log('Starting status events API integration tests...\n');

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
    // GET events for new employee — should return empty array
    await runTest("GET /api/employees/:id/status-events returns empty list for new employee", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/status-events`);
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.events)) throw new Error("Expected events array");
      if (data.events.length !== 0) throw new Error(`Expected 0 events, got ${data.events.length}`);
    });

    // GET events for non-existent employee — should return 404
    await runTest("GET /api/employees/:id/status-events returns 404 for unknown employee", async () => {
      const res = await fetch(`${BASE_URL}/employees/999999/status-events`);
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // POST missing status returns 400
    await runTest("POST /api/employees/:id/status-events returns 400 when status missing", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/status-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: today() })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    // POST missing start_date returns 400
    await runTest("POST /api/employees/:id/status-events returns 400 when start_date missing", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/status-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Лікарняний' })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    // POST end_date before start_date returns 400
    await runTest("POST /api/employees/:id/status-events returns 400 when end_date < start_date", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/status-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Лікарняний',
          start_date: today(),
          end_date: dateOffset(-1)
        })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    // POST creates event with start_date = today and end_date in future, employee status updated immediately
    await runTest("POST /api/employees/:id/status-events creates event and updates employee status when immediately active", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/status-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Лікарняний',
          start_date: today(),
          end_date: dateOffset(10)  // Give end date so future events don't overlap
        })
      });
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
      const data = await res.json();
      if (!data.event) throw new Error("Expected event in response");
      if (!data.event.event_id) throw new Error("Expected event_id");
      if (data.event.status !== 'Лікарняний') throw new Error(`status mismatch: ${data.event.status}`);
      if (data.event.start_date !== today()) throw new Error(`start_date mismatch: ${data.event.start_date}`);
      if (data.event.employee_id !== createdEmployeeId) throw new Error("employee_id mismatch");
      if (!data.employee) throw new Error("Expected employee in response");
      // Employee status should be updated to the new event's status
      if (data.employee.employment_status !== 'Лікарняний') throw new Error(`Employee status not updated: ${data.employee.employment_status}`);
      createdEventId = data.event.event_id;
    });

    // GET events should now return the created event
    await runTest("GET /api/employees/:id/status-events returns created events", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/status-events`);
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.events)) throw new Error("Expected events array");
      if (data.events.length !== 1) throw new Error(`Expected 1 event, got ${data.events.length}`);
      if (data.events[0].event_id !== createdEventId) throw new Error("event_id mismatch");
    });

    // POST with future start_date (after current event's end): event created but employee status unchanged
    await runTest("POST /api/employees/:id/status-events with future start_date does not change employee status", async () => {
      // Start at +15 days (after current event ends at +10 days) — no overlap
      const futureStart = dateOffset(15);
      const futureEnd = dateOffset(30);
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/status-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Відпустка',
          start_date: futureStart,
          end_date: futureEnd
        })
      });
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
      const data = await res.json();
      if (!data.event) throw new Error("Expected event in response");
      if (data.event.start_date !== futureStart) throw new Error("start_date mismatch");
      // Employee status should remain 'Лікарняний' (active event is still today's)
      if (data.employee.employment_status !== 'Лікарняний') throw new Error(`Employee status changed unexpectedly: ${data.employee.employment_status}`);
    });

    // POST with overlapping event returns 409
    await runTest("POST /api/employees/:id/status-events returns 409 when event overlaps", async () => {
      // Try to create event overlapping with today's active event (today to +10)
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/status-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Лікарняний',
          start_date: dateOffset(5),  // overlaps with today-to-+10 event
          end_date: dateOffset(20)
        })
      });
      if (res.status !== 409) throw new Error(`Expected 409 (overlap), got ${res.status}`);
      const data = await res.json();
      if (!data.error || !data.error.includes('перетинається')) throw new Error(`Expected overlap error message, got: ${data.error}`);
    });

    // DELETE the active event — employee status should reset (future event at +15 still exists)
    await runTest("DELETE /api/employees/:id/status-events/:eventId deletes event", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/status-events/${createdEventId}`, {
        method: 'DELETE'
      });
      if (res.status !== 204) throw new Error(`Expected 204, got ${res.status}`);
    });

    // After deleting active event, sync should reset to Працює (future event at +15 is not active yet)
    await runTest("After deleting active event, GET employee status reflects sync (reset to Працює)", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}`);
      if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      // Active event was deleted; remaining event starts in the future (+15 days)
      // Sync finds no active event and resets to 'Працює'
      if (data.employee.employment_status !== 'Працює') {
        throw new Error(`Expected 'Працює' after active event deletion, got '${data.employee.employment_status}'`);
      }
    });

    // DELETE non-existent event returns 404
    await runTest("DELETE /api/employees/:id/status-events/:eventId returns 404 for unknown event", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/status-events/999999`, {
        method: 'DELETE'
      });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // GET events for non-existent employee on DELETE returns 404
    await runTest("DELETE /api/employees/:id/status-events/:eventId returns 404 for unknown employee", async () => {
      const res = await fetch(`${BASE_URL}/employees/999999/status-events/1`, {
        method: 'DELETE'
      });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // GET employee auto-sync on load
    await runTest("GET /api/employees/:id triggers status sync on load", async () => {
      // Create event with past start_date to test auto-activation on GET
      const secondEmployeeRes = await fetch(`${BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: 'Sync',
          last_name: 'TestEmployee',
          middle_name: ''
        })
      });
      if (!secondEmployeeRes.ok) throw new Error(`Failed to create second test employee: ${secondEmployeeRes.status}`);
      const secondData = await secondEmployeeRes.json();
      const secondId = secondData.employee_id;

      try {
        // Add event with start_date = today (immediately active)
        const addRes = await fetch(`${BASE_URL}/employees/${secondId}/status-events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'Відпустка',
            start_date: today()
          })
        });
        if (addRes.status !== 201) throw new Error(`Failed to add event: ${addRes.status}`);

        // GET employee — should trigger sync and return updated status
        const getRes = await fetch(`${BASE_URL}/employees/${secondId}`);
        if (!getRes.ok) throw new Error(`Expected 200, got ${getRes.status}`);
        const getData = await getRes.json();
        if (getData.employee.employment_status !== 'Відпустка') {
          throw new Error(`Expected 'Відпустка', got: ${getData.employee.employment_status}`);
        }
      } finally {
        await fetch(`${BASE_URL}/employees/${secondId}`, { method: 'DELETE' });
      }
    });

    // DELETE employee also removes status events
    await runTest("DELETE employee removes associated status events", async () => {
      const tmpRes = await fetch(`${BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: 'Tmp', last_name: 'DeleteTest', middle_name: '' })
      });
      if (!tmpRes.ok) throw new Error(`Failed to create tmp employee: ${tmpRes.status}`);
      const tmpData = await tmpRes.json();
      const tmpId = tmpData.employee_id;

      // Add an event and confirm it exists before deletion
      const addRes = await fetch(`${BASE_URL}/employees/${tmpId}/status-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Лікарняний', start_date: dateOffset(10), end_date: dateOffset(20) })
      });
      if (addRes.status !== 201) throw new Error(`Expected 201 creating event, got ${addRes.status}`);
      const beforeData = await (await fetch(`${BASE_URL}/employees/${tmpId}/status-events`)).json();
      if (beforeData.events.length !== 1) throw new Error(`Expected 1 event before deletion, got ${beforeData.events.length}`);

      // Hard-delete the employee (removes employee row and cleans up associated events)
      const delRes = await fetch(`${BASE_URL}/employees/${tmpId}`, { method: 'DELETE' });
      if (delRes.status !== 204) throw new Error(`Expected 204, got ${delRes.status}`);

      // Employee is hard-deleted: GET events returns 404, not 500 (a 500 would indicate orphaned events caused a server error)
      const eventsRes = await fetch(`${BASE_URL}/employees/${tmpId}/status-events`);
      if (eventsRes.status !== 404) {
        throw new Error(`Expected 404 (employee hard-deleted) from events endpoint, got ${eventsRes.status}`);
      }
    });

    // DELETE event belonging to different employee returns 403
    await runTest("DELETE /api/employees/:id/status-events/:eventId returns 403 for event owned by different employee", async () => {
      const empARes = await fetch(`${BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: 'EmpA', last_name: 'OwnerTest', middle_name: '' })
      });
      if (!empARes.ok) throw new Error(`Failed to create empA: ${empARes.status}`);
      const empAId = (await empARes.json()).employee_id;

      const empBRes = await fetch(`${BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: 'EmpB', last_name: 'OwnerTest', middle_name: '' })
      });
      if (!empBRes.ok) throw new Error(`Failed to create empB: ${empBRes.status}`);
      const empBId = (await empBRes.json()).employee_id;

      try {
        // Add an event to empA
        const evtRes = await fetch(`${BASE_URL}/employees/${empAId}/status-events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Лікарняний', start_date: dateOffset(5), end_date: dateOffset(10) })
        });
        if (evtRes.status !== 201) throw new Error(`Expected 201 creating event for empA, got ${evtRes.status}`);
        const evtData = await evtRes.json();
        const empAEventId = evtData.event.event_id;

        // Attempt to delete empA's event via empB's URL — should return 403
        const delRes = await fetch(`${BASE_URL}/employees/${empBId}/status-events/${empAEventId}`, {
          method: 'DELETE'
        });
        if (delRes.status !== 403) throw new Error(`Expected 403 (forbidden), got ${delRes.status}`);
        const errData = await delRes.json();
        if (!errData.error) throw new Error("Expected error message in response");
      } finally {
        await fetch(`${BASE_URL}/employees/${empAId}`, { method: 'DELETE' });
        await fetch(`${BASE_URL}/employees/${empBId}`, { method: 'DELETE' });
      }
    });

    // POST with invalid date format returns 400
    await runTest("POST /api/employees/:id/status-events returns 400 for invalid start_date format", async () => {
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/status-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Лікарняний', start_date: 'not-a-date' })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    // -----------------------------------------------------------------------
    // PUT /api/employees/:id/status-events/:eventId tests
    // -----------------------------------------------------------------------

    // Setup: create a fresh event for PUT tests
    let putEventId = null;
    let putEmpId = null;

    await runTest("PUT setup: create employee and event for update tests", async () => {
      const empRes = await fetch(`${BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: 'Put', last_name: 'TestEmployee', middle_name: '' })
      });
      if (!empRes.ok) throw new Error(`Expected 201, got ${empRes.status}`);
      putEmpId = (await empRes.json()).employee_id;

      const evtRes = await fetch(`${BASE_URL}/employees/${putEmpId}/status-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Лікарняний', start_date: dateOffset(5), end_date: dateOffset(10) })
      });
      if (evtRes.status !== 201) throw new Error(`Expected 201, got ${evtRes.status}`);
      putEventId = (await evtRes.json()).event.event_id;
    });

    // PUT success: update status and dates
    await runTest("PUT /api/employees/:id/status-events/:eventId updates event successfully (200)", async () => {
      const res = await fetch(`${BASE_URL}/employees/${putEmpId}/status-events/${putEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Відпустка', start_date: dateOffset(6), end_date: dateOffset(12) })
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = await res.json();
      if (!data.event) throw new Error("Expected event in response");
      if (data.event.event_id !== putEventId) throw new Error("event_id mismatch");
      if (data.event.status !== 'Відпустка') throw new Error(`status mismatch: ${data.event.status}`);
      if (data.event.start_date !== dateOffset(6)) throw new Error(`start_date mismatch: ${data.event.start_date}`);
      if (!data.employee) throw new Error("Expected employee in response");
    });

    // PUT missing status returns 400
    await runTest("PUT /api/employees/:id/status-events/:eventId returns 400 when status missing", async () => {
      const res = await fetch(`${BASE_URL}/employees/${putEmpId}/status-events/${putEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: dateOffset(6) })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    // PUT missing start_date returns 400
    await runTest("PUT /api/employees/:id/status-events/:eventId returns 400 when start_date missing", async () => {
      const res = await fetch(`${BASE_URL}/employees/${putEmpId}/status-events/${putEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Відпустка' })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    // PUT event not found returns 404
    await runTest("PUT /api/employees/:id/status-events/:eventId returns 404 for unknown event", async () => {
      const res = await fetch(`${BASE_URL}/employees/${putEmpId}/status-events/999999`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Відпустка', start_date: dateOffset(5) })
      });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // PUT employee not found returns 404
    await runTest("PUT /api/employees/:id/status-events/:eventId returns 404 for unknown employee", async () => {
      const res = await fetch(`${BASE_URL}/employees/999999/status-events/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Відпустка', start_date: dateOffset(5) })
      });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    // PUT overlap returns 409
    await runTest("PUT /api/employees/:id/status-events/:eventId returns 409 on overlap", async () => {
      // Create a second event at +20 to +25 that the first event would overlap when updated
      const secondEvtRes = await fetch(`${BASE_URL}/employees/${putEmpId}/status-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Лікарняний', start_date: dateOffset(20), end_date: dateOffset(25) })
      });
      if (secondEvtRes.status !== 201) throw new Error(`Expected 201 creating second event, got ${secondEvtRes.status}`);

      // Try to update putEventId to overlap with the second event
      const res = await fetch(`${BASE_URL}/employees/${putEmpId}/status-events/${putEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Відпустка', start_date: dateOffset(6), end_date: dateOffset(22) })
      });
      if (res.status !== 409) throw new Error(`Expected 409 (overlap), got ${res.status}`);
      const data = await res.json();
      if (!data.error || !data.error.includes('перетинається')) throw new Error(`Expected overlap error message, got: ${data.error}`);
    });

    // PUT self-overlap: updating an event's own range should succeed (no 409 with itself)
    await runTest("PUT /api/employees/:id/status-events/:eventId allows updating event's own range (no self-overlap)", async () => {
      // Update putEventId with the same date range it currently has — should succeed
      const getRes = await fetch(`${BASE_URL}/employees/${putEmpId}/status-events`);
      const { events } = await getRes.json();
      const putEvent = events.find(e => e.event_id === putEventId);
      if (!putEvent) throw new Error("Could not find putEvent in events list");

      const res = await fetch(`${BASE_URL}/employees/${putEmpId}/status-events/${putEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: putEvent.status,
          start_date: putEvent.start_date,
          end_date: putEvent.end_date
        })
      });
      if (res.status !== 200) throw new Error(`Expected 200 (self-update), got ${res.status}`);
    });

    // PUT 403: event belongs to different employee
    await runTest("PUT /api/employees/:id/status-events/:eventId returns 403 when event belongs to different employee", async () => {
      // createdEmployeeId is a different employee; try to update putEmpId's event using createdEmployeeId's path
      const res = await fetch(`${BASE_URL}/employees/${createdEmployeeId}/status-events/${putEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Лікарняний', start_date: dateOffset(5) })
      });
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    // Cleanup PUT test employee
    if (putEmpId) {
      await fetch(`${BASE_URL}/employees/${putEmpId}`, { method: 'DELETE' });
    }

  } finally {
    // Clean up test employee
    if (createdEmployeeId) {
      await deleteTestEmployee(createdEmployeeId);
    }
  }

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
