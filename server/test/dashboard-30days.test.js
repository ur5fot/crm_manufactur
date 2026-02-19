/**
 * Unit tests for 30-day window in dashboard event functions
 * Tests that getDashboardEvents, getDocumentExpiryEvents, and getBirthdayEvents
 * include events 25 days away (which old 7-day window would have missed).
 *
 * Run with: node server/test/dashboard-30days.test.js
 */

import path from "path";
import fs from "fs/promises";
import {
  getDashboardEvents,
  getDocumentExpiryEvents,
  getBirthdayEvents,
  DATA_DIR
} from "../src/store.js";
import { writeCsv } from "../src/csv.js";

const EMPLOYEES_PATH = path.join(DATA_DIR, "employees.csv");
const EMPLOYEES_BACKUP = path.join(DATA_DIR, "employees.csv.dashboard30days.bak");

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

async function backupEmployees() {
  try {
    await fs.access(EMPLOYEES_PATH);
    await fs.copyFile(EMPLOYEES_PATH, EMPLOYEES_BACKUP);
  } catch {
    // file may not exist yet
  }
}

async function restoreEmployees() {
  try {
    await fs.access(EMPLOYEES_BACKUP);
    await fs.copyFile(EMPLOYEES_BACKUP, EMPLOYEES_PATH);
    await fs.unlink(EMPLOYEES_BACKUP);
  } catch {
    try {
      await fs.unlink(EMPLOYEES_PATH);
    } catch {
      // OK
    }
  }
}

// Minimal columns needed for the tests (must include all fields the functions read)
const EMPLOYEE_COLUMNS = [
  "employee_id", "last_name", "first_name", "middle_name",
  "birth_date", "employment_status", "status_start_date", "status_end_date",
  "active",
  "personal_matter_file", "personal_matter_file_issue_date", "personal_matter_file_expiry_date"
];

async function writeTestEmployees(rows) {
  await writeCsv(EMPLOYEES_PATH, EMPLOYEE_COLUMNS, rows);
}

async function runAllTests() {
  console.log("Starting 30-day window tests...\n");

  await backupEmployees();

  try {
    // ───────────────────────────────────────────────────────────────────────
    // getDashboardEvents: event 25 days from now should be in weekEvents
    // ───────────────────────────────────────────────────────────────────────

    await runTest("getDashboardEvents: status_start 25 days away is included in weekEvents", async () => {
      const date25 = dateInDays(25);
      await writeTestEmployees([
        {
          employee_id: "1",
          last_name: "Тест",
          first_name: "Користувач",
          middle_name: "",
          birth_date: "1990-01-01",
          employment_status: "На лікарняному",
          status_start_date: date25,
          status_end_date: "",
          active: "yes",
          personal_matter_file: "",
          personal_matter_file_issue_date: "",
          personal_matter_file_expiry_date: ""
        }
      ]);
      const events = await getDashboardEvents();
      const found = events.thisWeek.some(e => e.date === date25 && e.type === "status_start");
      if (!found) {
        throw new Error(`Expected status_start event on ${date25} in thisWeek, got: ${JSON.stringify(events.thisWeek)}`);
      }
    });

    await runTest("getDashboardEvents: status_end 25 days away is included in weekEvents", async () => {
      const date25 = dateInDays(25);
      await writeTestEmployees([
        {
          employee_id: "2",
          last_name: "Тест",
          first_name: "Два",
          middle_name: "",
          birth_date: "1990-02-02",
          employment_status: "У відпустці",
          status_start_date: dateInDays(0),
          status_end_date: date25,
          active: "yes",
          personal_matter_file: "",
          personal_matter_file_issue_date: "",
          personal_matter_file_expiry_date: ""
        }
      ]);
      const events = await getDashboardEvents();
      const found = events.thisWeek.some(e => e.date === date25 && e.type === "status_end");
      if (!found) {
        throw new Error(`Expected status_end event on ${date25} in thisWeek`);
      }
    });

    await runTest("getDashboardEvents: event 8 days away is included (would miss in 7-day window)", async () => {
      const date8 = dateInDays(8);
      await writeTestEmployees([
        {
          employee_id: "3",
          last_name: "Вісім",
          first_name: "Днів",
          middle_name: "",
          birth_date: "1990-03-03",
          employment_status: "На лікарняному",
          status_start_date: date8,
          status_end_date: "",
          active: "yes",
          personal_matter_file: "",
          personal_matter_file_issue_date: "",
          personal_matter_file_expiry_date: ""
        }
      ]);
      const events = await getDashboardEvents();
      const found = events.thisWeek.some(e => e.date === date8);
      if (!found) {
        throw new Error(`Expected event on ${date8} (8 days out) to be included in 30-day window`);
      }
    });

    // ───────────────────────────────────────────────────────────────────────
    // getDocumentExpiryEvents: document expiring 25 days from now
    // ───────────────────────────────────────────────────────────────────────

    await runTest("getDocumentExpiryEvents: document expiring 25 days away is in weekEvents", async () => {
      const date25 = dateInDays(25);
      await writeTestEmployees([
        {
          employee_id: "4",
          last_name: "Документ",
          first_name: "Двадять",
          middle_name: "",
          birth_date: "1990-04-04",
          employment_status: "Працює",
          status_start_date: "",
          status_end_date: "",
          active: "yes",
          personal_matter_file: "some_file.pdf",
          personal_matter_file_issue_date: "2020-01-01",
          personal_matter_file_expiry_date: date25
        }
      ]);
      const events = await getDocumentExpiryEvents();
      const found = events.thisWeek.some(e => e.expiry_date === date25 && e.type === "expiring_soon");
      if (!found) {
        throw new Error(`Expected expiring_soon event with expiry ${date25}, got thisWeek: ${JSON.stringify(events.thisWeek)}`);
      }
    });

    await runTest("getDocumentExpiryEvents: document expiring 8 days away is included (would miss in 7-day window)", async () => {
      const date8 = dateInDays(8);
      await writeTestEmployees([
        {
          employee_id: "5",
          last_name: "Документ",
          first_name: "Вісім",
          middle_name: "",
          birth_date: "1990-05-05",
          employment_status: "Працює",
          status_start_date: "",
          status_end_date: "",
          active: "yes",
          personal_matter_file: "other_file.pdf",
          personal_matter_file_issue_date: "2020-01-01",
          personal_matter_file_expiry_date: date8
        }
      ]);
      const events = await getDocumentExpiryEvents();
      const found = events.thisWeek.some(e => e.expiry_date === date8);
      if (!found) {
        throw new Error(`Expected event on ${date8} (8 days out) to be included in 30-day window`);
      }
    });

    // ───────────────────────────────────────────────────────────────────────
    // getBirthdayEvents: birthday 25 days from now in next30Days
    // ───────────────────────────────────────────────────────────────────────

    await runTest("getBirthdayEvents: birthday 25 days away is in next30Days", async () => {
      const bday25 = dateInDays(25);
      // Use a birth year far in the past so age calculation is unambiguous
      const birthDate = "1985-" + bday25.slice(5); // same month-day, year 1985
      await writeTestEmployees([
        {
          employee_id: "6",
          last_name: "Народження",
          first_name: "ДвадятьПять",
          middle_name: "",
          birth_date: birthDate,
          employment_status: "Працює",
          status_start_date: "",
          status_end_date: "",
          active: "yes",
          personal_matter_file: "",
          personal_matter_file_issue_date: "",
          personal_matter_file_expiry_date: ""
        }
      ]);
      const events = await getBirthdayEvents();
      if (!Array.isArray(events.next30Days)) {
        throw new Error("getBirthdayEvents should return next30Days array");
      }
      const found = events.next30Days.some(e => e.current_year_birthday === bday25);
      if (!found) {
        throw new Error(`Expected birthday on ${bday25} in next30Days, got: ${JSON.stringify(events.next30Days)}`);
      }
    });

    await runTest("getBirthdayEvents: birthday 8 days away is in next30Days (would miss in 7-day window)", async () => {
      const bday8 = dateInDays(8);
      const birthDate = "1990-" + bday8.slice(5);
      await writeTestEmployees([
        {
          employee_id: "7",
          last_name: "Народження",
          first_name: "Вісімка",
          middle_name: "",
          birth_date: birthDate,
          employment_status: "Працює",
          status_start_date: "",
          status_end_date: "",
          active: "yes",
          personal_matter_file: "",
          personal_matter_file_issue_date: "",
          personal_matter_file_expiry_date: ""
        }
      ]);
      const events = await getBirthdayEvents();
      if (!Array.isArray(events.next30Days)) {
        throw new Error("getBirthdayEvents should return next30Days array");
      }
      const found = events.next30Days.some(e => e.current_year_birthday === bday8);
      if (!found) {
        throw new Error(`Expected birthday on ${bday8} (8 days out) in next30Days`);
      }
    });

    await runTest("getBirthdayEvents: no 'next7Days' field in return value (renamed to next30Days)", async () => {
      await writeTestEmployees([]);
      const events = await getBirthdayEvents();
      if ("next7Days" in events) {
        throw new Error("getBirthdayEvents should NOT return next7Days anymore");
      }
      if (!("next30Days" in events)) {
        throw new Error("getBirthdayEvents should return next30Days");
      }
    });

  } finally {
    await restoreEmployees();
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
