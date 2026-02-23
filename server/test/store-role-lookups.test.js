/**
 * Unit tests for role-based field lookups in store.js
 * Verifies that store functions use role-based resolution (field-utils.js)
 * instead of hardcoded field_name strings.
 *
 * Run with: node server/test/store-role-lookups.test.js
 */

import path from "path";
import fs from "fs/promises";
import {
  getDashboardStats,
  getDashboardEvents,
  getDocumentExpiryEvents,
  getDocumentOverdueEvents,
  getStatusReport,
  getBirthdayEvents,
  getRetirementEvents,
  DATA_DIR
} from "../src/store.js";
import { writeCsv } from "../src/csv.js";
import { resetEmployeeColumnsCache } from "../src/schema.js";

const EMPLOYEES_PATH = path.join(DATA_DIR, "employees.csv");
const EMPLOYEES_BACKUP = path.join(DATA_DIR, "employees.csv.role-lookup.bak");
const SCHEMA_PATH = path.join(DATA_DIR, "fields_schema.csv");
const SCHEMA_BACKUP = path.join(DATA_DIR, "fields_schema.csv.role-lookup.bak");

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    testsFailed++;
  }
}

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateInDays(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return localDateStr(d);
}

async function backupFile(src, dst) {
  try {
    await fs.access(src);
    await fs.copyFile(src, dst);
  } catch {
    // file may not exist
  }
}

async function restoreFile(src, dst) {
  try {
    await fs.access(src);
    await fs.copyFile(src, dst);
    await fs.unlink(src);
  } catch {
    try {
      await fs.unlink(dst);
    } catch {
      // OK
    }
  }
}

// Schema columns that the test uses
const SCHEMA_COLUMNS = [
  "field_id", "field_order", "field_name", "field_label", "field_type",
  "field_options", "show_in_table", "field_group", "editable_in_table", "role"
];

// Minimal employee columns (matching schema below)
const EMPLOYEE_COLUMNS = [
  "employee_id", "last_name", "first_name", "middle_name",
  "birth_date", "employment_status", "status_start_date", "status_end_date",
  "active",
  "personal_matter_file", "personal_matter_file_issue_date", "personal_matter_file_expiry_date"
];

// Minimal schema with roles assigned
function createTestSchema() {
  return [
    { field_id: "f_employee_id", field_order: "1", field_name: "employee_id", field_label: "ID", field_type: "text", field_options: "", show_in_table: "no", field_group: "Особисті дані", editable_in_table: "no", role: "EMPLOYEE_ID" },
    { field_id: "f_last_name", field_order: "2", field_name: "last_name", field_label: "Прізвище", field_type: "text", field_options: "", show_in_table: "yes", field_group: "Особисті дані", editable_in_table: "yes", role: "LAST_NAME" },
    { field_id: "f_first_name", field_order: "3", field_name: "first_name", field_label: "Ім'я", field_type: "text", field_options: "", show_in_table: "yes", field_group: "Особисті дані", editable_in_table: "yes", role: "FIRST_NAME" },
    { field_id: "f_middle_name", field_order: "4", field_name: "middle_name", field_label: "По батькові", field_type: "text", field_options: "", show_in_table: "yes", field_group: "Особисті дані", editable_in_table: "yes", role: "MIDDLE_NAME" },
    { field_id: "f_birth_date", field_order: "5", field_name: "birth_date", field_label: "Дата народження", field_type: "date", field_options: "", show_in_table: "no", field_group: "Особисті дані", editable_in_table: "no", role: "BIRTH_DATE" },
    { field_id: "f_employment_status", field_order: "6", field_name: "employment_status", field_label: "Статус роботи", field_type: "select", field_options: "Працює|Звільнений|Відпустка|Лікарняний|Відкомандирований", show_in_table: "yes", field_group: "Особисті дані", editable_in_table: "no", role: "STATUS" },
    { field_id: "f_status_start_date", field_order: "7", field_name: "status_start_date", field_label: "Дата початку", field_type: "date", field_options: "", show_in_table: "no", field_group: "Особисті дані", editable_in_table: "no", role: "STATUS_START" },
    { field_id: "f_status_end_date", field_order: "8", field_name: "status_end_date", field_label: "Дата закінчення", field_type: "date", field_options: "", show_in_table: "no", field_group: "Особисті дані", editable_in_table: "no", role: "STATUS_END" },
    { field_id: "f_personal_matter_file", field_order: "9", field_name: "personal_matter_file", field_label: "Особова справа", field_type: "file", field_options: "", show_in_table: "no", field_group: "Документи", editable_in_table: "no", role: "" },
  ];
}

async function writeTestSchema(schema) {
  await writeCsv(SCHEMA_PATH, SCHEMA_COLUMNS, schema);
}

async function writeTestEmployees(rows) {
  await writeCsv(EMPLOYEES_PATH, EMPLOYEE_COLUMNS, rows);
}

async function runAllTests() {
  console.log("Starting store role-based lookup tests...\n");

  await backupFile(EMPLOYEES_PATH, EMPLOYEES_BACKUP);
  await backupFile(SCHEMA_PATH, SCHEMA_BACKUP);

  try {
    // Reset schema cache before each test suite run
    resetEmployeeColumnsCache();

    // Write test schema with roles
    await writeTestSchema(createTestSchema());

    // ───────────────────────────────────────────────────────────────────────
    // getDashboardStats: uses STATUS role for employment_status lookup
    // ───────────────────────────────────────────────────────────────────────

    await runTest("getDashboardStats: counts employees by status using role-based lookup", async () => {
      resetEmployeeColumnsCache();
      await writeTestSchema(createTestSchema());
      await writeTestEmployees([
        { employee_id: "1", last_name: "Один", first_name: "Тест", middle_name: "", birth_date: "1990-01-01", employment_status: "Працює", status_start_date: "", status_end_date: "", active: "yes", personal_matter_file: "", personal_matter_file_issue_date: "", personal_matter_file_expiry_date: "" },
        { employee_id: "2", last_name: "Два", first_name: "Тест", middle_name: "", birth_date: "1990-02-02", employment_status: "Відпустка", status_start_date: "", status_end_date: "", active: "yes", personal_matter_file: "", personal_matter_file_issue_date: "", personal_matter_file_expiry_date: "" },
        { employee_id: "3", last_name: "Три", first_name: "Тест", middle_name: "", birth_date: "1990-03-03", employment_status: "Працює", status_start_date: "", status_end_date: "", active: "yes", personal_matter_file: "", personal_matter_file_issue_date: "", personal_matter_file_expiry_date: "" },
      ]);

      const stats = await getDashboardStats();
      if (stats.total !== 3) throw new Error(`Expected total=3, got ${stats.total}`);
      const pracuje = stats.statusCounts.find(s => s.label === "Працює");
      if (!pracuje || pracuje.count !== 2) throw new Error(`Expected Працює=2, got ${pracuje?.count}`);
      const vidpustka = stats.statusCounts.find(s => s.label === "Відпустка");
      if (!vidpustka || vidpustka.count !== 1) throw new Error(`Expected Відпустка=1, got ${vidpustka?.count}`);
    });

    // ───────────────────────────────────────────────────────────────────────
    // getDashboardEvents: uses role-based name and status field resolution
    // ───────────────────────────────────────────────────────────────────────

    await runTest("getDashboardEvents: builds name using role-based lookup", async () => {
      resetEmployeeColumnsCache();
      await writeTestSchema(createTestSchema());
      const today = localDateStr(new Date());
      await writeTestEmployees([
        { employee_id: "1", last_name: "Петренко", first_name: "Іван", middle_name: "Миколайович", birth_date: "1990-01-01", employment_status: "Лікарняний", status_start_date: today, status_end_date: "", active: "yes", personal_matter_file: "", personal_matter_file_issue_date: "", personal_matter_file_expiry_date: "" },
      ]);

      const events = await getDashboardEvents();
      const found = events.today.find(e => e.employee_id === "1");
      if (!found) throw new Error("Expected today event for employee 1");
      if (found.name !== "Петренко Іван Миколайович") throw new Error(`Expected name "Петренко Іван Миколайович", got "${found.name}"`);
      if (found.status_type !== "Лікарняний") throw new Error(`Expected status_type "Лікарняний", got "${found.status_type}"`);
    });

    await runTest("getDashboardEvents: uses role-based status date fields", async () => {
      resetEmployeeColumnsCache();
      await writeTestSchema(createTestSchema());
      const futureDate = dateInDays(10);
      await writeTestEmployees([
        { employee_id: "2", last_name: "Шевченко", first_name: "Тарас", middle_name: "", birth_date: "1990-06-06", employment_status: "Відпустка", status_start_date: futureDate, status_end_date: "", active: "yes", personal_matter_file: "", personal_matter_file_issue_date: "", personal_matter_file_expiry_date: "" },
      ]);

      const events = await getDashboardEvents();
      const found = events.thisWeek.find(e => e.employee_id === "2");
      if (!found) throw new Error("Expected week event for employee 2");
      if (found.date !== futureDate) throw new Error(`Expected date ${futureDate}, got ${found.date}`);
    });

    // ───────────────────────────────────────────────────────────────────────
    // getDocumentExpiryEvents: uses role-based name building
    // ───────────────────────────────────────────────────────────────────────

    await runTest("getDocumentExpiryEvents: builds name via buildEmployeeName", async () => {
      resetEmployeeColumnsCache();
      await writeTestSchema(createTestSchema());
      const futureDate = dateInDays(15);
      await writeTestEmployees([
        { employee_id: "1", last_name: "Коваль", first_name: "Марія", middle_name: "Олександрівна", birth_date: "1990-01-01", employment_status: "Працює", status_start_date: "", status_end_date: "", active: "yes", personal_matter_file: "doc.pdf", personal_matter_file_issue_date: "2020-01-01", personal_matter_file_expiry_date: futureDate },
      ]);

      const events = await getDocumentExpiryEvents();
      const found = events.thisWeek.find(e => e.employee_id === "1");
      if (!found) throw new Error("Expected expiring event for employee 1");
      if (found.name !== "Коваль Марія Олександрівна") throw new Error(`Expected name "Коваль Марія Олександрівна", got "${found.name}"`);
    });

    // ───────────────────────────────────────────────────────────────────────
    // getDocumentOverdueEvents: uses role-based name building
    // ───────────────────────────────────────────────────────────────────────

    await runTest("getDocumentOverdueEvents: builds name via buildEmployeeName", async () => {
      resetEmployeeColumnsCache();
      await writeTestSchema(createTestSchema());
      const pastDate = dateInDays(-5);
      await writeTestEmployees([
        { employee_id: "1", last_name: "Бондар", first_name: "Олег", middle_name: "", birth_date: "1990-01-01", employment_status: "Працює", status_start_date: "", status_end_date: "", active: "yes", personal_matter_file: "doc.pdf", personal_matter_file_issue_date: "2020-01-01", personal_matter_file_expiry_date: pastDate },
      ]);

      const events = await getDocumentOverdueEvents();
      const found = events.overdue.find(e => e.employee_id === "1");
      if (!found) throw new Error("Expected overdue event for employee 1");
      if (found.name !== "Бондар Олег") throw new Error(`Expected name "Бондар Олег", got "${found.name}"`);
    });

    // ───────────────────────────────────────────────────────────────────────
    // getStatusReport: uses role-based status and name field resolution
    // ───────────────────────────────────────────────────────────────────────

    await runTest("getStatusReport current: uses role-based status and date fields", async () => {
      resetEmployeeColumnsCache();
      await writeTestSchema(createTestSchema());
      const today = localDateStr(new Date());
      const futureDate = dateInDays(10);
      await writeTestEmployees([
        { employee_id: "1", last_name: "Тестовий", first_name: "Один", middle_name: "", birth_date: "1990-01-01", employment_status: "Лікарняний", status_start_date: today, status_end_date: futureDate, active: "yes", personal_matter_file: "", personal_matter_file_issue_date: "", personal_matter_file_expiry_date: "" },
        { employee_id: "2", last_name: "Тестовий", first_name: "Два", middle_name: "", birth_date: "1990-02-02", employment_status: "Працює", status_start_date: "", status_end_date: "", active: "yes", personal_matter_file: "", personal_matter_file_issue_date: "", personal_matter_file_expiry_date: "" },
      ]);

      const report = await getStatusReport('current');
      if (report.length !== 1) throw new Error(`Expected 1 result, got ${report.length}`);
      if (report[0].employee_id !== "1") throw new Error(`Expected employee 1, got ${report[0].employee_id}`);
      if (report[0].name !== "Тестовий Один") throw new Error(`Expected name "Тестовий Один", got "${report[0].name}"`);
      if (report[0].status_type !== "Лікарняний") throw new Error(`Expected status_type "Лікарняний", got "${report[0].status_type}"`);
    });

    // ───────────────────────────────────────────────────────────────────────
    // getBirthdayEvents: uses role-based birth_date and name resolution
    // ───────────────────────────────────────────────────────────────────────

    await runTest("getBirthdayEvents: uses role-based birth_date field", async () => {
      resetEmployeeColumnsCache();
      await writeTestSchema(createTestSchema());
      const bday15 = dateInDays(15);
      const birthDate = "1985-" + bday15.slice(5);
      await writeTestEmployees([
        { employee_id: "1", last_name: "Народжений", first_name: "Тест", middle_name: "Батькович", birth_date: birthDate, employment_status: "Працює", status_start_date: "", status_end_date: "", active: "yes", personal_matter_file: "", personal_matter_file_issue_date: "", personal_matter_file_expiry_date: "" },
      ]);

      const events = await getBirthdayEvents();
      const found = events.next30Days.find(e => e.employee_id === "1");
      if (!found) throw new Error("Expected birthday event for employee 1");
      if (found.employee_name !== "Народжений Тест Батькович") throw new Error(`Expected name "Народжений Тест Батькович", got "${found.employee_name}"`);
    });

    // ───────────────────────────────────────────────────────────────────────
    // getRetirementEvents: uses role-based birth_date and name resolution
    // ───────────────────────────────────────────────────────────────────────

    await runTest("getRetirementEvents: uses role-based birth_date field", async () => {
      resetEmployeeColumnsCache();
      await writeTestSchema(createTestSchema());
      const now = new Date();
      const currentYear = now.getFullYear();
      // Create employee turning 60 this month
      const dayInMonth = Math.min(now.getDate() + 5, 28); // 5 days from now, max 28
      const birthDate = `${currentYear - 60}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(dayInMonth).padStart(2, "0")}`;

      await writeTestEmployees([
        { employee_id: "1", last_name: "Пенсіонер", first_name: "Тест", middle_name: "", birth_date: birthDate, employment_status: "Працює", status_start_date: "", status_end_date: "", active: "yes", personal_matter_file: "", personal_matter_file_issue_date: "", personal_matter_file_expiry_date: "" },
      ]);

      const events = await getRetirementEvents(60);
      const allEvents = [...events.today, ...events.thisMonth];
      const found = allEvents.find(e => e.employee_id === "1");
      if (!found) throw new Error("Expected retirement event for employee 1");
      if (found.employee_name !== "Пенсіонер Тест") throw new Error(`Expected name "Пенсіонер Тест", got "${found.employee_name}"`);
      if (found.age !== 60) throw new Error(`Expected age 60, got ${found.age}`);
    });

  } finally {
    await restoreFile(EMPLOYEES_BACKUP, EMPLOYEES_PATH);
    await restoreFile(SCHEMA_BACKUP, SCHEMA_PATH);
    resetEmployeeColumnsCache();
  }

  console.log(`\nTests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  return testsFailed === 0;
}

runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
