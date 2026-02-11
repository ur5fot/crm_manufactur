/**
 * Migration script: Fix birth_date format from DD.MM.YYYY to YYYY-MM-DD
 *
 * This script:
 * 1. Reads employees.csv
 * 2. Finds all birth_date values in DD.MM.YYYY format
 * 3. Converts them to YYYY-MM-DD format
 * 4. Clears invalid dates that cannot be parsed
 * 5. Writes back to employees.csv with UTF-8 BOM
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.csv');

// CSV utilities
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].replace(/^\uFEFF/, '').split(';'); // Remove BOM
  const rows = lines.slice(1).map(line => {
    const values = line.split(';');
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });

  return { headers, rows };
}

function serializeCSV(headers, rows) {
  const headerLine = headers.join(';');
  const dataLines = rows.map(row =>
    headers.map(header => row[header] || '').join(';')
  );
  return '\uFEFF' + headerLine + '\n' + dataLines.join('\n') + '\n';
}

// Date conversion utilities
function isDateInDDMMYYYYFormat(dateStr) {
  // Check if date matches DD.MM.YYYY pattern
  return /^\d{2}\.\d{2}\.\d{4}$/.test(dateStr);
}

function convertDDMMYYYYtoYYYYMMDD(dateStr) {
  // Extract day, month, year from DD.MM.YYYY
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  // Validate ranges
  if (monthNum < 1 || monthNum > 12) return null;
  if (dayNum < 1 || dayNum > 31) return null;
  if (yearNum < 1900 || yearNum > 2100) return null;

  // Validate date by creating Date object
  const date = new Date(yearNum, monthNum - 1, dayNum);
  if (date.getFullYear() !== yearNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getDate() !== dayNum) {
    return null; // Invalid date (e.g., 30.02.2020)
  }

  // Return in YYYY-MM-DD format
  return `${year}-${month}-${day}`;
}

// Main migration function
function migrateBirthDates() {
  console.log('🔄 Starting birth_date format migration...');

  // Read employees.csv
  if (!fs.existsSync(EMPLOYEES_FILE)) {
    console.error('❌ employees.csv not found!');
    process.exit(1);
  }

  const content = fs.readFileSync(EMPLOYEES_FILE, 'utf-8');
  const { headers, rows } = parseCSV(content);

  // Check if birth_date column exists
  if (!headers.includes('birth_date')) {
    console.log('ℹ️  birth_date column not found, nothing to migrate');
    return;
  }

  let convertedCount = 0;
  let clearedCount = 0;
  let alreadyCorrectCount = 0;

  // Process each row
  rows.forEach((row, index) => {
    const birthDate = row.birth_date;

    if (!birthDate || birthDate.trim() === '') {
      // Empty - skip
      return;
    }

    if (isDateInDDMMYYYYFormat(birthDate)) {
      // Need to convert
      const converted = convertDDMMYYYYtoYYYYMMDD(birthDate);

      if (converted) {
        row.birth_date = converted;
        convertedCount++;
        console.log(`✓ Row ${index + 2}: "${birthDate}" → "${converted}"`);
      } else {
        // Invalid date - clear it
        row.birth_date = '';
        clearedCount++;
        console.warn(`⚠️  Row ${index + 2}: "${birthDate}" is invalid, cleared`);
      }
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      // Already in correct format
      alreadyCorrectCount++;
    } else {
      // Unknown format - clear it
      row.birth_date = '';
      clearedCount++;
      console.warn(`⚠️  Row ${index + 2}: "${birthDate}" has unknown format, cleared`);
    }
  });

  // Write back to CSV
  const newContent = serializeCSV(headers, rows);
  fs.writeFileSync(EMPLOYEES_FILE, newContent, 'utf-8');

  console.log('\n✅ Migration completed!');
  console.log(`   Converted: ${convertedCount} dates`);
  console.log(`   Cleared: ${clearedCount} invalid dates`);
  console.log(`   Already correct: ${alreadyCorrectCount} dates`);
}

// Run migration
try {
  migrateBirthDates();
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
