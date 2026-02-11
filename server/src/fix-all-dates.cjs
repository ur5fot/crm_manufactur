/**
 * Migration script: Fix ALL date formats from DD.MM.YYYY to YYYY-MM-DD
 *
 * This script:
 * 1. Reads employees.csv
 * 2. Finds ALL date fields: birth_date, status_start_date, status_end_date,
 *    and all document date fields (*_issue_date, *_expiry_date)
 * 3. Converts dates in DD.MM.YYYY format to YYYY-MM-DD format
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
function migrateAllDates() {
  console.log('🔄 Starting date format migration for ALL date fields...');

  // Read employees.csv
  if (!fs.existsSync(EMPLOYEES_FILE)) {
    console.error('❌ employees.csv not found!');
    process.exit(1);
  }

  const content = fs.readFileSync(EMPLOYEES_FILE, 'utf-8');
  const { headers, rows } = parseCSV(content);

  // Find all date columns: birth_date, status_*_date, *_issue_date, *_expiry_date
  const dateColumns = headers.filter(h =>
    h === 'birth_date' ||
    h === 'status_start_date' ||
    h === 'status_end_date' ||
    h.endsWith('_issue_date') ||
    h.endsWith('_expiry_date')
  );

  if (dateColumns.length === 0) {
    console.log('ℹ️  No date columns found, nothing to migrate');
    return;
  }

  console.log(`📅 Found ${dateColumns.length} date columns to process:`);
  console.log(`   ${dateColumns.join(', ')}\n`);

  let totalConverted = 0;
  let totalCleared = 0;
  let totalAlreadyCorrect = 0;
  let totalEmpty = 0;

  const changesLog = [];

  // Process each row
  rows.forEach((row, rowIndex) => {
    dateColumns.forEach(columnName => {
      const dateValue = row[columnName];

      if (!dateValue || dateValue.trim() === '') {
        totalEmpty++;
        return;
      }

      if (isDateInDDMMYYYYFormat(dateValue)) {
        // Need to convert
        const converted = convertDDMMYYYYtoYYYYMMDD(dateValue);

        if (converted) {
          row[columnName] = converted;
          totalConverted++;
          changesLog.push(`✓ Row ${rowIndex + 2}, ${columnName}: "${dateValue}" → "${converted}"`);
        } else {
          // Invalid date - clear it
          row[columnName] = '';
          totalCleared++;
          changesLog.push(`⚠️  Row ${rowIndex + 2}, ${columnName}: "${dateValue}" is invalid, cleared`);
        }
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        // Already in correct format
        totalAlreadyCorrect++;
      } else {
        // Unknown format - clear it
        row[columnName] = '';
        totalCleared++;
        changesLog.push(`⚠️  Row ${rowIndex + 2}, ${columnName}: "${dateValue}" has unknown format, cleared`);
      }
    });
  });

  // Write back to CSV
  const newContent = serializeCSV(headers, rows);
  fs.writeFileSync(EMPLOYEES_FILE, newContent, 'utf-8');

  console.log('\n✅ Migration completed!');
  console.log(`   Converted: ${totalConverted} dates`);
  console.log(`   Cleared: ${totalCleared} invalid dates`);
  console.log(`   Already correct: ${totalAlreadyCorrect} dates`);
  console.log(`   Empty fields: ${totalEmpty}\n`);

  if (changesLog.length > 0) {
    console.log('📝 Detailed changes:');
    changesLog.forEach(log => console.log('   ' + log));
  }
}

// Run migration
try {
  migrateAllDates();
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
