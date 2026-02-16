const { test, expect } = require('@playwright/test');
const { setupTestData, cleanupTestData, waitForEmployeesLoad } = require('../helpers/test-utils');

test.describe('Card Search', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestData();
    await page.goto('/cards');
    await waitForEmployeesLoad(page);
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should filter employee list by search term', async ({ page }) => {
    // Verify all 5 employees are visible initially
    const cards = page.locator('.employee-list .employee-card');
    await expect(cards).toHaveCount(5);

    // Search by last name
    const searchInput = page.locator('.card-search-wrapper .search-input');
    await searchInput.fill('Іванов');

    // Should show only Іванов
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Іванов');

    // Status bar should show filtered count
    const statusBar = page.locator('.panel .status-bar');
    await expect(statusBar).toContainText('1 з 5');
  });

  test('should search across all text fields', async ({ page }) => {
    const searchInput = page.locator('.card-search-wrapper .search-input');
    const cards = page.locator('.employee-list .employee-card');

    // Search by department
    await searchInput.fill('IT відділ');
    await expect(cards).toHaveCount(2); // Іванов and Мельник

    // Search by city
    await searchInput.fill('Львів');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Сидоренко');

    // Search by email
    await searchInput.fill('petrenko@test.com');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Петренко');

    // Search by specialty
    await searchInput.fill('Розробка');
    await expect(cards).toHaveCount(2); // Іванов and Мельник

    // Search by first_name
    await searchInput.fill('Олена');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Петренко');

    // Search by middle_name
    await searchInput.fill('Миколайович');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Іванов');

    // Search by employment_status
    await searchInput.fill('Відпустка');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Петренко');

    // Search by employment_status - partial match
    await searchInput.fill('Лікарняний');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Мельник');
  });

  test('should clear search with clear button', async ({ page }) => {
    const searchInput = page.locator('.card-search-wrapper .search-input');
    const cards = page.locator('.employee-list .employee-card');
    const clearButton = page.locator('.card-search-clear');

    // Clear button should not be visible initially
    await expect(clearButton).not.toBeVisible();

    // Type search term
    await searchInput.fill('Іванов');
    await expect(cards).toHaveCount(1);

    // Clear button should now be visible
    await expect(clearButton).toBeVisible();

    // Click clear button
    await clearButton.click();

    // Search should be cleared and all employees visible
    await expect(searchInput).toHaveValue('');
    await expect(cards).toHaveCount(5);
    await expect(clearButton).not.toBeVisible();
  });

  test('should show no results for non-matching search', async ({ page }) => {
    const searchInput = page.locator('.card-search-wrapper .search-input');
    const cards = page.locator('.employee-list .employee-card');

    await searchInput.fill('Неіснуючий');
    await expect(cards).toHaveCount(0);

    // Status bar should show 0 of total
    const statusBar = page.locator('.panel .status-bar');
    await expect(statusBar).toContainText('0 з 5');
  });

  test('should filter fields within employee card by field label', async ({ page }) => {
    // Select an employee
    const firstCard = page.locator('.employee-list .employee-card').first();
    await firstCard.click();

    // Wait for employee card to load
    await page.waitForSelector('.card-field-search-wrapper .search-input');

    // Get initial field count (all sections and fields visible)
    const initialSections = page.locator('.detail-grid .section');
    const initialSectionCount = await initialSections.count();
    await expect(initialSectionCount).toBeGreaterThan(0);

    // Search by field label (Ukrainian)
    const fieldSearchInput = page.locator('.card-field-search-wrapper .search-input');
    await fieldSearchInput.fill('пошта');

    // Should show only sections with matching field labels
    const filteredSections = page.locator('.detail-grid .section');
    const filteredSectionCount = await filteredSections.count();

    // Should have fewer sections after filtering
    expect(filteredSectionCount).toBeLessThan(initialSectionCount);

    // Check that email field is visible
    const emailField = page.locator('label:has-text("Ел. пошта")');
    await expect(emailField).toBeVisible();
  });

  test('should filter fields within employee card by field value', async ({ page }) => {
    // Select an employee
    const firstCard = page.locator('.employee-list .employee-card').first();
    await firstCard.click();

    await page.waitForSelector('.card-field-search-wrapper .search-input');

    // Search by field value (phone number)
    const fieldSearchInput = page.locator('.card-field-search-wrapper .search-input');
    await fieldSearchInput.fill('+38050');

    // Phone field should be visible (use for= selector to be specific)
    const phoneField = page.locator('label[for="phone"]');
    await expect(phoneField).toBeVisible();
  });

  test('should have field search input within employee card', async ({ page }) => {
    // Select an employee
    const firstCard = page.locator('.employee-list .employee-card').first();
    await firstCard.click();

    // Field search input should exist
    const fieldSearchInput = page.locator('.card-field-search-wrapper .search-input');
    await expect(fieldSearchInput).toBeVisible();

    // Should have correct placeholder
    await expect(fieldSearchInput).toHaveAttribute('placeholder', 'Пошук по полях картки...');

    // Should be able to type in it
    await fieldSearchInput.fill('test');
    await expect(fieldSearchInput).toHaveValue('test');

    // Should be able to clear it
    await fieldSearchInput.fill('');
    await expect(fieldSearchInput).toHaveValue('');
  });
});
