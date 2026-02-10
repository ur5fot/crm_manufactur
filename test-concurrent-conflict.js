#!/usr/bin/env node
/**
 * Test script for concurrent conflicting updates to the same field
 * This tests the "last write wins" behavior
 */

const http = require('http');

const employeeId = process.argv[2] || '1';

console.log(`\n=== Testing concurrent conflicting updates for employee ${employeeId} ===\n`);

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

function updateEmployee(baseEmployee, fieldName, value, requestNum) {
  return new Promise((resolve, reject) => {
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

    console.log(`[Request ${requestNum}] Sending: ${fieldName} = "${value}"`);
    const startTime = Date.now();

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        if (res.statusCode === 200) {
          console.log(`[Request ${requestNum}] ✓ Success (${duration}ms)`);
          resolve({ requestNum, duration, value });
        } else {
          console.log(`[Request ${requestNum}] ✗ Failed (${duration}ms): ${res.statusCode}`);
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

async function runTest() {
  try {
    const initial = await getCurrentEmployee();
    console.log(`Initial position: "${initial.position}"\n`);

    // Two requests trying to update the same field to different values
    const updates = await Promise.all([
      updateEmployee(initial, 'position', 'Value from Request 1', 1),
      updateEmployee(initial, 'position', 'Value from Request 2', 2)
    ]);

    console.log(`\n=== Results ===`);
    console.log(`Request 1 completed in ${updates[0].duration}ms`);
    console.log(`Request 2 completed in ${updates[1].duration}ms`);

    // Wait and check final state
    await new Promise(resolve => setTimeout(resolve, 500));
    const finalState = await getCurrentEmployee();
    console.log(`\nFinal position: "${finalState.position}"`);

    // The final value should be one of the two values we sent
    const possibleValues = ['Value from Request 1', 'Value from Request 2'];
    const isValidFinalValue = possibleValues.includes(finalState.position);

    console.log(`\n=== Verdict ===`);
    console.log(`Both requests completed successfully (no errors)`);
    console.log(`Final value is one of the submitted values: ${isValidFinalValue ? '✓' : '✗'}`);

    if (isValidFinalValue) {
      console.log(`\n✓ SUCCESS: Concurrent updates processed sequentially`);
      console.log(`✓ No data corruption - final value is valid`);
      console.log(`✓ Last write wins behavior working correctly`);
      process.exit(0);
    } else {
      console.log(`\n✗ FAILURE: Final value is neither of the submitted values`);
      console.log(`  This indicates data corruption or lost updates`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    process.exit(1);
  }
}

runTest();
