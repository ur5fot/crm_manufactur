/**
 * Integration tests for Employee Photo API
 * Prerequisites: Server must be running on port 3000
 * Run with: node server/test/photo-api.test.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const FILES_DIR = path.resolve(__dirname, '../../files');

let testsPassed = 0;
let testsFailed = 0;
let testEmployeeId = null;

// Helper function to run a test
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

// Create a minimal 1x1 PNG image buffer
function createTestPng() {
  // Minimal valid PNG: 1x1 pixel, RGBA
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8-bit RGB
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, // compressed data
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, // ...
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND chunk
    0x44, 0xae, 0x42, 0x60, 0x82
  ]);
  return png;
}

// Helper to ensure test employee exists
async function ensureTestEmployee() {
  const response = await fetch(`${BASE_URL}/api/employees`);
  const data = await response.json();

  if (data.employees && data.employees.length > 0) {
    return data.employees[0].employee_id;
  }

  // Create test employee
  const createResp = await fetch(`${BASE_URL}/api/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'PhotoTest',
      last_name: 'Employee',
    })
  });

  const createData = await createResp.json();
  return createData.employee_id;
}

// Test 1: POST /api/employees/:id/photo uploads photo successfully
async function testPhotoUploadSuccess() {
  const formData = new FormData();
  const pngBuffer = createTestPng();
  const blob = new Blob([pngBuffer], { type: 'image/png' });
  formData.append('photo', blob, 'test-photo.png');

  const response = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/photo`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expected 200, got ${response.status}: ${text}`);
  }

  const data = await response.json();

  if (!data.path) {
    throw new Error('Response should include path');
  }

  if (!data.path.includes('photo.png')) {
    throw new Error(`Photo path should contain "photo.png", got: ${data.path}`);
  }

  if (!data.path.includes(`employee_${testEmployeeId}`)) {
    throw new Error(`Photo path should contain employee folder, got: ${data.path}`);
  }

  // Verify file exists on disk
  const fullPath = path.resolve(__dirname, '../..', data.path);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Photo file should exist at: ${fullPath}`);
  }
}

// Test 2: POST /api/employees/:id/photo returns 404 for non-existent employee
async function testPhotoUploadEmployeeNotFound() {
  const formData = new FormData();
  const pngBuffer = createTestPng();
  const blob = new Blob([pngBuffer], { type: 'image/png' });
  formData.append('photo', blob, 'test-photo.png');

  const response = await fetch(`${BASE_URL}/api/employees/999999/photo`, {
    method: 'POST',
    body: formData
  });

  if (response.status !== 404) {
    throw new Error(`Expected 404, got ${response.status}`);
  }
}

// Test 3: POST /api/employees/:id/photo returns 400 for missing file
async function testPhotoUploadMissingFile() {
  const formData = new FormData();

  const response = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/photo`, {
    method: 'POST',
    body: formData
  });

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }
}

// Test 4: POST /api/employees/:id/photo rejects non-image files
async function testPhotoUploadInvalidType() {
  const formData = new FormData();
  const textBlob = new Blob(['not an image'], { type: 'text/plain' });
  formData.append('photo', textBlob, 'test.txt');

  const response = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/photo`, {
    method: 'POST',
    body: formData
  });

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }
}

// Test 5: POST /api/employees/:id/photo rejects PDF files
async function testPhotoUploadRejectsPdf() {
  const formData = new FormData();
  const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
  formData.append('photo', pdfBlob, 'document.pdf');

  const response = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/photo`, {
    method: 'POST',
    body: formData
  });

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }
}

// Test 6: Employee record is updated with photo path after upload
async function testPhotoUpdatesEmployeeRecord() {
  // Upload a photo first
  const formData = new FormData();
  const pngBuffer = createTestPng();
  const blob = new Blob([pngBuffer], { type: 'image/png' });
  formData.append('photo', blob, 'verify-photo.png');

  await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/photo`, {
    method: 'POST',
    body: formData
  });

  // Get employee and verify photo field
  const empResponse = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}`);
  const empData = await empResponse.json();
  const employee = empData.employee;

  if (!employee.photo) {
    throw new Error('Employee photo field should be set');
  }

  if (!employee.photo.includes('photo.png')) {
    throw new Error(`Employee photo field should contain "photo.png", got: ${employee.photo}`);
  }
}

// Test 7: Photo re-upload replaces old photo
async function testPhotoReuploadReplacesOld() {
  // Upload PNG
  let formData = new FormData();
  let blob = new Blob([createTestPng()], { type: 'image/png' });
  formData.append('photo', blob, 'first.png');

  const firstResp = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/photo`, {
    method: 'POST',
    body: formData
  });
  const firstData = await firstResp.json();

  // Upload JPG (different extension)
  formData = new FormData();
  // Create a minimal JPEG-like blob
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  blob = new Blob([jpegHeader], { type: 'image/jpeg' });
  formData.append('photo', blob, 'second.jpg');

  const secondResp = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/photo`, {
    method: 'POST',
    body: formData
  });
  const secondData = await secondResp.json();

  if (!secondData.path.includes('photo.jpg')) {
    throw new Error(`New photo path should contain "photo.jpg", got: ${secondData.path}`);
  }

  // Old PNG file should be deleted
  const oldFullPath = path.resolve(__dirname, '../..', firstData.path);
  if (fs.existsSync(oldFullPath)) {
    throw new Error('Old photo file should be deleted after re-upload with different extension');
  }
}

// Test 8: DELETE /api/employees/:id/photo deletes photo
async function testPhotoDeleteSuccess() {
  // Upload a photo first
  const formData = new FormData();
  const blob = new Blob([createTestPng()], { type: 'image/png' });
  formData.append('photo', blob, 'to-delete.png');

  const uploadResp = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/photo`, {
    method: 'POST',
    body: formData
  });
  const uploadData = await uploadResp.json();

  // Delete the photo
  const deleteResp = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/photo`, {
    method: 'DELETE'
  });

  if (deleteResp.status !== 204) {
    throw new Error(`Expected 204, got ${deleteResp.status}`);
  }

  // Verify file is deleted
  const fullPath = path.resolve(__dirname, '../..', uploadData.path);
  if (fs.existsSync(fullPath)) {
    throw new Error('Photo file should be deleted from disk');
  }

  // Verify employee record is cleared
  const empResponse = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}`);
  const empData = await empResponse.json();

  if (empData.employee.photo) {
    throw new Error(`Employee photo field should be empty after delete, got: ${empData.employee.photo}`);
  }
}

// Test 9: DELETE /api/employees/:id/photo returns 404 when no photo
async function testPhotoDeleteNoPhoto() {
  // Ensure no photo (after previous test deleted it)
  const response = await fetch(`${BASE_URL}/api/employees/${testEmployeeId}/photo`, {
    method: 'DELETE'
  });

  if (response.status !== 404) {
    throw new Error(`Expected 404 when no photo exists, got ${response.status}`);
  }
}

// Test 10: DELETE /api/employees/:id/photo returns 404 for non-existent employee
async function testPhotoDeleteEmployeeNotFound() {
  const response = await fetch(`${BASE_URL}/api/employees/999999/photo`, {
    method: 'DELETE'
  });

  if (response.status !== 404) {
    throw new Error(`Expected 404, got ${response.status}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('Starting Photo API integration tests...');
  console.log('Prerequisites: Server must be running on http://localhost:3000\n');

  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    if (!healthCheck.ok) {
      throw new Error('Server health check failed');
    }
    console.log('✓ Server is running\n');
  } catch (error) {
    console.error('Server is not accessible. Make sure it\'s running on port 3000');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }

  // Setup: ensure test employee exists
  testEmployeeId = await ensureTestEmployee();
  console.log(`Using test employee ID: ${testEmployeeId}\n`);

  // Run all tests
  await runTest('POST /api/employees/:id/photo uploads photo successfully', testPhotoUploadSuccess);
  await runTest('POST /api/employees/:id/photo returns 404 for non-existent employee', testPhotoUploadEmployeeNotFound);
  await runTest('POST /api/employees/:id/photo returns 400 for missing file', testPhotoUploadMissingFile);
  await runTest('POST /api/employees/:id/photo rejects non-image files', testPhotoUploadInvalidType);
  await runTest('POST /api/employees/:id/photo rejects PDF files', testPhotoUploadRejectsPdf);
  await runTest('Employee record updated with photo path after upload', testPhotoUpdatesEmployeeRecord);
  await runTest('Photo re-upload replaces old photo file', testPhotoReuploadReplacesOld);
  await runTest('DELETE /api/employees/:id/photo deletes photo', testPhotoDeleteSuccess);
  await runTest('DELETE /api/employees/:id/photo returns 404 when no photo', testPhotoDeleteNoPhoto);
  await runTest('DELETE /api/employees/:id/photo returns 404 for non-existent employee', testPhotoDeleteEmployeeNotFound);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log('='.repeat(60));

  return testsFailed === 0;
}

// Run tests
runAllTests()
  .then(success => {
    if (success) {
      console.log('\nAll Photo API integration tests passed!');
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
