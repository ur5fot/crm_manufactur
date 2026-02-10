#!/usr/bin/env node
/**
 * Test script for concurrent employee updates
 * Simulates race condition scenario by sending two PUT requests simultaneously
 */

const http = require('http');

// Get employee ID from command line or use default
const employeeId = process.argv[2] || '1';

console.log(`\n=== Testing concurrent updates for employee ${employeeId} ===\n`);

// First, get current employee data
function getCurrentEmployee() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/employees/${employeeId}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          resolve(response.employee || response);
        } else {
          reject(new Error(`GET failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Update employee with specific field change
function updateEmployee(baseEmployee, fieldName, value, requestNum) {
  return new Promise((resolve, reject) => {
    // Clone the base employee object and modify the specific field
    const employee = { ...baseEmployee, [fieldName]: value };

    const body = JSON.stringify(employee);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/employees/${employeeId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    console.log(`[Request ${requestNum}] Sending update: ${fieldName} = "${value}"`);
    const startTime = Date.now();

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        if (res.statusCode === 200) {
          console.log(`[Request ${requestNum}] ✓ Success (${duration}ms): ${fieldName} = "${value}"`);
          resolve({ requestNum, duration, success: true });
        } else {
          console.log(`[Request ${requestNum}] ✗ Failed (${duration}ms): ${res.statusCode} - ${data}`);
          reject(new Error(`Update failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      console.log(`[Request ${requestNum}] ✗ Error: ${err.message}`);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

// Verify final state
function verifyFinalState() {
  return new Promise((resolve, reject) => {
    // Wait a bit for any pending writes to complete
    setTimeout(() => {
      getCurrentEmployee().then(employee => {
        console.log(`\n=== Final employee state ===`);
        console.log(`position: "${employee.position}"`);
        console.log(`department: "${employee.department}"`);
        resolve(employee);
      }).catch(reject);
    }, 500);
  });
}

// Check audit logs for both changes
function checkAuditLogs() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/logs',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          const logs = response.logs || [];
          // Get last 5 logs
          const recentLogs = logs.slice(0, 5);
          console.log(`\n=== Recent audit logs (last 5) ===`);
          recentLogs.forEach(log => {
            if (log.action === 'UPDATE') {
              console.log(`[${log.timestamp}] ${log.field_name}: "${log.old_value}" → "${log.new_value}"`);
            }
          });
          resolve(recentLogs);
        } else {
          reject(new Error(`GET logs failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Main test
async function runTest() {
  try {
    // Get initial state
    const initial = await getCurrentEmployee();
    console.log(`Initial state: position="${initial.position}", department="${initial.department}"\n`);

    // Launch two concurrent updates to different fields
    // Both use the same base state to avoid race in reading
    const updates = await Promise.all([
      updateEmployee(initial, 'position', 'Test Position Updated 1', 1),
      updateEmployee(initial, 'department', 'Test Department Updated 2', 2)
    ]);

    console.log(`\n=== Results ===`);
    console.log(`Request 1 duration: ${updates[0].duration}ms`);
    console.log(`Request 2 duration: ${updates[1].duration}ms`);
    console.log(`Time difference: ${Math.abs(updates[0].duration - updates[1].duration)}ms`);

    // Verify final state
    const finalState = await verifyFinalState();

    // Check audit logs
    const logs = await checkAuditLogs();

    // Check if both changes were applied
    const bothApplied =
      finalState.position === 'Test Position Updated 1' &&
      finalState.department === 'Test Department Updated 2';

    // Check if both changes are in logs
    const positionLogged = logs.some(log =>
      log.action === 'UPDATE' &&
      log.field_name && log.field_name.includes('position') &&
      log.new_value === 'Test Position Updated 1'
    );
    const departmentLogged = logs.some(log =>
      log.action === 'UPDATE' &&
      log.field_name && log.field_name.includes('department') &&
      log.new_value === 'Test Department Updated 2'
    );

    console.log(`\n=== Verdict ===`);
    console.log(`Data verification:`);
    console.log(`  Position updated: ${finalState.position === 'Test Position Updated 1' ? '✓' : '✗'}`);
    console.log(`  Department updated: ${finalState.department === 'Test Department Updated 2' ? '✓' : '✗'}`);
    console.log(`Audit log verification:`);
    console.log(`  Position logged: ${positionLogged ? '✓' : '✗'}`);
    console.log(`  Department logged: ${departmentLogged ? '✓' : '✗'}`);

    if (bothApplied && positionLogged && departmentLogged) {
      console.log(`\n✓ SUCCESS: Both concurrent updates were applied correctly`);
      console.log('✓ No data loss detected');
      console.log('✓ Both changes recorded in audit logs');
      process.exit(0);
    } else {
      console.log(`\n✗ FAILURE: One or both updates were lost or not logged`);
      if (!bothApplied) {
        console.log(`  Expected position: "Test Position Updated 1", got: "${finalState.position}"`);
        console.log(`  Expected department: "Test Department Updated 2", got: "${finalState.department}"`);
      }
      process.exit(1);
    }

  } catch (error) {
    console.error('\n✗ Test failed with error:', error.message);
    process.exit(1);
  }
}

runTest();
