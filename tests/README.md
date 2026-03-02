# E2E Testing Documentation

## Overview

This directory contains end-to-end (E2E) tests for the CRM Manufactur application using [Playwright](https://playwright.dev/).

The test suite covers all major user flows:
- CRUD operations (Create, Read, Update, Delete employees)
- Document upload and management
- Table view with filters and sorting
- Custom reports with CSV export
- CSV import functionality
- Dashboard statistics and notifications
- Status changes and retirement notifications
- Audit logs

## Prerequisites

Before running tests, ensure the application servers are running:

```bash
# Start both backend (port 3000) and frontend (port 5173)
./run.sh
```

Tests expect:
- Backend API at `http://localhost:3000`
- Frontend UI at `http://localhost:5173`

## Running Tests

### Run all tests

```bash
npm run test:e2e
```

### Run specific test file

```bash
npm run test:e2e tests/e2e/employee-crud.spec.js
```

### Run tests in UI mode (interactive debugging)

```bash
npm run test:e2e:ui
```

This opens Playwright's UI mode where you can:
- See all tests in a visual tree
- Run tests individually
- Watch tests execute step-by-step
- Inspect DOM, network, console logs
- Time-travel through test execution

### Run tests in headed mode (browser visible)

```bash
npm run test:e2e:headed
```

Useful for watching tests execute in a real browser window.

### Run specific test by name

```bash
npx playwright test --grep "Создать нового сотрудника"
```

## Test Structure

### Test Files

- `tests/e2e/setup.spec.js` - Basic connectivity tests (server + client)
- `tests/e2e/employee-crud.spec.js` - Employee CRUD operations
- `tests/e2e/documents.spec.js` - Document upload, delete, folder opening
- `tests/e2e/table-filters.spec.js` - Table view, filters, search
- `tests/e2e/reports.spec.js` - Custom reports, filters, CSV export
- `tests/e2e/import.spec.js` - CSV import (valid/invalid data, template download)
- `tests/e2e/dashboard.spec.js` - Dashboard stats, timeline, notifications, auto-refresh
- `tests/e2e/status-retirement.spec.js` - Status changes, auto-restore, retirement
- `tests/e2e/logs.spec.js` - Audit logs viewing and search

### Fixtures

Test data files in `tests/fixtures/`:
- `test-data.csv` - Sample employee data (UTF-8 BOM, semicolon delimiter)
- `test-fields-schema.csv` - Copy of fields_schema.csv for reference
- `import-valid.csv` - Valid CSV for import testing
- `import-invalid.csv` - Invalid CSV to test error handling
- `test-passport.pdf` - Dummy PDF for document upload tests
- `test-photo.jpg` - Dummy image for document upload tests

### Helper Utilities

`tests/helpers/test-utils.js` provides:
- `setupTestData()` - Copies test CSV to data/employees.csv
- `cleanupTestData()` - Removes test files after tests
- `waitForEmployeesLoad()` - Waits for employee list to load in UI
- `createTestEmployee()` - Creates test employee via API

## Debugging Failed Tests

### 1. Check screenshots

Playwright automatically captures screenshots on failure:

```
test-results/
  employee-crud-Создать-нового-сотрудника/
    test-failed-1.png
```

### 2. View test traces

For detailed debugging with time-travel:

```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

This opens a viewer showing:
- Full test execution timeline
- DOM snapshots at each step
- Network requests
- Console logs
- Screenshots

### 3. Run test in debug mode

```bash
npx playwright test --debug tests/e2e/employee-crud.spec.js
```

Opens Playwright Inspector with step-through debugging.

### 4. Increase timeout for slow operations

If tests fail due to timeout, edit `playwright.config.js`:

```javascript
timeout: 60000, // 60 seconds
```

Or add timeout to specific test:

```javascript
test('slow operation', async ({ page }) => {
  test.setTimeout(60000);
  // ... test code
});
```

## Test Data Management

### How test data works

1. Tests use `setupTestData()` to copy `tests/fixtures/test-data.csv` → `data/employees.csv`
2. Each test operates on this isolated dataset
3. After tests complete, `cleanupTestData()` removes test files
4. Production data in `data/employees.csv` is never modified (protected by .gitignore)

### Modifying test data

Edit `tests/fixtures/test-data.csv` to add/change test employees.

Important: maintain UTF-8 BOM encoding and semicolon delimiter for compatibility.

## Writing New Tests

### Basic test template

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: navigate, create test data, etc.
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange: set up test state
    await page.click('button[data-testid="action"]');

    // Act: perform action
    await page.fill('input[name="field"]', 'value');
    await page.click('button[type="submit"]');

    // Assert: verify outcome
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

### Best practices

1. **Use data-testid attributes** for reliable selectors (where possible)
2. **Wait for visibility** before interacting: `await expect(locator).toBeVisible()`
3. **Verify via API** when testing data persistence: `const response = await page.request.get('/api/employees')`
4. **Clean up** test data in afterEach hooks
5. **Avoid hardcoded delays** - use Playwright's auto-waiting instead of `page.waitForTimeout()`

### API testing within E2E

Playwright supports API requests:

```javascript
test('API: create employee', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/employees', {
    data: { last_name: 'Test', first_name: 'User' }
  });

  expect(response.ok()).toBeTruthy();
  const employee = await response.json();
  expect(employee.employee_id).toBeDefined();
});
```

## Continuous Integration (CI)

### GitHub Actions

If `.github/workflows/tests.yml` exists, tests run automatically on:
- Push to main branch
- Pull requests
- Manual workflow dispatch

CI workflow:
1. Installs dependencies
2. Starts backend + frontend servers
3. Runs Playwright tests
4. Uploads test artifacts (screenshots, traces) on failure

### Running locally before push

Always run tests before committing:

```bash
npm run test:e2e
```

Ensure all tests pass to avoid breaking CI.

## Troubleshooting

### Tests fail with "page.goto: net::ERR_CONNECTION_REFUSED"

Servers are not running. Start them:

```bash
./run.sh
```

Verify:
- Backend responds: `curl http://localhost:3000/api/employees`
- Frontend loads: open `http://localhost:5173` in browser

### Tests fail intermittently (flaky tests)

Common causes:
1. **Race conditions**: Add explicit waits for elements
2. **Timing issues**: Use `await expect(locator).toBeVisible()` instead of `waitForTimeout()`
3. **Shared state**: Ensure tests don't depend on execution order

Fix: run test 3+ times to confirm stability:

```bash
for i in {1..3}; do npm run test:e2e; done
```

### File upload tests fail

Ensure test files exist:
- `tests/fixtures/test-passport.pdf`
- `tests/fixtures/test-photo.jpg`

Create dummy files if missing:

```bash
echo "dummy pdf content" > tests/fixtures/test-passport.pdf
convert -size 100x100 xc:blue tests/fixtures/test-photo.jpg
```

### CSV encoding issues

All CSV files MUST use UTF-8 with BOM encoding and semicolon delimiter.

Verify with:

```bash
file tests/fixtures/test-data.csv
# Output should show: UTF-8 Unicode (with BOM) text
```

Fix encoding:

```bash
# Add BOM to CSV
printf '\xEF\xBB\xBF' | cat - tests/fixtures/test-data.csv > temp && mv temp tests/fixtures/test-data.csv
```

## Configuration

### playwright.config.js

Key settings:
- `baseURL: 'http://localhost:5173'` - Frontend URL
- `timeout: 30000` - Default timeout (30s)
- `workers: 1` - Run tests sequentially (avoid data conflicts)
- `retries: 0` - No retries (fix flaky tests instead)
- `testDir: './tests/e2e'` - Test directory

### Environment variables

Not currently used, but can be added:

```javascript
// playwright.config.js
use: {
  baseURL: process.env.BASE_URL || 'http://localhost:5173',
}
```

Run with custom URL:

```bash
BASE_URL=http://localhost:8080 npm run test:e2e
```

## Test Coverage

Current coverage includes:

- ✅ Employee CRUD (create, read, update, delete)
- ✅ Document upload with dates (issue_date, expiry_date)
- ✅ Document deletion
- ✅ Table view with multi-select filters
- ✅ Table row double-click to open card in new tab
- ✅ Search functionality
- ✅ Custom reports with multiple filters
- ✅ CSV export (UTF-8 BOM, selected columns)
- ✅ CSV import (valid/invalid data, template download)
- ✅ Dashboard statistics by status
- ✅ Dashboard stat card expansion (accordion)
- ✅ Document expiry notifications
- ✅ Birthday notifications
- ✅ Retirement notifications with auto-dismiss
- ✅ Status changes with date ranges
- ✅ Auto-restore status after end_date
- ✅ Audit logs (CREATE, UPDATE, DELETE)
- ✅ Audit log search

## Further Reading

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Testing](https://playwright.dev/docs/api-testing)
