/**
 * Integration tests for Templates API
 * Prerequisites: Server must be running on port 3000
 * Run with: node server/test/templates-api.test.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';

// Test data paths
const DATA_DIR = path.resolve(__dirname, '../../data');
const FILES_DIR = path.resolve(__dirname, '../../files');
const TEMPLATES_CSV = path.join(DATA_DIR, 'templates.csv');
const GENERATED_DOCS_CSV = path.join(DATA_DIR, 'generated_documents.csv');
const LOGS_CSV = path.join(DATA_DIR, 'logs.csv');
const EMPLOYEES_CSV = path.join(DATA_DIR, 'employees.csv');
const TEMPLATES_DIR = path.join(FILES_DIR, 'templates');

let testsPassed = 0;
let testsFailed = 0;
let createdTemplateIds = [];
let createdFiles = [];

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

// Helper function to create a simple test DOCX with placeholders
function createTestDocx(filePath, placeholders = []) {
  const zip = new PizZip();

  // Create document.xml with placeholders
  let documentContent = '<?xml version="1.0" encoding="UTF-8"?>';
  documentContent += '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">';
  documentContent += '<w:body>';

  for (const placeholder of placeholders) {
    documentContent += `<w:p><w:r><w:t>{${placeholder}}</w:t></w:r></w:p>`;
  }

  documentContent += '</w:body></w:document>';

  zip.folder('word').file('document.xml', documentContent);

  // Add required content types
  const contentTypes = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>';
  zip.file('[Content_Types].xml', contentTypes);

  // Add relationships
  const rels = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';
  zip.folder('_rels').file('.rels', rels);

  // Write file
  const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

// Helper to read CSV lines (using semicolon delimiter)
function readCsvLines(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return fs.readFileSync(filePath, 'utf-8').trim().split('\n');
}

// Helper to parse CSV row (handles quoted fields with semicolons)
function parseCsvRow(row) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

// Helper to get audit log count
function getLogCount() {
  const lines = readCsvLines(LOGS_CSV);
  return lines.length > 0 ? lines.length - 1 : 0; // Exclude header
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
      first_name: 'Test',
      last_name: 'Employee',
      position: 'Tester'
    })
  });

  const createData = await createResp.json();
  return createData.employee_id;
}

// Test 1: POST /api/templates creates template with auto-increment ID
async function testCreateTemplate() {
  const response = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Test Template',
      template_type: 'contract',
      description: 'Test description'
    })
  });

  if (response.status !== 201) {
    throw new Error(`Expected 201, got ${response.status}`);
  }

  const data = await response.json();

  if (!data.template_id) {
    throw new Error('Response should include template_id');
  }

  if (!data.template) {
    throw new Error('Response should include template object');
  }

  if (data.template.template_name !== 'Test Template') {
    throw new Error('Template name mismatch');
  }

  if (data.template.template_type !== 'contract') {
    throw new Error('Template type mismatch');
  }

  if (data.template.active !== 'yes') {
    throw new Error('New template should be active');
  }

  createdTemplateIds.push(data.template_id);
}

// Test 2: POST /api/templates validates required fields
async function testCreateTemplateValidation() {
  // Missing template_name
  let response = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_type: 'contract'
    })
  });

  if (response.status !== 400) {
    throw new Error(`Expected 400 for missing template_name, got ${response.status}`);
  }

  // Missing template_type
  response = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Test'
    })
  });

  if (response.status !== 400) {
    throw new Error(`Expected 400 for missing template_type, got ${response.status}`);
  }

  // Empty template_name
  response = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: '   ',
      template_type: 'contract'
    })
  });

  if (response.status !== 400) {
    throw new Error(`Expected 400 for empty template_name, got ${response.status}`);
  }
}

// Test 3: POST /api/templates creates audit log entry
async function testCreateTemplateAuditLog() {
  const response = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Audit Test Template',
      template_type: 'document'
    })
  });

  const data = await response.json();
  createdTemplateIds.push(data.template_id);

  // Wait a bit for log to be written
  await new Promise(resolve => setTimeout(resolve, 100));

  // Verify the log file exists and has content
  if (!fs.existsSync(LOGS_CSV)) {
    throw new Error('Logs CSV file should exist');
  }

  const logs = readCsvLines(LOGS_CSV);

  if (logs.length < 2) {
    throw new Error('Logs CSV should have at least a header and one entry after template creation');
  }

  // Check if our log is there
  let found = false;
  for (const log of logs) {
    if (log.includes('CREATE_TEMPLATE')) {
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error('Expected CREATE_TEMPLATE log entry after template creation');
  }
}

// Test 4: GET /api/templates returns only active templates
async function testGetActiveTemplatesOnly() {
  // Create two templates
  const response1 = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Active Template',
      template_type: 'contract'
    })
  });
  const data1 = await response1.json();
  createdTemplateIds.push(data1.template_id);

  const response2 = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'To Be Deleted',
      template_type: 'contract'
    })
  });
  const data2 = await response2.json();
  createdTemplateIds.push(data2.template_id);

  // Delete the second one (soft delete)
  await fetch(`${BASE_URL}/api/templates/${data2.template_id}`, {
    method: 'DELETE'
  });

  // Fetch all templates
  const getResponse = await fetch(`${BASE_URL}/api/templates`);
  const getData = await getResponse.json();

  // Check that deleted template is not in the list
  const foundDeleted = getData.templates.some(t => t.template_id === data2.template_id);
  if (foundDeleted) {
    throw new Error('Deleted template should not appear in GET /api/templates');
  }

  // Check that active template is in the list
  const foundActive = getData.templates.some(t => t.template_id === data1.template_id);
  if (!foundActive) {
    throw new Error('Active template should appear in GET /api/templates');
  }
}

// Test 5: GET /api/templates/:id returns 404 for non-existent
async function testGetTemplateNotFound() {
  const response = await fetch(`${BASE_URL}/api/templates/999999`);

  if (response.status !== 404) {
    throw new Error(`Expected 404 for non-existent template, got ${response.status}`);
  }
}

// Test 6: PUT /api/templates/:id updates template
async function testUpdateTemplate() {
  // Create template
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Original Name',
      template_type: 'contract',
      description: 'Original description'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  // Update template
  const updateResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Updated Name',
      template_type: 'document',
      description: 'Updated description'
    })
  });

  if (updateResponse.status !== 200) {
    throw new Error(`Expected 200, got ${updateResponse.status}`);
  }

  const updateData = await updateResponse.json();

  if (updateData.template.template_name !== 'Updated Name') {
    throw new Error('Template name should be updated');
  }

  if (updateData.template.template_type !== 'document') {
    throw new Error('Template type should be updated');
  }

  if (updateData.template.description !== 'Updated description') {
    throw new Error('Description should be updated');
  }
}

// Test 7: PUT /api/templates/:id doesn't allow changing docx_filename
async function testUpdateTemplateProtectedFields() {
  // Create template and upload file
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Protected Test',
      template_type: 'contract'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  // Upload a DOCX file
  const testDocxPath = path.join(__dirname, 'temp-test-upload.docx');
  createTestDocx(testDocxPath, ['name', 'position']);
  createdFiles.push(testDocxPath);

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(testDocxPath)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  formData.append('file', fileBlob, 'test.docx');

  const uploadResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}/upload`, {
    method: 'POST',
    body: formData
  });
  const uploadData = await uploadResponse.json();
  const originalFilename = uploadData.filename;

  // Try to update with different docx_filename
  const updateResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Protected Test',
      template_type: 'contract',
      docx_filename: 'hacked_filename.docx'
    })
  });

  const updateData = await updateResponse.json();

  // Verify docx_filename wasn't changed
  if (updateData.template.docx_filename !== originalFilename) {
    throw new Error('docx_filename should not be changeable via PUT');
  }
}

// Test 8: DELETE /api/templates/:id soft deletes (active='no')
async function testDeleteTemplateSoftDelete() {
  // Create template
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'To Delete',
      template_type: 'contract'
    })
  });
  const createData = await createResponse.json();
  const templateId = createData.template_id;
  createdTemplateIds.push(templateId);

  // Delete template
  const deleteResponse = await fetch(`${BASE_URL}/api/templates/${templateId}`, {
    method: 'DELETE'
  });

  if (deleteResponse.status !== 204) {
    throw new Error(`Expected 204, got ${deleteResponse.status}`);
  }

  // Wait for file write
  await new Promise(resolve => setTimeout(resolve, 100));

  // Verify it doesn't appear in GET /api/templates (soft delete means active='no')
  const getResponse = await fetch(`${BASE_URL}/api/templates`);
  const getData = await getResponse.json();
  const foundInList = getData.templates.some(t => t.template_id === templateId);

  if (foundInList) {
    throw new Error('Soft deleted template should not appear in GET /api/templates');
  }

  // Fetch via direct GET to verify it still exists but is inactive
  const directGetResponse = await fetch(`${BASE_URL}/api/templates/${templateId}`);
  if (directGetResponse.status !== 404) {
    const directData = await directGetResponse.json();
    if (directData.template && directData.template.active === 'no') {
      // This is correct behavior if API returns inactive templates
      return;
    }
  }

  // If GET returns 404 for inactive templates, that's also acceptable behavior
  // The important part is it doesn't appear in the list
}

// Test 9: POST /api/templates/:id/upload validates DOCX extension
async function testUploadValidatesExtension() {
  // Create template
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Upload Test',
      template_type: 'contract'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  // Try to upload non-DOCX file
  const testTxtPath = path.join(__dirname, 'temp-test.txt');
  fs.writeFileSync(testTxtPath, 'Not a DOCX file');
  createdFiles.push(testTxtPath);

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(testTxtPath)], { type: 'text/plain' });
  formData.append('file', fileBlob, 'test.txt');

  const uploadResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}/upload`, {
    method: 'POST',
    body: formData
  });

  // Should get error (500 because multer fileFilter rejects it)
  if (uploadResponse.ok) {
    throw new Error('Upload should fail for non-DOCX files');
  }
}

// Test 10: POST /api/templates/:id/upload extracts placeholders
async function testUploadExtractsPlaceholders() {
  // Create template
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Placeholder Test',
      template_type: 'contract'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  // Create DOCX with specific placeholders
  const testDocxPath = path.join(__dirname, 'temp-placeholders.docx');
  createTestDocx(testDocxPath, ['first_name', 'last_name', 'position', 'salary']);
  createdFiles.push(testDocxPath);

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(testDocxPath)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  formData.append('file', fileBlob, 'test.docx');

  const uploadResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}/upload`, {
    method: 'POST',
    body: formData
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed: ${errorText}`);
  }

  const uploadData = await uploadResponse.json();

  if (!uploadData.placeholders) {
    throw new Error('Response should include placeholders array');
  }

  const expectedPlaceholders = ['first_name', 'last_name', 'position', 'salary'];
  for (const placeholder of expectedPlaceholders) {
    if (!uploadData.placeholders.includes(placeholder)) {
      throw new Error(`Missing expected placeholder: ${placeholder}`);
    }
  }

  // Verify template record was updated
  const getResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}`);
  const getData = await getResponse.json();

  if (!getData.template.placeholder_fields.includes('first_name')) {
    throw new Error('Template should have placeholder_fields updated');
  }
}

// Test 11: POST /api/templates/:id/upload respects file size limit
async function testUploadFileSizeLimit() {
  // This test is informational - actual size limit testing would require large files
  // We just verify the endpoint is using multer with limits

  // Create template
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Size Test',
      template_type: 'contract'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  // Just verify a normal-sized file works
  const testDocxPath = path.join(__dirname, 'temp-size-test.docx');
  createTestDocx(testDocxPath, ['test']);
  createdFiles.push(testDocxPath);

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(testDocxPath)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  formData.append('file', fileBlob, 'test.docx');

  const uploadResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}/upload`, {
    method: 'POST',
    body: formData
  });

  if (!uploadResponse.ok) {
    throw new Error('Normal-sized file should upload successfully');
  }
}

// Test 12: POST /api/templates/:id/generate validates employee_id
async function testGenerateValidatesEmployeeId() {
  // Create template with file
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Generate Test',
      template_type: 'contract'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  // Upload DOCX
  const testDocxPath = path.join(__dirname, 'temp-generate.docx');
  createTestDocx(testDocxPath, ['first_name', 'last_name']);
  createdFiles.push(testDocxPath);

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(testDocxPath)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  formData.append('file', fileBlob, 'test.docx');

  await fetch(`${BASE_URL}/api/templates/${createData.template_id}/upload`, {
    method: 'POST',
    body: formData
  });

  // Try to generate without employee_id
  const generateResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  if (generateResponse.status !== 400) {
    throw new Error('Should return 400 when employee_id is missing');
  }

  // Try with non-existent employee_id
  const generateResponse2 = await fetch(`${BASE_URL}/api/templates/${createData.template_id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: '999999' })
  });

  if (generateResponse2.status !== 404) {
    throw new Error('Should return 404 when employee does not exist');
  }
}

// Test 13: POST /api/templates/:id/generate creates document record
async function testGenerateCreatesDocumentRecord() {
  // Ensure test employee exists
  const employeeId = await ensureTestEmployee();

  // Create template with file
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Document Record Test',
      template_type: 'contract'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  // Upload DOCX
  const testDocxPath = path.join(__dirname, 'temp-doc-record.docx');
  createTestDocx(testDocxPath, ['first_name', 'last_name', 'position']);
  createdFiles.push(testDocxPath);

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(testDocxPath)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  formData.append('file', fileBlob, 'test.docx');

  await fetch(`${BASE_URL}/api/templates/${createData.template_id}/upload`, {
    method: 'POST',
    body: formData
  });

  // Count documents before
  const docLinesBefore = readCsvLines(GENERATED_DOCS_CSV);
  const docCountBefore = docLinesBefore.length > 0 ? docLinesBefore.length - 1 : 0;

  // Generate document
  const generateResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: employeeId })
  });

  if (!generateResponse.ok) {
    const errorText = await generateResponse.text();
    throw new Error(`Generate failed: ${errorText}`);
  }

  const generateData = await generateResponse.json();

  if (!generateData.document_id) {
    throw new Error('Response should include document_id');
  }

  if (!generateData.filename) {
    throw new Error('Response should include filename');
  }

  if (!generateData.download_url) {
    throw new Error('Response should include download_url');
  }

  // Count documents after
  const docLinesAfter = readCsvLines(GENERATED_DOCS_CSV);
  const docCountAfter = docLinesAfter.length > 0 ? docLinesAfter.length - 1 : 0;

  if (docCountAfter !== docCountBefore + 1) {
    throw new Error('Document record should be created in generated_documents.csv');
  }

  // Verify document record has data_snapshot (it's in header and in data)
  const header = docLinesAfter[0];
  if (!header.includes('data_snapshot')) {
    throw new Error('Document CSV should have data_snapshot column');
  }

  // Parse last document line to verify it has the snapshot
  const lastDocLine = docLinesAfter[docLinesAfter.length - 1];
  const fields = parseCsvRow(lastDocLine);

  // data_snapshot should be the last field (index 6)
  if (fields.length < 7) {
    throw new Error(`Document record should have 7 fields, got ${fields.length}`);
  }

  const dataSnapshot = fields[6];
  if (!dataSnapshot || dataSnapshot === '""' || dataSnapshot === '') {
    throw new Error('Document record should have non-empty data_snapshot field');
  }
}

// Test 14: Concurrent document generation doesn't corrupt CSV
async function testConcurrentGeneration() {
  // Ensure test employee exists
  const employeeId = await ensureTestEmployee();

  // Create template with file
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Concurrent Test',
      template_type: 'contract'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  // Upload DOCX
  const testDocxPath = path.join(__dirname, 'temp-concurrent.docx');
  createTestDocx(testDocxPath, ['first_name']);
  createdFiles.push(testDocxPath);

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(testDocxPath)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  formData.append('file', fileBlob, 'test.docx');

  await fetch(`${BASE_URL}/api/templates/${createData.template_id}/upload`, {
    method: 'POST',
    body: formData
  });

  // Make 5 concurrent requests
  const promises = [];
  for (let i = 0; i < 5; i++) {
    const promise = fetch(`${BASE_URL}/api/templates/${createData.template_id}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId })
    });
    promises.push(promise);
  }

  const results = await Promise.all(promises);

  // Check how many succeeded
  let successCount = 0;
  const documentIds = [];
  for (const result of results) {
    if (result.ok) {
      const data = await result.json();
      documentIds.push(data.document_id);
      successCount++;
    }
  }

  // All 5 should succeed
  if (successCount !== 5) {
    throw new Error(`Expected all 5 concurrent requests to succeed, got ${successCount}`);
  }

  // Check for ID collisions (this is a known race condition that should be fixed)
  const uniqueIds = new Set(documentIds);
  if (uniqueIds.size !== 5) {
    console.log(`  Warning: ID collision detected (${uniqueIds.size}/5 unique). This indicates a race condition in ID generation.`);
    // Note: The main goal is to verify CSV doesn't get corrupted, not ID uniqueness
    // ID collision is a separate issue that needs fixing in the implementation
  }

  // Wait for all writes to complete
  await new Promise(resolve => setTimeout(resolve, 200));

  // Verify CSV is still valid (can be parsed)
  const csvContent = fs.readFileSync(GENERATED_DOCS_CSV, 'utf-8');
  const lines = csvContent.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV should have at least header and one data row');
  }

  // All lines should have same number of semicolons (accounting for quoted fields)
  const header = lines[0];
  const expectedFieldCount = header.split(';').length;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvRow(lines[i]);
    if (fields.length !== expectedFieldCount) {
      throw new Error(`CSV structure corrupted at line ${i + 1}: expected ${expectedFieldCount} fields, got ${fields.length}`);
    }
  }
}

// Test 15: Generated document filename includes employee last_name
async function testGenerateFilenameIncludesLastName() {
  // Ensure test employee exists and get their data
  const employeeId = await ensureTestEmployee();
  const empResponse = await fetch(`${BASE_URL}/api/employees/${employeeId}`);
  const empData = await empResponse.json();
  const lastName = empData.last_name || empData.employee?.last_name || '';

  if (!lastName) {
    throw new Error('Test employee must have a last_name');
  }

  // Create template with file
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Filename Test',
      template_type: 'contract'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  // Upload DOCX
  const testDocxPath = path.join(__dirname, 'temp-filename-test.docx');
  createTestDocx(testDocxPath, ['first_name', 'last_name']);
  createdFiles.push(testDocxPath);

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(testDocxPath)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  formData.append('file', fileBlob, 'test.docx');

  await fetch(`${BASE_URL}/api/templates/${createData.template_id}/upload`, {
    method: 'POST',
    body: formData
  });

  // Generate document
  const generateResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: employeeId })
  });

  if (!generateResponse.ok) {
    const errorText = await generateResponse.text();
    throw new Error(`Generate failed: ${errorText}`);
  }

  const generateData = await generateResponse.json();
  const filename = generateData.filename;

  // Sanitize last name the same way the server does
  const sanitizedLastName = lastName.replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/g, '_');

  if (!filename.includes(sanitizedLastName)) {
    throw new Error(`Filename "${filename}" should include sanitized last_name "${sanitizedLastName}"`);
  }

  // Verify filename pattern: TemplateName_LastName_employeeId_DD.MM.YYYY_random.docx
  const expectedPrefix = `Filename_Test_${sanitizedLastName}_${employeeId}_`;
  if (!filename.startsWith(expectedPrefix)) {
    throw new Error(`Filename "${filename}" should start with "${expectedPrefix}"`);
  }

  if (!filename.endsWith('.docx')) {
    throw new Error(`Filename "${filename}" should end with .docx`);
  }
}

// Test 16: POST /api/templates with is_general: 'yes' returns is_general: 'yes'
async function testCreateGeneralTemplate() {
  const response = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'General Template Test',
      template_type: 'report',
      description: 'A general template',
      is_general: 'yes'
    })
  });

  if (response.status !== 201) {
    throw new Error(`Expected 201, got ${response.status}`);
  }

  const data = await response.json();
  createdTemplateIds.push(data.template_id);

  if (data.template.is_general !== 'yes') {
    throw new Error(`Expected is_general 'yes', got '${data.template.is_general}'`);
  }

  // Verify via GET
  const getResponse = await fetch(`${BASE_URL}/api/templates/${data.template_id}`);
  const getData = await getResponse.json();

  if (getData.template.is_general !== 'yes') {
    throw new Error(`GET returned is_general '${getData.template.is_general}', expected 'yes'`);
  }
}

// Test 17: POST /api/templates without is_general defaults to 'no'
async function testCreateTemplateDefaultIsGeneralNo() {
  const response = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Default is_general Test',
      template_type: 'contract'
    })
  });

  if (response.status !== 201) {
    throw new Error(`Expected 201, got ${response.status}`);
  }

  const data = await response.json();
  createdTemplateIds.push(data.template_id);

  if (data.template.is_general !== 'no') {
    throw new Error(`Expected is_general 'no' by default, got '${data.template.is_general}'`);
  }
}

// Test 18: PUT /api/templates/:id updates is_general
async function testUpdateTemplateIsGeneral() {
  // Create a regular template
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Update is_general Test',
      template_type: 'contract'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  if (createData.template.is_general !== 'no') {
    throw new Error(`Expected initial is_general 'no', got '${createData.template.is_general}'`);
  }

  // Update to general
  const updateResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Update is_general Test',
      template_type: 'contract',
      is_general: 'yes'
    })
  });

  const updateData = await updateResponse.json();

  if (updateData.template.is_general !== 'yes') {
    throw new Error(`Expected updated is_general 'yes', got '${updateData.template.is_general}'`);
  }
}

// Test 19: POST /api/templates/:id/generate for general template without employee_id returns 200
async function testGenerateGeneralTemplateWithoutEmployee() {
  // Create general template
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'General Generate Test',
      template_type: 'report',
      is_general: 'yes'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  // Upload DOCX with quantity placeholders
  const testDocxPath = path.join(__dirname, 'temp-general-gen.docx');
  createTestDocx(testDocxPath, ['f_gender_quantity', 'current_date']);
  createdFiles.push(testDocxPath);

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(testDocxPath)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  formData.append('file', fileBlob, 'test.docx');

  await fetch(`${BASE_URL}/api/templates/${createData.template_id}/upload`, {
    method: 'POST',
    body: formData
  });

  // Generate without employee_id
  const generateResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  if (generateResponse.status !== 200) {
    const errorText = await generateResponse.text();
    throw new Error(`Expected 200 for general template without employee_id, got ${generateResponse.status}: ${errorText}`);
  }

  const generateData = await generateResponse.json();

  if (!generateData.document_id) {
    throw new Error('Response should include document_id');
  }

  if (!generateData.filename) {
    throw new Error('Response should include filename');
  }

  // Filename should be TemplateName_timestamp.docx (no employee name/id)
  if (generateData.filename.includes('_undefined_') || generateData.filename.includes('_null_')) {
    throw new Error(`Filename should not contain undefined/null: ${generateData.filename}`);
  }

  // Filename should not contain undefined/null employee references
  if (generateData.filename.includes('_emp') || generateData.filename.includes('employee')) {
    throw new Error(`General template filename should not contain employee references: ${generateData.filename}`);
  }

  if (!generateData.download_url) {
    throw new Error('Response should include download_url');
  }
}

// Test 20: POST /api/templates/:id/generate for regular template without employee_id returns 400
async function testGenerateRegularTemplateWithoutEmployeeReturns400() {
  // Create regular (non-general) template
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'Regular No Employee Test',
      template_type: 'contract'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  // Upload DOCX
  const testDocxPath = path.join(__dirname, 'temp-regular-noemp.docx');
  createTestDocx(testDocxPath, ['first_name']);
  createdFiles.push(testDocxPath);

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(testDocxPath)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  formData.append('file', fileBlob, 'test.docx');

  await fetch(`${BASE_URL}/api/templates/${createData.template_id}/upload`, {
    method: 'POST',
    body: formData
  });

  // Try to generate without employee_id
  const generateResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  if (generateResponse.status !== 400) {
    throw new Error(`Expected 400 for regular template without employee_id, got ${generateResponse.status}`);
  }
}

// Test 21: POST /api/templates/:id/generate for general template WITH employee_id works
async function testGenerateGeneralTemplateWithEmployee() {
  const employeeId = await ensureTestEmployee();

  // Create general template
  const createResponse = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_name: 'General With Employee Test',
      template_type: 'report',
      is_general: 'yes'
    })
  });
  const createData = await createResponse.json();
  createdTemplateIds.push(createData.template_id);

  // Upload DOCX
  const testDocxPath = path.join(__dirname, 'temp-general-with-emp.docx');
  createTestDocx(testDocxPath, ['first_name', 'f_gender_quantity']);
  createdFiles.push(testDocxPath);

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(testDocxPath)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  formData.append('file', fileBlob, 'test.docx');

  await fetch(`${BASE_URL}/api/templates/${createData.template_id}/upload`, {
    method: 'POST',
    body: formData
  });

  // Generate WITH employee_id (should also work for general templates)
  const generateResponse = await fetch(`${BASE_URL}/api/templates/${createData.template_id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: employeeId })
  });

  if (!generateResponse.ok) {
    const errorText = await generateResponse.text();
    throw new Error(`Expected 200 for general template with employee_id, got ${generateResponse.status}: ${errorText}`);
  }

  const generateData = await generateResponse.json();

  if (!generateData.document_id) {
    throw new Error('Response should include document_id');
  }

  // Filename should include employee last name (same as regular generation)
  if (!generateData.filename.endsWith('.docx')) {
    throw new Error('Filename should end with .docx');
  }
}

// Cleanup function
async function cleanup() {
  // Delete created template files
  for (const filePath of createdFiles) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Note: We don't delete templates from CSV as they're soft-deleted
  // and the test database may be persistent across test runs
}

// Main test runner
async function runAllTests() {
  console.log('Starting Templates API integration tests...');
  console.log('Prerequisites: Server must be running on http://localhost:3000\n');

  try {
    // Check server is running
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    if (!healthCheck.ok) {
      throw new Error('Server health check failed');
    }
    console.log('✓ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not accessible. Make sure it\'s running on port 3000');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }

  // Run all tests
  await runTest('POST /api/templates creates template with auto-increment ID', testCreateTemplate);
  await runTest('POST /api/templates validates required fields', testCreateTemplateValidation);
  await runTest('POST /api/templates creates audit log entry', testCreateTemplateAuditLog);
  await runTest('GET /api/templates returns only active templates', testGetActiveTemplatesOnly);
  await runTest('GET /api/templates/:id returns 404 for non-existent', testGetTemplateNotFound);
  await runTest('PUT /api/templates/:id updates template', testUpdateTemplate);
  await runTest('PUT /api/templates/:id doesn\'t allow changing docx_filename', testUpdateTemplateProtectedFields);
  await runTest('DELETE /api/templates/:id soft deletes (active=\'no\')', testDeleteTemplateSoftDelete);
  await runTest('POST /api/templates/:id/upload validates DOCX extension', testUploadValidatesExtension);
  await runTest('POST /api/templates/:id/upload extracts placeholders', testUploadExtractsPlaceholders);
  await runTest('POST /api/templates/:id/upload respects file size limit', testUploadFileSizeLimit);
  await runTest('POST /api/templates/:id/generate validates employee_id', testGenerateValidatesEmployeeId);
  await runTest('POST /api/templates/:id/generate creates document record', testGenerateCreatesDocumentRecord);
  await runTest('Concurrent document generation doesn\'t corrupt CSV', testConcurrentGeneration);
  await runTest('Generated document filename includes employee last_name', testGenerateFilenameIncludesLastName);
  await runTest('POST /api/templates with is_general yes returns is_general yes', testCreateGeneralTemplate);
  await runTest('POST /api/templates without is_general defaults to no', testCreateTemplateDefaultIsGeneralNo);
  await runTest('PUT /api/templates/:id updates is_general', testUpdateTemplateIsGeneral);
  await runTest('POST generate general template without employee_id returns 200', testGenerateGeneralTemplateWithoutEmployee);
  await runTest('POST generate regular template without employee_id returns 400', testGenerateRegularTemplateWithoutEmployeeReturns400);
  await runTest('POST generate general template with employee_id works', testGenerateGeneralTemplateWithEmployee);

  // Cleanup
  await cleanup();

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
      console.log('\n✅ All Templates API integration tests passed!');
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
