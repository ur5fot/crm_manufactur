/**
 * Unit tests for DOCX Generator module
 * Run with: node server/test/docx-generator.test.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractPlaceholders, generateDocx } from '../src/docx-generator.js';
import { buildQuantityPlaceholders } from '../src/quantity-placeholders.js';
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

  const result = await extractPlaceholders(testPath);

  if (!result.placeholders || !Array.isArray(result.placeholders)) {
    throw new Error('Expected object with placeholders array');
  }

  // Should return unique, sorted placeholders
  const expected = ['first_name', 'last_name', 'position'];
  if (JSON.stringify(result.placeholders) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result.placeholders)}`);
  }

  // Without schema, unknown should be empty
  if (!Array.isArray(result.unknown) || result.unknown.length !== 0) {
    throw new Error('Expected empty unknown array when no schema provided');
  }
}

// Test 2: extractPlaceholders() with template without placeholders
async function testExtractPlaceholdersEmpty() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-no-placeholders.docx');
  createTestDocx(testPath, []); // No placeholders

  const result = await extractPlaceholders(testPath);

  if (!result.placeholders || !Array.isArray(result.placeholders)) {
    throw new Error('Expected object with placeholders array');
  }

  if (result.placeholders.length !== 0) {
    throw new Error(`Expected empty array, got ${JSON.stringify(result.placeholders)}`);
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

// Test 9b: generateDocx() adds current_date_iso placeholder in YYYY-MM-DD format
async function testGenerateDocxCurrentDateIso() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-date-iso.docx');
  createTestDocx(testPath, ['current_date_iso']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'date-iso.docx');
  await generateDocx(testPath, {}, outputPath);

  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  // Verify date format YYYY-MM-DD is present
  const dateRegex = /\d{4}-\d{2}-\d{2}/;
  if (!dateRegex.test(documentXml)) {
    throw new Error('current_date_iso placeholder was not replaced with YYYY-MM-DD format');
  }

  // Verify it's today's date
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const expectedDate = `${year}-${month}-${day}`;

  if (!documentXml.includes(expectedDate)) {
    throw new Error(`Expected today's ISO date ${expectedDate} in document`);
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

  const { placeholders } = await extractPlaceholders(testPath);

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

// Test schema for field_id tests
const TEST_SCHEMA = [
  { field_id: 'f_employee_id', field_name: 'employee_id', field_label: 'ID', field_type: 'text', role: 'EMPLOYEE_ID' },
  { field_id: 'f_last_name', field_name: 'last_name', field_label: 'Прізвище', field_type: 'text', role: 'LAST_NAME' },
  { field_id: 'f_first_name', field_name: 'first_name', field_label: "Ім'я", field_type: 'text', role: 'FIRST_NAME' },
  { field_id: 'f_middle_name', field_name: 'middle_name', field_label: 'По батькові', field_type: 'text', role: 'MIDDLE_NAME' },
  { field_id: 'f_birth_date', field_name: 'birth_date', field_label: 'Дата народження', field_type: 'date', role: 'BIRTH_DATE' },
  { field_id: 'f_gender', field_name: 'gender', field_label: 'Стать', field_type: 'select', role: 'GENDER' },
  { field_id: 'f_photo', field_name: 'photo', field_label: 'Фото', field_type: 'photo', role: 'PHOTO' },
  { field_id: 'f_grade', field_name: 'grade', field_label: 'Посада', field_type: 'text', role: 'GRADE' },
  { field_id: 'f_position', field_name: 'position', field_label: 'Звання', field_type: 'text', role: 'POSITION' },
  { field_id: 'f_indeclinable_name', field_name: 'indeclinable_name', field_label: '', field_type: 'checkbox', role: 'INDECL_NAME' },
  { field_id: 'f_indeclinable_first_name', field_name: 'indeclinable_first_name', field_label: '', field_type: 'checkbox', role: 'INDECL_FIRST' },
  { field_id: 'f_indeclinable_grade', field_name: 'indeclinable_grade', field_label: '', field_type: 'checkbox', role: 'INDECL_GRADE' },
  { field_id: 'f_indeclinable_position', field_name: 'indeclinable_position', field_label: '', field_type: 'checkbox', role: 'INDECL_POSITION' },
  { field_id: 'f_department', field_name: 'department', field_label: 'Підрозділ', field_type: 'text', role: '' },
];

// Test 15: generateDocx() with schema generates both field_id and field_name placeholders
async function testGenerateDocxFieldIdKeys() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-field-id.docx');
  // Template uses both field_id and field_name placeholders
  createTestDocx(testPath, ['f_last_name', 'last_name', 'f_birth_date', 'department']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'field-id.docx');
  const data = {
    last_name: 'Петренко',
    first_name: 'Іван',
    middle_name: 'Миколайович',
    birth_date: '1990-05-15',
    department: 'ІТ',
    gender: 'Чоловіча',
    photo: '/some/path.jpg' // should be skipped
  };

  await generateDocx(testPath, data, outputPath, TEST_SCHEMA);

  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  // Both field_id and field_name placeholders should be replaced with the same value
  if (documentXml.includes('{f_last_name}') || documentXml.includes('{last_name}')) {
    throw new Error('Placeholders should have been replaced');
  }

  // Value should appear (replacing both placeholders)
  const count = (documentXml.match(/Петренко/g) || []).length;
  if (count < 2) {
    throw new Error(`Expected "Петренко" to appear at least 2 times (for both f_last_name and last_name), got ${count}`);
  }

  // Birth date should work via field_id
  if (!documentXml.includes('1990-05-15')) {
    throw new Error('f_birth_date placeholder was not replaced');
  }

  // Photo should not appear in the document
  if (documentXml.includes('/some/path.jpg')) {
    throw new Error('Photo field should have been skipped');
  }
}

// Test 16: generateDocx() without schema works as before (backwards compat)
async function testGenerateDocxWithoutSchema() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-no-schema.docx');
  createTestDocx(testPath, ['last_name', 'first_name']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'no-schema.docx');
  const data = { last_name: 'Шевченко', first_name: 'Тарас', photo: 'skip.jpg' };

  // Call without schema parameter
  await generateDocx(testPath, data, outputPath);

  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  if (!documentXml.includes('Шевченко') || !documentXml.includes('Тарас')) {
    throw new Error('Legacy placeholders should still work without schema');
  }

  if (documentXml.includes('skip.jpg')) {
    throw new Error('Photo field should be skipped even without schema');
  }
}

// Test 17: generateDocx() with schema generates field_id-based declension keys
async function testGenerateDocxFieldIdDeclension() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-field-id-declension.docx');
  // Template uses field_id-based declension placeholders
  createTestDocx(testPath, ['f_last_name_genitive', 'last_name_genitive', 'f_full_name_dative', 'full_name_dative']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'field-id-declension.docx');
  const data = {
    last_name: 'Петренко',
    first_name: 'Іван',
    middle_name: 'Миколайович',
    gender: 'Чоловіча'
  };

  await generateDocx(testPath, data, outputPath, TEST_SCHEMA);

  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  // Both field_id and field_name declension placeholders should be replaced
  if (documentXml.includes('{f_last_name_genitive}') || documentXml.includes('{last_name_genitive}')) {
    throw new Error('Declension placeholders should have been replaced');
  }

  // Declined value should appear at least twice (field_id and field_name versions)
  // Петренка is genitive of Петренко
  if (!documentXml.includes('Петренка')) {
    throw new Error('Expected genitive form "Петренка" in document');
  }

  // Full name dative should also be present
  if (documentXml.includes('{f_full_name_dative}') || documentXml.includes('{full_name_dative}')) {
    throw new Error('Full name dative placeholders should have been replaced');
  }
}

// Test 18: generateDocx() with schema generates field_id-based case variants
async function testGenerateDocxFieldIdCaseVariants() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-field-id-case.docx');
  createTestDocx(testPath, ['f_last_name_upper', 'last_name_upper', 'f_department_cap']);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'field-id-case.docx');
  const data = { last_name: 'петренко', department: 'інформаційний відділ' };

  await generateDocx(testPath, data, outputPath, TEST_SCHEMA);

  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  // field_id _upper should work
  if (!documentXml.includes('ПЕТРЕНКО')) {
    throw new Error('f_last_name_upper should produce ПЕТРЕНКО');
  }

  // field_id _cap should work
  if (!documentXml.includes('Інформаційний відділ')) {
    throw new Error('f_department_cap should produce capitalized value');
  }
}

// Test 19: extractPlaceholders() with schema returns validation info
async function testExtractPlaceholdersWithSchema() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-validate-placeholders.docx');
  createTestDocx(testPath, ['f_last_name', 'last_name', 'unknown_field', 'current_date', 'f_birth_date_upper']);

  const result = await extractPlaceholders(testPath, TEST_SCHEMA);

  // With schema, should return object with placeholders and unknown arrays
  if (!result.placeholders || !result.unknown) {
    throw new Error('Expected { placeholders, unknown } object when schema provided');
  }

  // All placeholders should be in the list
  if (result.placeholders.length !== 5) {
    throw new Error(`Expected 5 placeholders, got ${result.placeholders.length}: ${JSON.stringify(result.placeholders)}`);
  }

  // unknown_field should be flagged as unknown
  if (!result.unknown.includes('unknown_field')) {
    throw new Error(`Expected "unknown_field" in unknown list, got: ${JSON.stringify(result.unknown)}`);
  }

  // Known fields should NOT be in unknown list
  if (result.unknown.includes('f_last_name') || result.unknown.includes('last_name') ||
      result.unknown.includes('current_date') || result.unknown.includes('f_birth_date_upper')) {
    throw new Error(`Known fields should not be in unknown list: ${JSON.stringify(result.unknown)}`);
  }
}

// Test 20: extractPlaceholders() without schema returns consistent object type
async function testExtractPlaceholdersWithoutSchemaConsistentType() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-no-schema-extract.docx');
  createTestDocx(testPath, ['name', 'position']);

  const result = await extractPlaceholders(testPath);

  // Without schema, should return same { placeholders, unknown } shape
  if (!result.placeholders || !Array.isArray(result.placeholders)) {
    throw new Error('Expected object with placeholders array');
  }
  if (!Array.isArray(result.unknown)) {
    throw new Error('Expected object with unknown array');
  }

  if (result.placeholders.length !== 2 || result.placeholders[0] !== 'name' || result.placeholders[1] !== 'position') {
    throw new Error(`Expected ['name', 'position'], got ${JSON.stringify(result.placeholders)}`);
  }
  if (result.unknown.length !== 0) {
    throw new Error('Expected empty unknown array when no schema provided');
  }
}

// Test 21: generateDocx() with quantity placeholders merged into data
async function testGenerateDocxWithQuantityPlaceholders() {
  const testPath = path.join(TEST_FIXTURES_DIR, 'test-quantity.docx');
  // Template uses quantity placeholders
  createTestDocx(testPath, [
    'f_gender_quantity', 'f_gender_option1_quantity', 'f_gender_option2_quantity',
    'last_name', 'f_last_name'
  ]);

  const outputPath = path.join(TEST_OUTPUT_DIR, 'quantity.docx');

  // Schema with a select field
  const quantitySchema = [
    { field_id: 'f_last_name', field_name: 'last_name', field_label: 'Прізвище', field_type: 'text', role: 'LAST_NAME' },
    { field_id: 'f_first_name', field_name: 'first_name', field_label: "Ім'я", field_type: 'text', role: 'FIRST_NAME' },
    { field_id: 'f_middle_name', field_name: 'middle_name', field_label: 'По батькові', field_type: 'text', role: 'MIDDLE_NAME' },
    { field_id: 'f_gender', field_name: 'gender', field_label: 'Стать', field_type: 'select', field_options: 'Чоловіча|Жіноча', role: 'GENDER' },
  ];

  // Simulate employees
  const employees = [
    { last_name: 'Петренко', gender: 'Чоловіча' },
    { last_name: 'Іваненко', gender: 'Чоловіча' },
    { last_name: 'Коваленко', gender: 'Жіноча' },
  ];

  // Build quantity placeholders (same as generate route does)
  const quantities = buildQuantityPlaceholders(quantitySchema, employees);

  // Merge: quantities first, then employee data (employee overrides on conflict)
  const employeeData = { last_name: 'Петренко', first_name: 'Іван', middle_name: 'Миколайович', gender: 'Чоловіча' };
  const data = { ...quantities, ...employeeData };

  await generateDocx(testPath, data, outputPath, quantitySchema);

  const content = fs.readFileSync(outputPath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml').asText();

  // Verify quantity placeholders were replaced with correct counts
  // f_gender_quantity = 3 (total employees)
  if (!documentXml.includes('>3<')) {
    throw new Error('f_gender_quantity should be replaced with "3"');
  }

  // f_gender_option1_quantity = 2 (Чоловіча)
  if (!documentXml.includes('>2<')) {
    throw new Error('f_gender_option1_quantity should be replaced with "2"');
  }

  // f_gender_option2_quantity = 1 (Жіноча)
  // Note: "1" might appear in other places, so we check that placeholder is gone
  if (documentXml.includes('{f_gender_option2_quantity}')) {
    throw new Error('f_gender_option2_quantity placeholder should have been replaced');
  }

  // Verify employee data still works alongside quantities
  if (!documentXml.includes('Петренко')) {
    throw new Error('Employee last_name should still be present');
  }

  // Verify no quantity placeholders remain unreplaced
  if (documentXml.includes('{f_gender_quantity}') || documentXml.includes('{f_gender_option1_quantity}')) {
    throw new Error('Quantity placeholders should all be replaced');
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
  await runTest('generateDocx() adds current_date_iso placeholder (YYYY-MM-DD)', testGenerateDocxCurrentDateIso);
  await runTest('generateDocx() throws error for non-existent template', testGenerateDocxNonExistent);
  await runTest('generateDocx() creates output directory if missing', testGenerateDocxCreateDir);
  await runTest('extractPlaceholders() finds placeholders split across XML runs', testExtractPlaceholdersSplitRuns);
  await runTest('generateDocx() adds _upper and _cap case variants', testGenerateDocxCaseVariants);
  await runTest('generateDocx() handles _upper/_cap for empty values', testGenerateDocxCaseVariantsEmpty);
  await runTest('generateDocx() with schema generates both field_id and field_name keys', testGenerateDocxFieldIdKeys);
  await runTest('generateDocx() without schema works as before (backwards compat)', testGenerateDocxWithoutSchema);
  await runTest('generateDocx() with schema generates field_id-based declension keys', testGenerateDocxFieldIdDeclension);
  await runTest('generateDocx() with schema generates field_id-based case variants', testGenerateDocxFieldIdCaseVariants);
  await runTest('extractPlaceholders() with schema returns validation info', testExtractPlaceholdersWithSchema);
  await runTest('extractPlaceholders() without schema returns consistent object type', testExtractPlaceholdersWithoutSchemaConsistentType);
  await runTest('generateDocx() with quantity placeholders merged into data', testGenerateDocxWithQuantityPlaceholders);

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
