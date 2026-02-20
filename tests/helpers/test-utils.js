const fs = require('fs');
const path = require('path');

// Paths
const TEST_DATA_PATH = path.join(__dirname, '../fixtures/test-data.csv');
const EMPLOYEES_CSV_PATH = path.join(__dirname, '../../data/employees.csv');
const EMPLOYEES_BACKUP_PATH = path.join(__dirname, '../../data/employees.backup.csv');
const STATUS_EVENTS_CSV_PATH = path.join(__dirname, '../../data/status_events.csv');
const STATUS_EVENTS_BACKUP_PATH = path.join(__dirname, '../../data/status_events.backup.csv');
const FILES_DIR = path.join(__dirname, '../../files');

// Empty status_events CSV (UTF-8 BOM + header row)
const EMPTY_STATUS_EVENTS = '\uFEFFevent_id;employee_id;status;start_date;end_date;created_at;active\n';

/**
 * Setup test data - backs up current employees.csv and replaces with test data.
 * Also clears status_events.csv to prevent stale events from interfering with tests.
 */
async function setupTestData() {
  // Backup current employees.csv if it exists
  if (fs.existsSync(EMPLOYEES_CSV_PATH)) {
    fs.copyFileSync(EMPLOYEES_CSV_PATH, EMPLOYEES_BACKUP_PATH);
  }

  // Copy test data to employees.csv
  fs.copyFileSync(TEST_DATA_PATH, EMPLOYEES_CSV_PATH);

  // Backup and clear status_events.csv to avoid stale events from previous tests
  if (fs.existsSync(STATUS_EVENTS_CSV_PATH)) {
    fs.copyFileSync(STATUS_EVENTS_CSV_PATH, STATUS_EVENTS_BACKUP_PATH);
  }
  fs.writeFileSync(STATUS_EVENTS_CSV_PATH, EMPTY_STATUS_EVENTS, 'utf8');

  // Clean up files directory (remove test employee folders)
  if (fs.existsSync(FILES_DIR)) {
    const entries = fs.readdirSync(FILES_DIR);
    for (const entry of entries) {
      const entryPath = path.join(FILES_DIR, entry);
      if (fs.statSync(entryPath).isDirectory() && entry.startsWith('employee_')) {
        fs.rmSync(entryPath, { recursive: true, force: true });
      }
    }
  }
}

/**
 * Cleanup test data - restores backed up employees.csv and status_events.csv
 */
async function cleanupTestData() {
  // Restore backed up employees.csv
  if (fs.existsSync(EMPLOYEES_BACKUP_PATH)) {
    fs.copyFileSync(EMPLOYEES_BACKUP_PATH, EMPLOYEES_CSV_PATH);
    fs.unlinkSync(EMPLOYEES_BACKUP_PATH);
  }

  // Restore backed up status_events.csv (or clear it if no backup)
  if (fs.existsSync(STATUS_EVENTS_BACKUP_PATH)) {
    fs.copyFileSync(STATUS_EVENTS_BACKUP_PATH, STATUS_EVENTS_CSV_PATH);
    fs.unlinkSync(STATUS_EVENTS_BACKUP_PATH);
  } else {
    // No backup means the file didn't exist before - clear any events added during the test
    fs.writeFileSync(STATUS_EVENTS_CSV_PATH, EMPTY_STATUS_EVENTS, 'utf8');
  }

  // Clean up test employee files
  if (fs.existsSync(FILES_DIR)) {
    const entries = fs.readdirSync(FILES_DIR);
    for (const entry of entries) {
      const entryPath = path.join(FILES_DIR, entry);
      if (fs.statSync(entryPath).isDirectory() && entry.startsWith('employee_')) {
        const employeeId = entry.replace('employee_', '');
        // Only clean up test employee IDs (1-5 from test-data.csv)
        if (['1', '2', '3', '4', '5'].includes(employeeId)) {
          fs.rmSync(entryPath, { recursive: true, force: true });
        }
      }
    }
  }
}

/**
 * Wait for employees to load in UI
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 */
async function waitForEmployeesLoad(page, timeout = 10000) {
  // Wait for UI to render employee list
  await page.waitForSelector('.employee-list', { timeout });

  // Wait a bit for any API calls to complete
  await page.waitForTimeout(1000);

  // Close any notification popups that might appear
  // Try multiple times as there can be multiple popups (birthday, vacation, documents, etc)
  for (let i = 0; i < 5; i++) {
    const closeButton = page.locator('.popup-overlay button:has-text("Зрозуміло"), .vacation-notification-overlay button:has-text("Зрозуміло")').first();
    if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(500);
    } else {
      break;
    }
  }
}

/**
 * Create a test employee via API
 * @param {Object} employeeData - Employee data object
 * @returns {Promise<Object>} Created employee object with ID
 */
async function createTestEmployee(employeeData) {
  const response = await fetch('http://localhost:3000/api/employees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(employeeData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create employee: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete employee via API
 * @param {string} employeeId - Employee ID to delete
 */
async function deleteTestEmployee(employeeId) {
  const response = await fetch(`http://localhost:3000/api/employees/${employeeId}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete employee: ${response.statusText}`);
  }
}

/**
 * Get all employees via API
 * @returns {Promise<Array>} Array of employee objects
 */
async function getEmployees() {
  const response = await fetch('http://localhost:3000/api/employees');

  if (!response.ok) {
    throw new Error(`Failed to get employees: ${response.statusText}`);
  }

  return response.json();
}

module.exports = {
  setupTestData,
  cleanupTestData,
  waitForEmployeesLoad,
  createTestEmployee,
  deleteTestEmployee,
  getEmployees,
};
