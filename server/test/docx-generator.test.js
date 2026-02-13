/**
 * Unit tests for DOCX Generator module
 * Run with: node server/test/docx-generator.test.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractPlaceholders, generateDocx } from '../src/docx-generator.js';
import PizZip from 'pizzip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test configuration
const TEST_TEMPLATE_PATH = path.resolve(__dirname, '../../files/templates/template_3_1770817926113.docx');
const TEST_OUTPUT_DIR = path.resolve(__dirname, '../../temp/test-output');
const TEST_FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

let testsPassed = 0;
let testsFailed = 0;

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

// Helper function to create a simple DOCX with placeholders
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
  fs.writeFileSync(filePath, buffer);
}

// Cleanup function
function cleanup() {
  // Remove test output directory
  if (fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  }

  // Remove test fixtures
  if (fs.existsSync(TEST_FIXTURES_DIR)) {
    fs.rmSync(TEST_FIXTURES_DIR, { recursive: true, force: true });
  }
}

// Setup test environment
function setup() {
  cleanup();
  fs.mkdirSync(TEST_FIXTURES_DIR, { recursive: true });
}

// Test 1: extractPlaceholders() returns correct placeholder list
async function testExtractPlaceholdersSuccess() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-placeholders.docx');
  createTestDocx(testPath, ['first_name', 'last_name', 'position', 'first_name']); // first_name twice

  const placeholders = await extractPlaceholders(testPath);

  if (!Array.isArray(placeholders)) {
    throw new Error('Expected array of placeholders');
  }

  // Should return unique, sorted placeholders
  const expected = ['first_name', 'last_name', 'position'];
  if (JSON.stringify(placeholders) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(placeholders)}`);
  }
}

// Test 2: extractPlaceholders() with template without placeholders
async function testExtractPlaceholdersEmpty() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-no-placeholders.docx');
  createTestDocx(testPath, []); // No placeholders

  const placeholders = await extractPlaceholders(testPath);

  if (!Array.isArray(placeholders)) {
    throw new Error('Expected array of placeholders');
  }

  if (placeholders.length !== 0) {
    throw new Error(`Expected empty array, got ${JSON.stringify(placeholders)}`);
  }
}

// Test 3: extractPlaceholders() throws error for non-existent file
async function testExtractPlaceholdersNonExistent() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'does-not-exist.docx');

  try {
    await extractPlaceholders(testPath);
    throw new Error('Should have thrown error for non-existent file');
  } catch (error) {
    if (!error.message.includes('Template file not found')) {
      throw new Error(`Expected "Template file not found" error, got: ${error.message}`);
    }
  }
}

// Test 4: extractPlaceholders() throws error for invalid DOCX
async function testExtractPlaceholdersInvalid() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'invalid.docx');
  fs.writeFileSync(testPath, 'This is not a valid DOCX file');

  try {
    await extractPlaceholders(testPath);
    throw new Error('Should have thrown error for invalid DOCX');
  } catch (error) {
    if (!error.message.includes('Placeholder extraction failed')) {
      throw new Error(`Expected "Placeholder extraction failed" error, got: ${error.message}`);
    }
  }
}

// Test 5: generateDocx() creates valid DOCX file
async function testGenerateDocxSuccess() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-generate.docx');
  createTestDocx(testPath, ['name', 'position']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'output.docx');
  const data = { name: 'John Doe', position: 'Manager' };

  await generateDocx(testPath, data, outputPath);

  // Verify file was created
  if (!fs.existsSync(outputPath)) {
    throw new Error('Output file was not created');
  }

  // Verify it's a valid DOCX
  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  if (!documentXml) {
    throw new Error('Invalid DOCX structure');
  }
}

// Test 6: generateDocx() replaces placeholders correctly
async function testGenerateDocxReplacements() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-replacements.docx');
  createTestDocx(testPath, ['first_name', 'last_name', 'age']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'replacements.docx');
  const data = { first_name: 'Jane', last_name: 'Smith', age: 30 };

  await generateDocx(testPath, data, outputPath);

  // Read generated file and verify replacements
  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  if (!documentXml.includes('Jane')) {
    throw new Error('Placeholder {first_name} was not replaced');
  }
  if (!documentXml.includes('Smith')) {
    throw new Error('Placeholder {last_name} was not replaced');
  }
  if (!documentXml.includes('30')) {
    throw new Error('Placeholder {age} was not replaced');
  }

  // Verify placeholders are gone
  if (documentXml.includes('{first_name}') || documentXml.includes('{last_name}')) {
    throw new Error('Placeholders were not properly replaced');
  }
}

// Test 7: generateDocx() handles null/undefined values as empty string
async function testGenerateDocxNullHandling() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-null.docx');
  createTestDocx(testPath, ['name', 'phone', 'email']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'null-handling.docx');
  const data = { name: 'John', phone: null, email: undefined };

  await generateDocx(testPath, data, outputPath);

  // Read generated file
  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  // Verify name is present
  if (!documentXml.includes('John')) {
    throw new Error('Name was not replaced');
  }

  // Verify null/undefined became empty strings (placeholders should be gone but no "null" or "undefined" text)
  if (documentXml.includes('null') || documentXml.includes('undefined')) {
    throw new Error('Null/undefined values should become empty strings, not literal "null" or "undefined"');
  }
}

// Test 8: generateDocx() adds current_date placeholder
async function testGenerateDocxCurrentDate() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-date.docx');
  createTestDocx(testPath, ['current_date']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'date.docx');
  await generateDocx(testPath, {}, outputPath);

  // Read generated file
  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  // Verify date format DD.MM.YYYY is present
  const dateRegex = /\d{2}\.\d{2}\.\d{4}/;
  if (!dateRegex.test(documentXml)) {
    throw new Error('current_date placeholder was not replaced with DD.MM.YYYY format');
  }

  // Verify it's today's date
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const expectedDate = `${day}.${month}.${year}`;

  if (!documentXml.includes(expectedDate)) {
    throw new Error(`Expected today's date ${expectedDate} in document`);
  }
}

// Test 9: generateDocx() adds current_datetime placeholder
async function testGenerateDocxCurrentDatetime() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-datetime.docx');
  createTestDocx(testPath, ['current_datetime']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'datetime.docx');
  await generateDocx(testPath, {}, outputPath);

  // Read generated file
  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  // Verify datetime format DD.MM.YYYY HH:MM is present
  const datetimeRegex = /\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/;
  if (!datetimeRegex.test(documentXml)) {
    throw new Error('current_datetime placeholder was not replaced with DD.MM.YYYY HH:MM format');
  }
}

// Test 10: generateDocx() throws error for non-existent template
async function testGenerateDocxNonExistent() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'does-not-exist.docx');
  const outputPath = path.join(TEST_OUTPUT_DIR, 'output.docx');

  try {
    await generateDocx(testPath, {}, outputPath);
    throw new Error('Should have thrown error for non-existent template');
  } catch (error) {
    if (!error.message.includes('Template file not found')) {
      throw new Error(`Expected "Template file not found" error, got: ${error.message}`);
    }
  }
}

// Test 11: generateDocx() creates output directory if missing
async function testGenerateDocxCreateDir() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-create-dir.docx');
  createTestDocx(testPath, ['test']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'subdir', 'nested', 'output.docx');

  await generateDocx(testPath, { test: 'value' }, outputPath);

  // Verify directory was created
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    throw new Error('Output directory was not created');
  }

  // Verify file was created
  if (!fs.existsSync(outputPath)) {
    throw new Error('Output file was not created in nested directory');
  }
}

// Helper function to create a DOCX with placeholders split across XML runs
// Simulates what Word does when it splits {placeholder} into separate <w:t> elements
function createSplitRunDocx(filePath) {
  const zip = new PizZip();

  // Placeholder {full_name} split across 3 runs: "{" + "full_name" + "}"
  // Placeholder {birth_date} split across 2 runs: "{birth_" + "date}"
  // Placeholder {position} in a single run (normal)
  let documentContent = '<?xml version="1.0" encoding="UTF-8"?>';
  documentContent += '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">';
  documentContent += '<w:body>';
  // Split {full_name} across 3 runs
  documentContent += '<w:p>';
  documentContent += '<w:r><w:t>{</w:t></w:r>';
  documentContent += '<w:r><w:t>full_name</w:t></w:r>';
  documentContent += '<w:r><w:t>}</w:t></w:r>';
  documentContent += '</w:p>';
  // Split {birth_date} across 2 runs
  documentContent += '<w:p>';
  documentContent += '<w:r><w:t>{birth_</w:t></w:r>';
  documentContent += '<w:r><w:t>date}</w:t></w:r>';
  documentContent += '</w:p>';
  // Normal single-run {position}
  documentContent += '<w:p><w:r><w:t>{position}</w:t></w:r></w:p>';
  documentContent += '</w:body></w:document>';

  zip.folder('word').file('document.xml', documentContent);

  const contentTypes = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>';
  zip.file('[Content_Types].xml', contentTypes);

  const rels = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';
  zip.folder('_rels').file('.rels', rels);

  const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(filePath, buffer);
}

// Test 12: extractPlaceholders() finds placeholders split across XML runs
async function testExtractPlaceholdersSplitRuns() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-split-runs.docx');
  createSplitRunDocx(testPath);

  const placeholders = await extractPlaceholders(testPath);

  if (!Array.isArray(placeholders)) {
    throw new Error('Expected array of placeholders');
  }

  const expected = ['birth_date', 'full_name', 'position'];
  if (JSON.stringify(placeholders) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(placeholders)}`);
  }
}

// Test 13: generateDocx() adds _upper and _cap case variants for placeholders
async function testGenerateDocxCaseVariants() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-case-variants.docx');
  createTestDocx(testPath, ['first_name', 'first_name_upper', 'first_name_cap', 'last_name_upper']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'case-variants.docx');
  const data = { first_name: 'іван', last_name: 'петренко' };

  await generateDocx(testPath, data, outputPath);

  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  // Verify _upper variant (all uppercase)
  if (!documentXml.includes('ІВАН')) {
    throw new Error('first_name_upper should produce ІВАН');
  }

  // Verify _cap variant (first letter uppercase)
  if (!documentXml.includes('Іван')) {
    throw new Error('first_name_cap should produce Іван');
  }

  // Verify last_name_upper
  if (!documentXml.includes('ПЕТРЕНКО')) {
    throw new Error('last_name_upper should produce ПЕТРЕНКО');
  }

  // Verify original value is also present
  if (!documentXml.includes('іван')) {
    throw new Error('Original first_name value should still be present');
  }
}

// Test 14: generateDocx() does not generate _upper/_cap for empty values
async function testGenerateDocxCaseVariantsEmpty() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-case-empty.docx');
  createTestDocx(testPath, ['name', 'name_upper', 'name_cap']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'case-empty.docx');
  const data = { name: '' };

  await generateDocx(testPath, data, outputPath);

  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  // Placeholders should be replaced with empty strings (no literal text remaining)
  if (documentXml.includes('{name_upper}') || documentXml.includes('{name_cap}')) {
    throw new Error('Empty value _upper/_cap placeholders should still be replaced (with empty string)');
  }

  // Must not contain literal "undefined" text (docxtemplater renders "undefined" for missing keys)
  if (documentXml.includes('>undefined<')) {
    throw new Error('Empty _upper/_cap should not produce literal "undefined" text in document');
  }
}

// Main test runner
async function runAllTests() {
  console.log('Starting DOCX Generator unit tests...\n');

  setup();

  // Run all tests
  await runTest('extractPlaceholders() returns correct placeholder list', testExtractPlaceholdersSuccess);
  await runTest('extractPlaceholders() with template without placeholders', testExtractPlaceholdersEmpty);
  await runTest('extractPlaceholders() throws error for non-existent file', testExtractPlaceholdersNonExistent);
  await runTest('extractPlaceholders() throws error for invalid DOCX', testExtractPlaceholdersInvalid);
  await runTest('generateDocx() creates valid DOCX file', testGenerateDocxSuccess);
  await runTest('generateDocx() replaces placeholders correctly', testGenerateDocxReplacements);
  await runTest('generateDocx() handles null/undefined values as empty string', testGenerateDocxNullHandling);
  await runTest('generateDocx() adds current_date placeholder', testGenerateDocxCurrentDate);
  await runTest('generateDocx() adds current_datetime placeholder', testGenerateDocxCurrentDatetime);
  await runTest('generateDocx() throws error for non-existent template', testGenerateDocxNonExistent);
  await runTest('generateDocx() creates output directory if missing', testGenerateDocxCreateDir);
  await runTest('extractPlaceholders() finds placeholders split across XML runs', testExtractPlaceholdersSplitRuns);
  await runTest('generateDocx() adds _upper and _cap case variants', testGenerateDocxCaseVariants);
  await runTest('generateDocx() handles _upper/_cap for empty values', testGenerateDocxCaseVariantsEmpty);

  // Cleanup
  cleanup();

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log('='.repeat(50));

  return testsFailed === 0;
}

// Run tests
runAllTests()
  .then(success => {
    if (success) {
      console.log('\n✅ All DOCX generator tests passed!');
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
